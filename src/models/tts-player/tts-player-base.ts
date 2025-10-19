// TTS provider type
export type TTSProvider = 'microsoft' | 'native';

// Configuration interface
export interface TTSConfig {
    provider: TTSProvider;
    // Microsoft TTS configuration
    apiKey?: string;
    region?: string;
    voiceName?: string;
    // Native TTS configuration
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    maxChunkLength?: number;
}

export interface SpeakResult {
    sentenceCompleted: boolean;
    sentence: string;
    id: string;
}

// Reading mode
export type SpeakMode = 'buffer' | 'direct';

export interface TTSError {
    message: string;
    code: number;
}

export interface TTSPlayerBase {
    config: TTSConfig;
    isPlaying: boolean;

    /**
     * Read text
     * @param text Text to read
     * @param mode Reading mode: 'buffer' buffer mode (streaming input), 'direct' direct mode (complete sentences)
     * @returns Promise resolves when the input text is actually read
     */
    speak(text: string, mode: SpeakMode): Promise<SpeakResult>;

    /**
     * Stop voice reading, clear buffer
     */
    stop(): void;

    /**
     * Pause voice reading, keep queue and buffer
     */
    pause(): void;

    /**
     * Resume voice reading
     */
    resume(): void;
}
