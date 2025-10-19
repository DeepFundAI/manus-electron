import { extractXiaohongshuText } from './parser';

export interface XiaohongshuServiceOptions {
  apiKey?: string;
}

export class XiaohongshuService {
  private apiKey?: string;

  constructor(options: XiaohongshuServiceOptions = {}) {
    this.apiKey = options.apiKey;
  }

  /**
   * Extract text content from Xiaohongshu video (audio to text)
   */
  async extractText(videoUrl: string, model: string = 'sensevoice-v1'): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Text extraction requires Alibaba Cloud Bailian API key');
    }

    try {
      console.log('Starting to extract Xiaohongshu video text:', videoUrl);
      const text = await extractXiaohongshuText(videoUrl, this.apiKey, model);
      return text;
    } catch (error) {
      console.error('Xiaohongshu text extraction failed:', error);
      throw error;
    }
  }

  /**
   * Validate if it's a Xiaohongshu link
   */
  static isXiaohongshuUrl(url: string): boolean {
    return url.includes('xiaohongshu.com') && url.includes('/explore/');
  }

  /**
   * Extract Xiaohongshu link from text
   */
  static extractUrlFromText(text: string): string | null {
    const urlPattern = /https?:\/\/[^/]*xiaohongshu\.com\/[^/]*\/explore\/[^\s?]*/i;
    const match = text.match(urlPattern);
    return match ? match[0] : null;
  }
}

export * from './parser';