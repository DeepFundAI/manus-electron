import { SpeechRecognitionBase, SpeechRecognitionConfig } from "./speech-recognition-base";

// Model configuration
const MODEL_CONFIG = {
    'small-cn': '/models/vosk-model-small-cn-0.22.tar.gz',
    'standard-cn': '/models/vosk-model-cn-0.22.tar.gz'
} as const;

// Audio configuration
const AUDIO_CONFIG = {
    sampleRate: 16000, // Vosk recommended sample rate
    channelCount: 1,
    bufferSize: 4096
} as const;

export class SpeechRecognitionVosk implements SpeechRecognitionBase {
    config: SpeechRecognitionConfig;
    isRecognizing: boolean = false;
    private onRecognizedCallback?: (text: string) => void;
    private model: any;
    private recognizer: any;
    private audioContext: AudioContext;
    private scriptProcessor: ScriptProcessorNode;
    private mediaStream: MediaStream;

    constructor(config: SpeechRecognitionConfig, onRecognizedCallback?: (text: string) => void) {
        this.onRecognizedCallback = onRecognizedCallback;
        this.config = config;
        this.init();
    }

    async init(): Promise<void> {
        try {
            console.log('🎤 Initializing frontend offline speech recognition...');

            // 1. Load vosk-browser library
            const libraryLoaded = await this.loadVoskLibrary();
            if (!libraryLoaded) {
                console.error('❌ vosk-browser library loading failed');
                return;
            }

            // 2. Check browser support
            if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
                console.error('❌ Browser does not support AudioContext');
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('❌ Browser does not support getUserMedia');
                return;
            }

            // 3. Load model
            const modelPath = MODEL_CONFIG[this.config.modelType || 'small-cn'];
            console.log(`🎤 Loading speech model: ${modelPath}`);

            // Ensure Vosk is globally available
            const Vosk = (window as any).Vosk;
            if (!Vosk) {
                console.error('❌ Vosk object not available');
                return;
            }

            this.model = await Vosk.createModel(modelPath);

            if (!this.model) {
                console.error('❌ Speech model loading failed');
                return;
            }

            // Wait for model to fully load
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Model loading timeout'));
                }, 60000); // 60 second timeout

                this.model.on('load', (message: any) => {
                    clearTimeout(timeout);
                    if (message.result) {
                        console.log('✅ Speech model loaded successfully');
                        resolve();
                    } else {
                        console.error('❌ Speech model loading failed');
                        reject(new Error('Model loading failed'));
                    }
                });

                this.model.on('error', (message: any) => {
                    clearTimeout(timeout);
                    console.error('❌ Model loading error:', message.error);
                    reject(new Error(message.error));
                });

                // If model is already ready
                if (this.model.ready) {
                    clearTimeout(timeout);
                    console.log('✅ Speech model is ready');
                    resolve();
                }
            });

            // 4. Create recognizer (need to pass sample rate parameter)
            console.log('🎤 Creating recognizer...');
            try {
                // vosk-browser KaldiRecognizer constructor requires sample rate parameter
                console.log('🎤 Using sample rate:', AUDIO_CONFIG.sampleRate);
                this.recognizer = new this.model.KaldiRecognizer(AUDIO_CONFIG.sampleRate);
                console.log('✅ Recognizer created successfully, ID:', this.recognizer.id);
            } catch (error) {
                console.error('❌ Failed to create recognizer:', error);
                console.error('❌ Error details:', error);
                return;
            }

            if (!this.recognizer) {
                console.error('❌ Recognizer creation failed - object is null');
                return;
            }

            // Set recognition result callback
            try {
                this.recognizer.on('result', (message: any) => {
                    console.log('🎤 Received recognition result event:', message);
                    const text = message.result?.text;
                    if (text && text.trim()) {
                        console.log('🎤 Speech recognition result:', text);
                        if (this.onRecognizedCallback) {
                            this.onRecognizedCallback(text.trim());
                        }
                    }
                });

                this.recognizer.on('partialresult', (message: any) => {
                    const partial = message.result?.partial;
                    if (partial && partial.trim()) {
                        console.log('🎤 Partial recognition result:', partial);
                    }
                });

                console.log('✅ Recognizer callback setup successful');
            } catch (error) {
                console.error('❌ Failed to set recognizer callback:', error);
                return;
            }

            console.log('✅ Frontend offline speech recognition initialized successfully');
            return;

        } catch (error) {
            console.error('❌ Frontend offline speech recognition initialization failed:', error);
            return;
        }
    }

    async start(): Promise<void> {
        try {
            console.log('🎤 Checking speech recognition status...');
            console.log('🎤 Model:', !!this.model, 'Recognizer:', !!this.recognizer);

            if (!this.model || !this.recognizer) {
                console.error('❌ Speech recognition not initialized - Model:', !!this.model, 'Recognizer:', !!this.recognizer);
                return;
            }

            if (this.isRecognizing) {
                console.warn('⚠️ Speech recognition already running');
                return;
            }

            console.log('🎤 Starting speech recognition...');
            console.log('🎤 Recognizer ID:', this.recognizer.id);

            // Get microphone permission
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: AUDIO_CONFIG.channelCount,
                    sampleRate: AUDIO_CONFIG.sampleRate
                }
            });

            // Create audio context (ensure sample rate matches recognizer)
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: AUDIO_CONFIG.sampleRate
            });

            console.log('🎤 Audio context sample rate:', this.audioContext.sampleRate);
            console.log('🎤 Configured sample rate:', AUDIO_CONFIG.sampleRate);

            // Create audio source
            const source = this.audioContext.createMediaStreamSource(mediaStream);

            // Create script processor node
            this.scriptProcessor = this.audioContext.createScriptProcessor(
                AUDIO_CONFIG.bufferSize,
                AUDIO_CONFIG.channelCount,
                AUDIO_CONFIG.channelCount
            );

            console.log('🎤 Script processor buffer size:', AUDIO_CONFIG.bufferSize);

            // Process audio data
            this.scriptProcessor.onaudioprocess = (event) => {
                if (!this.recognizer) {
                    console.warn('⚠️ Recognizer not available');
                    return;
                }

                if (!this.isRecognizing) {
                    return;
                }

                try {
                    // Check recognizer status
                    if (!this.recognizer.id) {
                        console.error('❌ Recognizer ID invalid');
                        return;
                    }

                    const inputBuffer = event.inputBuffer;
                    if (!inputBuffer) {
                        console.warn('⚠️ Input buffer is empty');
                        return;
                    }

                    this.recognizer.acceptWaveform(inputBuffer);
                } catch (error) {
                    console.error('❌ acceptWaveform failed:', error);
                    console.error('❌ Recognizer status:', {
                        id: this.recognizer?.id,
                        isRecognizing: this.isRecognizing,
                        bufferLength: event.inputBuffer?.length
                    });
                }
            };

            // Connect audio nodes
            source.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.audioContext.destination);

            this.isRecognizing = true;
            console.log('✅ Speech recognition started');
            return;

        } catch (error) {
            console.error('❌ Failed to start speech recognition:', error);

            // Check if it's a permission issue
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    console.error('❌ Microphone permission denied');
                } else if (error.name === 'NotFoundError') {
                    console.error('❌ No microphone device found');
                }
            }

            return;
        }
    }

    async stop(): Promise<void> {
        try {
            console.log('🎤 Stopping speech recognition...');

            this.isRecognizing = false;

            // Disconnect audio nodes
            if (this.scriptProcessor) {
                this.scriptProcessor.disconnect();
            }

            // Stop media stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
            }

            // Close audio context
            if (this.audioContext && this.audioContext.state !== 'closed') {
                this.audioContext.close();
            }

            console.log('✅ Speech recognition stopped');
        } catch (error) {
            console.error('❌ Failed to stop speech recognition:', error);
        }
    }
    async cleanup(): Promise<void> {
        try {
            console.log('🎤 Cleaning up speech recognition resources...');

            if (this.isRecognizing) {
                this.stop();
            }

            // Clean up recognizer
            if (this.recognizer) {
                try {
                    this.recognizer.remove();
                } catch (error) {
                    console.warn('Error cleaning up recognizer:', error);
                }
                this.recognizer = null;
            }

            // Clean up model
            if (this.model) {
                try {
                    this.model.terminate();
                } catch (error) {
                    console.warn('Error cleaning up model:', error);
                }
                this.model = null;
            }
            console.log('✅ Speech recognition resources cleaned up');
        } catch (error) {
            console.error('❌ Failed to clean up speech recognition resources:', error);
        }
    }

    /**
 * Load vosk-browser library
 * @returns Promise<boolean> Whether loading was successful
 */
    async loadVoskLibrary(): Promise<boolean> {
        try {
            // If already loaded, return directly
            if (typeof window !== 'undefined' && (window as any).Vosk) {
                return true;
            }

            // Dynamically load vosk-browser
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js';

            const loadPromise = new Promise<boolean>((resolve) => {
                script.onload = () => {
                    console.log('✅ vosk-browser library loaded successfully');
                    resolve(true);
                };
                script.onerror = () => {
                    console.error('❌ vosk-browser library loading failed');
                    resolve(false);
                };
            });

            document.head.appendChild(script);
            return await loadPromise;
        } catch (error) {
            console.error('❌ Failed to load vosk-browser library:', error);
            return false;
        }
    }
}