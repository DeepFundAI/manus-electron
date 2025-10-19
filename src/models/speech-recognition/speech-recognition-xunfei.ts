import { SpeechRecognitionBase, SpeechRecognitionConfig } from "./speech-recognition-base";

export class SpeechRecognitionXunfei implements SpeechRecognitionBase {
    config: SpeechRecognitionConfig;
    isRecognizing: boolean = false;
    private audioContext: AudioContext;
    private xfWebSocket: WebSocket;
    private onRecognizedCallback?: (text: string) => void;

    constructor(config: SpeechRecognitionConfig, onRecognizedCallback?: (text: string) => void) {
        this.config = config;
        this.onRecognizedCallback = onRecognizedCallback;
    }

    async start(): Promise<void> {
        try {
            // Get microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Initialize AudioContext
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);

            // Create ScriptProcessor (for getting audio data)
            const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(this.audioContext.destination);

            const wsUrl = await this.generateXunfeiWebSocketUrl(this.config);

            this.xfWebSocket = new WebSocket(wsUrl);

            this.xfWebSocket.onopen = () => {
                console.log("[Xunfei] WebSocket connection established");

                // Send first frame (contains configuration information)
                const firstFrame = {
                    common: {
                        app_id: this.config.appId
                    },
                    business: {
                        language: "zh_cn",
                        domain: "iat",
                        accent: "mandarin",
                        vad_eos: 30000,    // Silence detection time extended to 30 seconds
                        dwa: "wpgs"        // Dynamic correction
                    },
                    data: {
                        status: 0,
                        format: "audio/L16;rate=16000",
                        encoding: "raw",
                        audio: ""
                    }
                };

                this.xfWebSocket!.send(JSON.stringify(firstFrame));
            };

            this.xfWebSocket.onmessage = (event) => {
                this.handleXunfeiMessage(event.data);
            };

            this.xfWebSocket.onerror = (error) => {
                console.error("[Xunfei] WebSocket error:", error);
                // Don't immediately set isRecognizing = false, let user stop manually
            };

            this.xfWebSocket.onclose = (event) => {
                console.log(`[Xunfei] WebSocket connection closed, code: ${event.code}, reason: ${event.reason}`);
                // Only set to false when closed abnormally
                if (event.code !== 1000) {
                    console.warn("[Xunfei] WebSocket abnormal closure");
                    this.isRecognizing = false;
                }
            };

            // Process audio data
            let frameCount = 0;
            processor.onaudioprocess = (event) => {
                if (this.xfWebSocket && this.xfWebSocket.readyState === WebSocket.OPEN) {
                    const inputData = event.inputBuffer.getChannelData(0);

                    // Check if audio data is valid (not all silence)
                    let hasAudio = false;
                    for (let i = 0; i < inputData.length; i++) {
                        if (Math.abs(inputData[i]) > 0.01) {
                            hasAudio = true;
                            break;
                        }
                    }

                    // Send even if silent to keep connection active
                    const audioData = this.convertFloat32ToInt16(inputData);
                    const base64Audio = this.arrayBufferToBase64(audioData);

                    const audioFrame = {
                        data: {
                            status: 1,
                            format: "audio/L16;rate=16000",
                            encoding: "raw",
                            audio: base64Audio
                        }
                    };

                    try {
                        this.xfWebSocket.send(JSON.stringify(audioFrame));
                        frameCount++;

                        // Output debug info every 100 frames
                        if (frameCount % 100 === 0) {
                            console.log(`[Xunfei] Sent ${frameCount} audio frames, current status: ${hasAudio ? 'has sound' : 'silent'}`);
                        }
                    } catch (error) {
                        console.error("[Xunfei] Failed to send audio data:", error);
                    }
                }
            };

        } catch (error) {
            console.error("[Xunfei] Failed to start speech recognition:", error);
            this.isRecognizing = false;
        }
    }

    async stop(): Promise<void> {
        // Send end frame
        if (this.xfWebSocket && this.xfWebSocket.readyState === WebSocket.OPEN) {
            const endFrame = {
                data: {
                    status: 2,
                    format: "audio/L16;rate=16000",
                    encoding: "raw",
                    audio: ""
                }
            };
            this.xfWebSocket.send(JSON.stringify(endFrame));
        }

        // Close WebSocket
        if (this.xfWebSocket) {
            this.xfWebSocket.close();
        }

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
        }

        this.isRecognizing = false;
        console.log("[Xunfei] Speech recognition stopped");
    }

    async cleanup(): Promise<void> {
        if (this.isRecognizing) {
            await this.stop();
        }
        if (this.xfWebSocket) {
            this.xfWebSocket.close();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }


    // Xunfei speech recognition WebSocket URL generation
    async generateXunfeiWebSocketUrl(config: SpeechRecognitionConfig): Promise<string> {
        const { appId, apiSecret, xfApiKey } = config;

        // Generate timestamp
        const date = new Date().toUTCString();

        // Generate signature
        const host = "iat-api.xfyun.cn";
        const path = "/v2/iat";
        const algorithm = "hmac-sha256";

        const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;

        // Use Web Crypto API to generate HMAC-SHA256 signature
        const encoder = new TextEncoder();
        const keyData = encoder.encode(apiSecret!);
        const messageData = encoder.encode(signatureOrigin);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        const signature = btoa(String.fromCharCode(...Array.from(new Uint8Array(signatureBuffer))));

        // Generate authorization
        const authorization = `api_key="${xfApiKey}", algorithm="${algorithm}", headers="host date request-line", signature="${signature}"`;
        const authorizationBase64 = btoa(authorization);

        // Build URL
        const params = new URLSearchParams({
            authorization: authorizationBase64,
            date: date,
            host: host
        });

        return `wss://${host}${path}?${params.toString()}`;
    }


    // Process Xunfei WebSocket message
    handleXunfeiMessage(message: string) {
        try {
            const response = JSON.parse(message);

            if (response.code !== 0) {
                console.error("[Xunfei] Recognition error:", response.message);
                return;
            }

            if (response.data && response.data.result) {
                const results = response.data.result;
                let recognizedText = "";

                // Parse recognition results
                if (results.ws) {
                    for (const ws of results.ws) {
                        if (ws.cw) {
                            for (const cw of ws.cw) {
                                recognizedText += cw.w;
                            }
                        }
                    }
                }

                if (recognizedText) {
                    console.log(`[Xunfei] Speech recognition result: ${recognizedText}`);
                    if (this.onRecognizedCallback) {
                        this.onRecognizedCallback(recognizedText);
                    }
                }
            }

            // Note: Don't automatically stop when status=2, status=2 only means current speech segment ended
            // Let speech recognition continue running until user manually stops
            if (response.data && response.data.status === 2) {
                console.log("[Xunfei] Current speech segment recognition completed, continuing to listen...");
            }

        } catch (error) {
            console.error("[Xunfei] Failed to parse message:", error);
        }
    }

    // Convert Float32 array to Int16 array
    convertFloat32ToInt16(float32Array: Float32Array): ArrayBuffer {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            int16Array[i] = Math.max(-32768, Math.min(32767, Math.floor(float32Array[i] * 32768)));
        }
        return int16Array.buffer;
    }

    // ArrayBuffer to Base64
    arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

}