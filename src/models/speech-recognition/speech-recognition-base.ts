// Speech recognition provider type
export type SpeechProvider = 'microsoft' | 'xunfei' | 'vosk';

// Configuration interface
export interface SpeechRecognitionConfig {
    provider: SpeechProvider;
    apiKey?: string;
    region?: string;
    appId?: string;
    apiSecret?: string;
    xfApiKey?: string;
    modelType?: 'small-cn' | 'standard-cn';
}

export interface SpeechRecognitionError {
    message: string;
    code: number;
}

export interface SpeechRecognitionBase {
    config: SpeechRecognitionConfig;
    isRecognizing: boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    cleanup(): Promise<void>;
}