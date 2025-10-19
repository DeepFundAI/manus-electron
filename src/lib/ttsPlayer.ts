import { TTSConfig, TTSPlayerBase } from "@/models/tts-player/tts-player-base";
import { TTSPlayerNative } from "@/models/tts-player/tts-player-native";
import { TTSPlayerMicrosoft } from "@/models/tts-player/tts-player-microsoft";

let ttsPlayer: TTSPlayerBase | null = null;

// Initialize TTS
export function initTTS(config: TTSConfig) {
  switch (config.provider) {
    case 'native':
      ttsPlayer = new TTSPlayerNative(config);
      break;
    case 'microsoft':
      ttsPlayer = new TTSPlayerMicrosoft(config);
      break;
    default:
      throw new Error(`Unsupported TTS provider: ${config.provider}`);
  }
}

// Add error handling to main function
export async function queueSpeakTextOptimized(part: string, isDirect: boolean) {
  if (!ttsPlayer) return;
  return await ttsPlayer.speak(part, isDirect ? 'direct' : 'buffer');
}

// Stop playing
export function stopSpeaking() {
  if (ttsPlayer) {
    ttsPlayer.stop();
  }
}
