import { uuidv4 } from "@jarvis-agent/core";
import { TTSPlayerBase, TTSConfig, SpeakMode, SpeakResult } from "./tts-player-base";

interface PendingSpeak {
    text: string;
    resolve: (value: SpeakResult) => void;
    reject: (error: any) => void;
    id: string;
}

export class TTSPlayerNative implements TTSPlayerBase {
    config: TTSConfig;
    isPlaying: boolean = false;
    
    // Speech synthesis state
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private utteranceQueue: SpeechSynthesisUtterance[] = [];
    private onSpeechStartCallback: ((text: string) => void) | null = null;
    private onSpeechEndCallback: (() => void) | null = null;
    
    // Buffer mode related
    private speakBuffer = "";
    private speakTimer: NodeJS.Timeout | null = null;
    private pendingSpeaks: PendingSpeak[] = [];

    // Subtitle management
    private subtitleText = "";
    private isSubtitleShowing = false;
    private subtitleTimer: NodeJS.Timeout | null = null;

    constructor(config: TTSConfig, onSpeechStart?: (text: string) => void, onSpeechEnd?: () => void) {
        this.config = {
            lang: config.lang || 'zh-CN',
            rate: config.rate || 1.2,
            pitch: config.pitch || 1.0,
            volume: config.volume || 0.9,
            maxChunkLength: config.maxChunkLength || 200,
            ...config
        };
        
        this.onSpeechStartCallback = onSpeechStart || null;
        this.onSpeechEndCallback = onSpeechEnd || null;
        
        // Complete initialization in constructor
        this.initialize();
    }
    
    private initialize(): void {
        console.log('🔊 Initializing native TTS...');

        // Check browser support
        if (!('speechSynthesis' in window)) {
            throw new Error('Browser does not support Speech Synthesis API');
        }

        // Preload voice list
        this.loadVoices();

        console.log('✅ Native TTS initialization successful');
        console.log('🔊 TTS configuration:', this.config);
    }

    /**
     * Read text
     * @param text Text to read
     * @param mode Reading mode: 'buffer' buffer mode (streaming input), 'direct' direct mode (complete sentences)
     * @returns Promise resolves when the input text is actually read
     */
    async speak(text: string, mode: SpeakMode): Promise<SpeakResult> {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
                reject(new Error('Browser does not support Speech Synthesis API'));
                return;
            }

            const id = uuidv4();

            // Add to pending queue
            this.pendingSpeaks.push({ id, text, resolve, reject });

            if (mode === 'direct') {
                // Direct mode: read immediately
                this.flushSpeakBuffer(id, this.speakBuffer + text);
            } else {
                // Buffer mode: add to buffer, wait for complete sentence
                this.processBufferMode({ id, text });
            }
        });
    }

    /**
     * Stop voice reading, clear buffer
     */
    stop(): void {
        console.log('🔊 [Native TTS] Stop playback and clear buffer');

        // Hide subtitle
        this.hideSubtitle();

        // Cancel all queued speech
        speechSynthesis.cancel();

        // Clean up state
        this.isPlaying = false;
        this.currentUtterance = null;
        this.utteranceQueue = [];

        // Clear buffer
        this.speakBuffer = "";
        if (this.speakTimer) {
            clearTimeout(this.speakTimer);
            this.speakTimer = null;
        }

        // Reject all pending speak calls
        this.pendingSpeaks.forEach(pending => {
            pending.reject(new Error('TTS stopped'));
        });
        this.pendingSpeaks = [];

        // Trigger end callback
        if (this.onSpeechEndCallback) {
            this.onSpeechEndCallback();
        }
    }

    /**
     * Pause voice reading, keep queue and buffer
     */
    pause(): void {
        console.log('🔊 [Native TTS] Pause playback (keep queue)');

        if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause();
        }

        if (this.speakTimer) {
            clearTimeout(this.speakTimer);
            this.speakTimer = null;
        }

        // Keep subtitle displayed when paused
    }

    /**
     * Resume voice reading
     */
    resume(): void {
        console.log('🔊 [Native TTS] Resume playback');

        if (speechSynthesis.paused) {
            speechSynthesis.resume();
        }

        // Reset subtitle timer when resuming
        this.updateSubtitleTimer();

        // If there's buffered content, continue processing
        if (this.speakBuffer.trim()) {
            this.scheduleBufferFlush(this.pendingSpeaks[0].id);
        }
    }

    // Process buffer mode
    private processBufferMode(part: { id: string, text: string }): void {
        console.log('📄 [Native TTS] Buffer mode processing:', part.text.substring(0, 30));

        // Clean text
        const cleanText = this.cleanStreamText(part.text);
        if (!cleanText) {
            this.resolvePendingSpeaks(part.id, part.text, false);
            return;
        };

        this.speakBuffer += cleanText;

        // If sentence is complete or buffer length exceeds 50, flush buffer
        if (this.isSentenceComplete(this.speakBuffer) || this.speakBuffer.length > 50) {
            this.flushSpeakBuffer(part.id);
            if (this.speakTimer) {
                clearTimeout(this.speakTimer);
            }
            return;
        }

        this.resolvePendingSpeaks(part.id, part.text, false);
        this.scheduleBufferFlush(part.id);
    }

    // Schedule buffer flush
    private scheduleBufferFlush(id: string): void {
        if (this.speakTimer) clearTimeout(this.speakTimer);
        this.speakTimer = setTimeout(() => {
            this.flushSpeakBuffer(id);
        }, 1500);
    }

    // Flush and play buffer content
    private flushSpeakBuffer(id: string, directText?: string): void {
        const textToSpeak = directText || this.speakBuffer.trim();
        if (!textToSpeak) return;

        console.log('flushSpeakBuffer:', textToSpeak);
        
        // If it's a new conversation start, reset subtitle state
        if (!this.isSubtitleShowing) {
            this.resetSubtitleState();
        }
        
        // Check text length, split long text into chunks
        if (textToSpeak.length > (this.config.maxChunkLength || 200)) {
            this.speakLongText(id, textToSpeak);
        } else {
            this.speakSingleText(id, textToSpeak, true);
        }
        
        this.speakBuffer = "";
    }

    // Play single text block
    private speakSingleText(id: string, text: string, isFirst: boolean = false, isLast: boolean = true): void {

        const cleanText = this.stripXmlLikeTags(text);
        console.log('🔊 [Native TTS] Cleaned text:', cleanText);
        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Set voice parameters
        utterance.lang = this.config.lang || 'zh-CN';
        utterance.rate = this.config.rate || 1.2;
        utterance.pitch = this.config.pitch || 1.0;
        utterance.volume = this.config.volume || 0.9;

        // Set voice
        if (this.config.voiceName) {
            const voices = speechSynthesis.getVoices();
            const selectedVoice = voices.find(voice => voice.name === this.config.voiceName);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        // Event handling
        utterance.onstart = () => {
            this.isPlaying = true;
            this.currentUtterance = utterance;

            if (isFirst) {
                console.log('🔊 [Native TTS] Playback started');

                this.showSubtitle(cleanText);

                if (this.onSpeechStartCallback) {
                    this.onSpeechStartCallback(text);
                }
            }
        };

        utterance.onend = () => {
            // Resolve related pending speaks when playback completes
            if (isLast) {
                this.resolvePendingSpeaks(id, text, true);
            }
            console.log('🔊 [Native TTS] Current block playback completed:', text);

            // Remove completed utterance from queue
            const index = this.utteranceQueue.indexOf(utterance);
            if (index > -1) {
                this.utteranceQueue.splice(index, 1);
            }

            // Check if there's still content to play
            if (this.utteranceQueue.length === 0) {
                this.isPlaying = false;
                this.currentUtterance = null;
                console.log('🔊 [Native TTS] All playback completed');

                // Reset hide timer when playback completes
                this.updateSubtitleTimer();

                if (this.onSpeechEndCallback) {
                    this.onSpeechEndCallback();
                }
            }
        };

        utterance.onerror = (event) => {
            console.error('🔊 [Native TTS] Playback error:', event.error);
            this.isPlaying = false;
            this.currentUtterance = null;

            // Remove errored utterance from queue
            const index = this.utteranceQueue.indexOf(utterance);
            if (index > -1) {
                this.utteranceQueue.splice(index, 1);
            }

            // Reject related pending speaks when error occurs
            this.rejectPendingSpeaks(id, text, new Error(event.error));

            // Reset timer when error occurs
            this.updateSubtitleTimer();

            if (this.onSpeechEndCallback) {
                this.onSpeechEndCallback();
            }
        };

        // Add to queue and play
        this.utteranceQueue.push(utterance);
        speechSynthesis.speak(utterance);
    }

    // Resolve related pending speaks
    private resolvePendingSpeaks(id: string, spokenText: string, sentenceCompleted: boolean): void {
        // Find pending speaks included in the spoken text and resolve them
        const toResolve = this.pendingSpeaks.filter(pending => 
            pending.id === id
        );
        
        toResolve.forEach(pending => {
            pending.resolve({
                sentenceCompleted,
                sentence: this.speakBuffer,
                id,
            });
        });
        
        // Remove resolved ones from pending queue
        this.pendingSpeaks = this.pendingSpeaks.filter(pending => 
            pending.id !== id
        );
    }

    // Reject related pending speaks
    private rejectPendingSpeaks(id:string, spokenText: string, error: any): void {
        // Find pending speaks included in the spoken text and reject them
        const toReject = this.pendingSpeaks.filter(pending => 
            pending.id === id
        );
        
        toReject.forEach(pending => {
            pending.reject(error);
        });
        
        // Remove rejected ones from pending queue
        this.pendingSpeaks = this.pendingSpeaks.filter(pending => 
            pending.id !== id
        );
    }

    // Check if it's a complete sentence
    private isSentenceComplete(text: string): boolean {
        return /[。！？!?]$/.test(text.trim());
    }

    // Clean streaming text
    private cleanStreamText(text: string): string {
        return text
            .replace(/[\n\r\*\#\_]/g, ' ')  // Remove formatting characters
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Subtitle management methods
    private showSubtitle(text: string): void {
        this.hideSubtitle();
        this.subtitleText = text;
        if (!this.isSubtitleShowing) {
            this.isSubtitleShowing = true;
            if (typeof window !== 'undefined' && window.api && window.api.sendTTSSubtitle) {
                window.api.sendTTSSubtitle(text, true);
            }
        }
    }

    private updateSubtitleTimer(): void {
        if (this.subtitleTimer) {
            clearTimeout(this.subtitleTimer);
        }
        // Hide subtitle after 2 seconds (if no new playback)
        this.subtitleTimer = setTimeout(() => {
            this.hideSubtitle();
        }, 2000);
    }

    private hideSubtitle(): void {
        if (this.isSubtitleShowing) {
            this.isSubtitleShowing = false;
            this.subtitleText = "";
            if (typeof window !== 'undefined' && window.api && window.api.sendTTSSubtitle) {
                window.api.sendTTSSubtitle("", false);
            }
        }
        if (this.subtitleTimer) {
            clearTimeout(this.subtitleTimer);
            this.subtitleTimer = null;
        }
    }

    private resetSubtitleState(): void {
        this.subtitleText = "";
        this.hideSubtitle();
    }

    // Private methods
    private loadVoices(): void {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length === 0) {
            // Some browsers require async loading
            speechSynthesis.addEventListener('voiceschanged', () => {
                const loadedVoices = speechSynthesis.getVoices();
                this.selectBestVoice(loadedVoices);
            });
        } else {
            this.selectBestVoice(voices);
        }
    }

    private selectBestVoice(voices: SpeechSynthesisVoice[]): void {
        console.log('🔊 Available voice list:');
        voices.forEach((voice, index) => {
            console.log(`  ${index}: ${voice.name} (${voice.lang}) ${voice.localService ? '[Local]' : '[Online]'}`);
        });

        // Prefer local Chinese voices
        const chineseVoices = voices.filter(voice =>
            voice.lang.includes('zh') ||
            voice.lang.includes('Chinese') ||
            voice.name.includes('Chinese')
        );

        if (chineseVoices.length > 0) {
            // Prefer local voices
            const localChineseVoice = chineseVoices.find(voice => voice.localService);
            const selectedVoice = localChineseVoice || chineseVoices[0];

            this.config.voiceName = selectedVoice.name;
            console.log(`🔊 Selected voice: ${selectedVoice.name} (${selectedVoice.lang}) ${selectedVoice.localService ? '[Local]' : '[Online]'}`);
        } else {
            console.warn('⚠️ No Chinese voice found, will use default voice');
        }
    }



    private speakLongText(id: string, text: string): void {
        console.log('🔊 [Native TTS] Long text chunking playback, length:', text.length);
        
        const chunks = this.splitTextIntoChunks(text, this.config.maxChunkLength || 200);
        console.log(`🔊 [Native TTS] Split into ${chunks.length} chunks`);
        
        // Clear queue
        this.utteranceQueue = [];
        
        // Create utterance for each chunk
        chunks.forEach((chunk, index) => {
            if (chunk.trim()) {
                this.speakSingleText(id, chunk, index === 0, index === chunks.length - 1);
            }
        });
    }

    private splitTextIntoChunks(text: string, maxLength: number): string[] {
        if (text.length <= maxLength) {
            return [text];
        }
        
        // Split by sentences
        const sentences = text.split(/([。！？!?；;])/);
        const chunks: string[] = [];
        let currentChunk = '';
        
        for (let i = 0; i < sentences.length; i += 2) {
            const sentence = sentences[i] + (sentences[i + 1] || '');
            
            if ((currentChunk + sentence).length <= maxLength) {
                currentChunk += sentence;
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                
                // If a single sentence is too long, force split by characters
                if (sentence.length > maxLength) {
                    const forceSplit = this.splitByLength(sentence, maxLength);
                    chunks.push(...forceSplit);
                    currentChunk = '';
                } else {
                    currentChunk = sentence;
                }
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks.filter(chunk => chunk.length > 0);
    }

    private splitByLength(text: string, maxLength: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += maxLength) {
            chunks.push(text.substring(i, i + maxLength));
        }
        return chunks;
    }

    /**
 * Remove XML-like tags from streaming output (including incomplete tags)
 * @param input Any string
 * @returns Clean text after removing tags
 */
    private stripXmlLikeTags(input: string): string {
        return input
          // Remove all tags starting with < and closing (including attributes)
          .replace(/<[^>]*>/g, '')
          // Remove all incomplete tags starting with < at line ends
          .replace(/<[^>\n]{0,200}$/gm, '')
          // Remove all "word+>" incomplete tag fragments
          .replace(/\b\w+>/g, '')
          // Remove standalone attribute strings without context
          .replace(/\b\w+="[^"]*"/g, '')
          // Remove isolated < or >
          .replace(/[<>]/g, '')
          // Merge excess whitespace
          .replace(/\s+/g, ' ')
          .trim();
      }
      
  
}