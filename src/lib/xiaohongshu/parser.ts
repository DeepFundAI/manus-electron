import { extractAudioText } from '../douyin/transcriber';

/**
 * Extract text content from Xiaohongshu video (audio to text)
 * @param videoUrl Xiaohongshu video's real playback URL
 * @param apiKey Alibaba Cloud Bailian API key
 * @param model Speech recognition model
 */
export async function extractXiaohongshuText(
  videoUrl: string,
  apiKey: string,
  model: string = 'sensevoice-v1'
): Promise<string> {
  try {
    console.log('Starting to extract Xiaohongshu video text, video URL:', videoUrl);

    // Directly use the provided real video URL to call audio to text function
    const text = await extractAudioText(videoUrl, apiKey, model);

    console.log('Xiaohongshu video text extraction completed');
    return text;

  } catch (error) {
    console.error('Failed to extract Xiaohongshu video text:', error);
    throw new Error(`Failed to extract Xiaohongshu video text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}