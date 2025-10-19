import { SpeechRecognitionBase, SpeechRecognitionConfig } from "./speech-recognition-base";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

export class SpeechRecognitionMicrosoft implements SpeechRecognitionBase {
    config: SpeechRecognitionConfig;
    private recognizer: SpeechSDK.SpeechRecognizer;
    isRecognizing: boolean = false;
    constructor(config: SpeechRecognitionConfig, onRecognizedCallback?: (text: string) => void) {
        this.config = config;
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(config.apiKey!, config.region!);
        speechConfig.speechRecognitionLanguage = "zh-CN";

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

        // Set event handlers
        this.recognizer.recognizing = (s, e) => {
            console.log(`[Microsoft] Speech recognizing: ${e.result.text}`);
        };

        this.recognizer.recognized = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                console.log(`[Microsoft] Speech recognition result: ${e.result.text}`);
                if (onRecognizedCallback && e.result.text.trim()) {
                    onRecognizedCallback(e.result.text);
                }
            } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
                console.log("[Microsoft] No speech content recognized");
            }
        };

        this.recognizer.canceled = (s, e) => {
            console.log(`[Microsoft] Speech recognition canceled: ${e.reason}`);
            if (e.reason === SpeechSDK.CancellationReason.Error) {
                console.error(`[Microsoft] Speech recognition error: ${e.errorDetails}`);
            }
            this.isRecognizing = false;
        };

        this.recognizer.sessionStopped = (s, e) => {
            console.log("[Microsoft] Speech recognition session stopped");
            this.isRecognizing = false;
        };
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
        if (!this.recognizer) {
            console.error("[Microsoft] Speech recognizer not initialized");
            this.isRecognizing = false;
            reject(new Error("[Microsoft] Speech recognizer not initialized"));
        }

        this.recognizer.startContinuousRecognitionAsync(
            () => {
                console.log("[Microsoft] Speech recognition started");
                resolve();
            },
            (error) => {
                console.error("[Microsoft] Failed to start speech recognition:", error);
                this.isRecognizing = false;
                reject(error);
            }
        );
    });
    }

    async stop(): Promise<void> {
     return new Promise((resolve, reject) => {
        if (!this.recognizer) {
            console.error("[Microsoft] Speech recognizer not initialized");
            reject(new Error("[Microsoft] Speech recognizer not initialized"));
          }

          this.recognizer.stopContinuousRecognitionAsync(
            () => {
              console.log("[Microsoft] Speech recognition stopped");
              this.isRecognizing = false;
              resolve();
            },
            (error) => {
              console.error("[Microsoft] Failed to stop speech recognition:", error);
              this.isRecognizing = false;
              reject(error);
            }
          );
        });
    }

    async cleanup(): Promise<void> {
        if (this.isRecognizing) {
            await this.stop();
        }
        this.recognizer.close();
    }
}