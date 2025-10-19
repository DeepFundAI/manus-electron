import { NextApiRequest, NextApiResponse } from 'next';
import { XiaohongshuService } from '../../../lib/xiaohongshu';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tool, share_link } = req.query;

  if (!tool || !share_link) {
    return res.status(400).json({
      error: 'Missing parameters',
      usage: '/api/test/test-xiaohongshu?tool=extract_xiaohongshu_text&share_link=Xiaohongshu_video_link&model=sensevoice-v1'
    });
  }

  try {
    const xiaohongshuService = new XiaohongshuService({
      apiKey: process.env.BAILIAN_API_KEY || ''
    });

    let result;

    switch (tool) {
      case 'extract_xiaohongshu_text':
        const { model } = req.query;
        result = await xiaohongshuService.extractText(share_link as string, model as string);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid tool',
          availableTools: ['extract_xiaohongshu_text']
        });
    }

    res.json({
      success: true,
      tool,
      share_link,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Xiaohongshu test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tool,
      share_link,
      timestamp: new Date().toISOString()
    });
  }
}