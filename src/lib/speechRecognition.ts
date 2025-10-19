import { SpeechRecognitionBase, SpeechRecognitionConfig } from "@/models/speech-recognition/speech-recognition-base";
import { SpeechRecognitionMicrosoft } from "@/models/speech-recognition/speech-recognition-microsoft";
import { SpeechRecognitionVosk } from "@/models/speech-recognition/speech-recognition-vosk";
import { SpeechRecognitionXunfei } from "@/models/speech-recognition/speech-recognition-xunfei";


let speechRecognition: SpeechRecognitionBase | null = null;

// New initialization function, supports multiple providers
export function initSpeechRecognitionWithProvider(config: SpeechRecognitionConfig, onRecognized?: (text: string) => void) {
  const {provider} = config;
  switch (provider) {
    case 'microsoft':
      speechRecognition = new SpeechRecognitionMicrosoft(config, onRecognized);
      break;
    case 'xunfei':
      speechRecognition = new SpeechRecognitionXunfei(config, onRecognized);
      break;
    case 'vosk':
      speechRecognition = new SpeechRecognitionVosk(config, onRecognized);
      break;
    default:
      throw new Error(`Unsupported speech recognition provider: ${provider}`);
  }
}

// Start speech recognition
export async function startSpeechRecognition() {
  if (speechRecognition?.isRecognizing) {
    console.log("Speech recognition already in progress");
    return;
  }

  console.log(`Starting speech recognition... [${speechRecognition?.config.provider}]`);

  await speechRecognition?.start();
}

// Stop speech recognition
export async function stopSpeechRecognition() {
  if (!speechRecognition?.isRecognizing) {
    console.log("Speech recognition not in progress");
    return;
  }
  console.log(`Stopping speech recognition... [${speechRecognition?.config.provider}]`);
  await speechRecognition?.stop();
}

// Cleanup resources
export async function cleanupSpeechRecognition() {
  await speechRecognition?.cleanup();
}