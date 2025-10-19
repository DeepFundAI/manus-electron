import { NextApiRequest, NextApiResponse } from 'next';
import { DouyinService } from '../../../lib/douyin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tool, share_link } = req.query;

  if (!tool || !share_link) {
    return res.status(400).json({
      error: 'Missing parameters',
      usage: '/api/test-douyin-real?tool=parse_douyin_video_info&share_link=Douyin_share_link'
    });
  }

  try {
    const douyinService = new DouyinService({
      apiKey: process.env.BAILIAN_API_KEY || ''
    });

    let result;

    switch (tool) {
      case 'parse_douyin_video_info':
        result = await douyinService.getVideoInfo(share_link as string);
        break;
      case 'get_douyin_download_link':
        result = await douyinService.getDownloadLink(share_link as string);
        break;
      case 'extract_douyin_text':
        result = await douyinService.extractText(share_link as string);
        break;
      default:
        return res.status(400).json({ error: 'Invalid tool' });
    }

    res.json({
      success: true,
      tool,
      share_link,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Douyin real test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tool,
      share_link
    });
  }
}