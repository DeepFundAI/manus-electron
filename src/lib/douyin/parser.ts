import { httpClient } from '../../utils/http';

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  downloadUrl: string;
  cover: string;
  duration?: number;
}

export async function parseDouyinUrl(shareText: string): Promise<VideoInfo> {
  // Extract share link
  const urlMatch = shareText.match(/http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/);
  if (!urlMatch) {
    throw new Error('No valid share link found');
  }

  const shareUrl = urlMatch[0];

  try {
    // Follow original Python logic: first visit share link to get redirected URL
    const shareResponse = await httpClient.get(shareUrl);

    // Use fetch's response.url to get final redirected URL
    const finalUrl = shareResponse.url || shareUrl;
    // Follow original logic: share_response.url.split("?")[0].strip("/").split("/")[-1]
    const urlWithoutParams = finalUrl.split("?")[0];
    const urlWithoutTrailingSlash = urlWithoutParams.replace(/\/$/, ''); // JavaScript version of strip("/")
    const urlParts = urlWithoutTrailingSlash.split("/");
    const videoId = urlParts[urlParts.length - 1]; // JavaScript version of [-1]

    if (!videoId) {
      throw new Error(`Unable to extract video ID from URL. Original URL: ${shareUrl}, Redirected URL: ${finalUrl}`);
    }

    // Build detail URL following original logic
    const detailUrl = `https://www.iesdouyin.com/share/video/${videoId}`;

    // Get video page content
    const pageResponse = await httpClient.get(detailUrl);
    const pageContent = pageResponse.data;

    // Parse using original regex
    const pattern = new RegExp('window\\._ROUTER_DATA\\s*=\\s*(.*?)</script>', 'gs');
    const dataMatch = pattern.exec(pageContent);
    if (!dataMatch) {
      throw new Error('Failed to parse video info from HTML');
    }

    const jsonData = JSON.parse(dataMatch[1].trim());

    // Find video data following original logic
    const loaderData = jsonData.loaderData;
    const VIDEO_ID_PAGE_KEY = "video_(id)/page";
    const NOTE_ID_PAGE_KEY = "note_(id)/page";

    let originalVideoInfo: any = null;

    if (VIDEO_ID_PAGE_KEY in loaderData) {
      originalVideoInfo = loaderData[VIDEO_ID_PAGE_KEY].videoInfoRes;
    } else if (NOTE_ID_PAGE_KEY in loaderData) {
      originalVideoInfo = loaderData[NOTE_ID_PAGE_KEY].videoInfoRes;
    } else {
      throw new Error('Unable to parse video or album info from JSON');
    }

    // Get data following original logic
    const data = originalVideoInfo.item_list[0];

    // Debug: output video data structure
    console.log('Video data structure:', JSON.stringify({
      video: {
        play_addr: data.video.play_addr,
        download_addr: data.video.download_addr,
        duration: data.video.duration
      }
    }, null, 2));

    // Get video info following original logic
    const videoUrl = data.video.play_addr.url_list[0].replace('playwm', 'play');
    const desc = data.desc?.trim() || `douyin_${videoId}`;

    // Replace illegal characters in filename (following original logic)
    const title = desc.replace(/[\\/:*?"<>|]/g, '_');
    const author = data.author?.nickname || 'Unknown author';
    const cover = data.video.cover?.url_list?.[0] || '';
    const duration = data.video?.duration || 0;

    return {
      videoId,
      title,
      author,
      downloadUrl: videoUrl,
      cover,
      duration: Math.floor(duration / 1000) // Convert to seconds
    };

  } catch (error) {
    console.error('Failed to parse Douyin link:', error);
    throw new Error(`Failed to parse Douyin link: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}