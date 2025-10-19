import { parseDouyinUrl, VideoInfo } from './parser';
import { getDownloadLink, DownloadResult } from './downloader';
import { extractAudioText } from './transcriber';

export interface DouyinServiceOptions {
  apiKey?: string;
}

export class DouyinService {
  private apiKey?: string;

  constructor(options: DouyinServiceOptions = {}) {
    this.apiKey = options.apiKey;
  }

  /**
   * Get Douyin video's watermark-free download link
   */
  async getDownloadLink(shareUrl: string): Promise<DownloadResult> {
    try {
      return await getDownloadLink(shareUrl);
    } catch (error) {
      throw new Error(`Failed to get download link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from Douyin video (audio to text)
   */
  async extractText(shareUrl: string, model: string = 'sensevoice-v1'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Text extraction requires Alibaba Cloud Bailian API key');
    }

    try {
      // 1. Get video download link
      console.log('Starting to get video download link...');
      const { videoUrl } = await getDownloadLink(shareUrl);
      console.log('Got video download link:', videoUrl);

      // 2. Try to extract direct link
      let directUrl = videoUrl;
      if (videoUrl.includes('video_id=')) {
        const match = videoUrl.match(/video_id=([^&]+)/);
        if (match && match[1].startsWith('http')) {
          directUrl = decodeURIComponent(match[1]);
          console.log('Extracted direct link:', directUrl);
        }
      }

      // 3. Extract audio text
      const text = await extractAudioText(directUrl, this.apiKey, model);

      return text;
    } catch (error) {
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse Douyin video basic information (without downloading video file)
   */
  async getVideoInfo(shareUrl: string): Promise<VideoInfo> {
    try {
      return await parseDouyinUrl(shareUrl);
    } catch (error) {
      throw new Error(`Failed to parse video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export types and functions
export type { VideoInfo, DownloadResult };
export { parseDouyinUrl, getDownloadLink, extractAudioText };