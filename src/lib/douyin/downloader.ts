import { parseDouyinUrl, VideoInfo } from './parser';
import { httpClient } from '../../utils/http';

export interface DownloadResult {
  videoUrl: string;
  videoInfo: VideoInfo;
}

export async function getDownloadLink(shareUrl: string): Promise<DownloadResult> {
  try {
    const videoInfo = await parseDouyinUrl(shareUrl);

    return {
      videoUrl: videoInfo.downloadUrl,
      videoInfo
    };
  } catch (error) {
    console.error('Failed to get download link:', error);
    throw new Error(`Failed to get download link: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function downloadVideo(videoUrl: string): Promise<Buffer> {
  try {
    console.log('Starting video download:', videoUrl);
    const videoBuffer = await httpClient.download(videoUrl);
    console.log('Video download completed, size:', videoBuffer.length, 'bytes');
    return videoBuffer;
  } catch (error) {
    console.error('Failed to download video:', error);
    throw new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}