import { TTSPlayerBase, TTSConfig, SpeakMode, SpeakResult } from "./tts-player-base";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import { uuidv4 } from "@jarvis-agent/core";

interface PendingSpeak {
    id: string;
    text: string;
    resolve: (value: SpeakResult) => void;
    reject: (error: any) => void;
}

export class TTSPlayerMicrosoft implements TTSPlayerBase {
    config: TTSConfig;
    private synthesizer: SpeechSDK.SpeechSynthesizer | null = null;
    isPlaying: boolean = false;
    
    // Streaming playback related state
    private lastSpeakTime = Date.now();
    private lastLength = 0;
    private speakBuffer = "";
    private speakTimer: NodeJS.Timeout | null = null;
    private xmlBuffer = "";
    private isInXMLMode = false;
    
    // Promise management - track pending speak calls to resolve
    private pendingSpeaks: PendingSpeak[] = [];
    
    // Subtitle management
    private subtitleText = "";
    private isSubtitleShowing = false;
    private subtitleTimer: NodeJS.Timeout | null = null;
    
    constructor(config: TTSConfig, onSpeechStart?: (text: string) => void, onSpeechEnd?: () => void) {
        this.config = config;
        
        if (!config.apiKey || !config.region) {
            throw new Error('Microsoft TTS requires apiKey and region configuration');
        }
        
        // Complete initialization in constructor
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(config.apiKey, config.region);
        speechConfig.speechSynthesisVoiceName = config.voiceName || "zh-CN-XiaoxiaoNeural";

        const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
        this.synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
        
        console.log('[Microsoft TTS] Initialization successful');
    }

    /**
     * Read text
     * @param text Text to read
     * @param mode Reading mode: 'buffer' buffer mode (streaming input), 'direct' direct mode (complete sentences)
     * @returns Promise resolves when the input text is actually read
     */
    async speak(text: string, mode: SpeakMode): Promise<SpeakResult> {
        return new Promise((resolve, reject) => {
            if (!this.synthesizer) {
                reject(new Error('TTS not initialized'));
                return;
            }

            const id = uuidv4();

            // Add to pending queue
            this.pendingSpeaks.push({ id, text, resolve, reject });

            if (mode === 'direct') {
                // Direct mode: read immediately
                this.flushSpeakBuffer(id, text);
            } else {
                // Buffer mode: add to buffer, wait for sentence completion
                this.processBufferMode({ id, text });
            }
        });
    }

    /**
     * Stop voice reading, clear buffer
     */
    stop(): void {
        console.log('[Microsoft TTS] Stop playback and clear buffer');
        this.isPlaying = false;
        this.hideSubtitle();

        // Clear all buffers
        this.speakBuffer = "";
        this.xmlBuffer = "";
        this.isInXMLMode = false;
        if (this.speakTimer) {
            clearTimeout(this.speakTimer);
            this.speakTimer = null;
        }

        // Reject all pending speak calls
        this.pendingSpeaks.forEach(pending => {
            pending.reject(new Error('TTS stopped'));
        });
        this.pendingSpeaks = [];

        // Stop current playback
        if (this.synthesizer) {
            this.synthesizer.close();
            // Recreate synthesizer
            if (this.config.apiKey && this.config.region) {
                const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(this.config.apiKey, this.config.region);
                speechConfig.speechSynthesisVoiceName = this.config.voiceName || "zh-CN-XiaoxiaoNeural";
                const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
                this.synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
            }
        }
    }

    /**
     * Pause voice reading, keep queue and buffer
     */
    pause(): void {
        console.log('[Microsoft TTS] Pause playback (keep queue)');
        // Microsoft TTS doesn't have direct pause function, only mark status here
        // Actual pause needs to be handled at playback level
        this.isPlaying = false;
        if (this.speakTimer) {
            clearTimeout(this.speakTimer);
            this.speakTimer = null;
        }
    }

    /**
     * Resume voice reading
     */
    resume(): void {
        console.log('[Microsoft TTS] Resume playback');
        // If there's buffered content, continue processing
        if (this.speakBuffer.trim()) {
            this.scheduleBufferFlush(this.pendingSpeaks[0].id);
        }
    }

    // Process buffer mode
    private processBufferMode(part: { id: string, text: string }): void {
        console.log('📄 [Microsoft TTS] Buffer mode processing:', part.text.substring(0, 30));

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
        if (!textToSpeak) {
            this.resolvePendingSpeaks(id, textToSpeak, true);
            return;
        }

        console.log('flushSpeakBuffer:', textToSpeak);

        // If it's a new conversation start, reset subtitle state
        if (!this.isSubtitleShowing) {
            this.resetSubtitleState();
        }

        this.speakText(id, textToSpeak);

        // Clear buffer (if playing from buffer)
        if (!directText) {
            this.speakBuffer = "";
        }
    }

    // Actual text playback method
    private speakText(id: string, text: string): void {
        const cleanText = this.stripXmlLikeTags(text);
        if (!this.synthesizer) return;

        console.log('speakText:', cleanText);
        this.isPlaying = true;

        this.showSubtitle(cleanText);


        const rate = this.getRateBasedOnSpeed(text);

        const ssml = this.wrapSSML(cleanText, rate);

        this.synthesizer.speakSsmlAsync(
            ssml,
            result => {
                if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    console.log('TTS playback completed:', text);
                    // Resolve related pending speaks when playback completes
                    this.resolvePendingSpeaks(id, text, true);
                    this.updateSubtitleTimer();
                } else {
                    console.error("TTS failed:", result.errorDetails);
                    // Reject related pending speaks when failed
                    this.rejectPendingSpeaks(id, text, new Error(result.errorDetails));
                    this.updateSubtitleTimer();
                }
                this.isPlaying = false;
            },
            error => {
                console.error("TTS error:", error);
                // Reject related pending speaks when error occurs
                this.rejectPendingSpeaks(id, text, error);
                this.updateSubtitleTimer();
                this.isPlaying = false;
            }
        );
    }

    // Resolve related pending speaks
    private resolvePendingSpeaks(id: string, spokenText: string, sentenceCompleted: boolean): void {
        // Find pending speaks contained in the played text and resolve them
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
    private rejectPendingSpeaks(id: string, spokenText: string, error: any): void {
        // Find pending speaks contained in the played text and reject them
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



    // Private methods
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

    private wrapSSML(text: string, rate: string): string {
        return `
<speak version="1.0" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <prosody rate="${rate}">${text}</prosody>
  </voice>
</speak>`.trim();
    }

    private getRateBasedOnSpeed(text: string): string {
        const now = Date.now();
        const deltaSeconds = (now - this.lastSpeakTime) / 1000;
        const charsPerSecond = text.length / (deltaSeconds || 0.1);

        this.lastSpeakTime = now;
        this.lastLength = text.length;

        if (charsPerSecond > 12) return "140%";
        if (charsPerSecond > 9) return "125%";
        return "120%";
    }

    private isSentenceComplete(text: string): boolean {
        return /[。！？!?]$/.test(text.trim());
    }



    private detectXMLStart(text: string): boolean {
        return text.includes('<root>') || 
               text.includes('<n>') || 
               text.includes('<thought>') ||
               text.includes('<agents>') ||
               text.includes('<task>') || 
               text.includes('<node>') ||
               text.startsWith('<') ||
               text.includes('<');
    }

    private detectXMLEnd(xmlBuffer: string): boolean {
        return xmlBuffer.includes('</root>');
    }

    private isValidXMLContent(text: string): boolean {
        return text.includes('<root>') || 
               text.includes('<n>') || 
               text.includes('<task>') ||
               text.includes('<node>') ||
               text.includes('<agents>');
    }

    private extractKeyContentFromCompleteXML(xmlText: string): string {
        console.log('Processing XML content:', xmlText.substring(0, 200) + '...');

        let result = '';

        // Fix plan name extraction
        const nameMatch = xmlText.match(/<n>([\s\S]*?)<\/n>/);
        if (nameMatch && nameMatch[1]) {
            result += `Plan: ${nameMatch[1].trim()}.`;
        }

        // Fix task description extraction
        const taskMatches = xmlText.match(/<task>([\s\S]*?)<\/task>/g);
        if (taskMatches && taskMatches.length > 0) {
            const tasks = taskMatches.map(task => {
                const taskContent = task.replace(/<\/?task>/g, '').trim();
                return taskContent;
            }).filter(task => task.length > 0);

            if (tasks.length > 0) {
                result += `Tasks: ${tasks.join(', ')}.`;
            }
        }

        // If no valid content extracted, return simplified text
        if (!result.trim()) {
            result = xmlText
                .replace(/<[^>]*>/g, ' ')  // Remove all XML tags
                .replace(/\s+/g, ' ')      // Merge multiple spaces
                .trim();

            // Take first 80 characters
            if (result.length > 80) {
                result = result.substring(0, 80) + '...';
            }
        }

        console.log('Extracted content:', result);
        return result;
    }

    private cleanStreamText(text: string): string {
        return text
            .replace(/[\n\r\*\#\_]/g, ' ')  // Remove formatting characters, but keep < > for XML detection
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
 * Remove XML tags from stream output (including incomplete tags)
 * @param input Any string
 * @returns Clean text after removing tags
 */
    private stripXmlLikeTags(input: string): string {
        return input
          // Delete all tags starting with < and closing (including attributes)
          .replace(/<[^>]*>/g, '')
          // Delete all incomplete tags starting with < at line end
          .replace(/<[^>\n]{0,200}$/gm, '')
          // Delete all "word+>" incomplete tag fragments
          .replace(/\b\w+>/g, '')
          // Delete independently appearing attribute strings without context
          .replace(/\b\w+="[^"]*"/g, '')
          // Delete isolated < or >
          .replace(/[<>]/g, '')
          // Merge extra whitespace characters
          .replace(/\s+/g, ' ')
          .trim();
      }
}