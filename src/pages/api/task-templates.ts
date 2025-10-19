import { NextApiRequest, NextApiResponse } from 'next';
import { TaskTemplate } from '@/models';

/**
 * Task Templates API
 * GET /api/task-templates - Get all task templates
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Here we can get templates from configuration files, database, or remote services
      // Temporarily return hardcoded template list
      const templates: TaskTemplate[] = [
        {
          id: 'stock-analysis',
          name: 'Stock Analysis',
          description: 'Analyze market data and technical indicators for specified stocks',
          category: 'Finance',
          steps: [
            {
              id: 'step-1',
              name: 'Open Trading Software',
              content: 'Open trading software',
              order: 1
            },
            {
              id: 'step-2',
              name: 'Search Stock',
              content: 'Enter stock code or name in search box',
              order: 2
            },
            {
              id: 'step-3',
              name: 'View K-line Chart',
              content: 'Switch to daily K-line chart view',
              order: 3
            },
            {
              id: 'step-4',
              name: 'Screenshot and Save',
              content: 'Take screenshot and save K-line chart',
              order: 4
            },
            {
              id: 'step-5',
              name: 'Analyze Financial Data',
              content: 'View and analyze financial statement data',
              order: 5
            }
          ]
        },
        {
          id: 'news-collection',
          name: 'Financial News Collection',
          description: 'Collect and organize daily financial news',
          category: 'Information Collection',
          steps: [
            {
              id: 'step-1',
              name: 'Open Financial Website',
              content: 'Open financial websites like East Money or Sina Finance',
              order: 1
            },
            {
              id: 'step-2',
              name: 'Get News List',
              content: 'Extract today\'s headline news title list',
              order: 2
            },
            {
              id: 'step-3',
              name: 'Filter Important News',
              content: 'Filter out important market news',
              order: 3
            },
            {
              id: 'step-4',
              name: 'Save Data',
              content: 'Save news information to file',
              order: 4
            }
          ]
        },
        {
          id: 'market-monitor',
          name: 'Market Monitoring',
          description: 'Monitor market indices and key stock fluctuations',
          category: 'Finance',
          steps: [
            {
              id: 'step-1',
              name: 'Open Market Software',
              content: 'Open market software like Tonghuashun or East Money',
              order: 1
            },
            {
              id: 'step-2',
              name: 'View Market Indices',
              content: 'View Shanghai Composite Index, Shenzhen Component Index, ChiNext Index',
              order: 2
            },
            {
              id: 'step-3',
              name: 'View Watchlist',
              content: 'Open watchlist and view price changes',
              order: 3
            },
            {
              id: 'step-4',
              name: 'Generate Report',
              content: 'Generate market monitoring report and save',
              order: 4
            }
          ]
        },
        {
          id: 'data-backup',
          name: 'Data Backup',
          description: 'Regularly backup important files and data',
          category: 'System',
          steps: [
            {
              id: 'step-1',
              name: 'Check Backup Directory',
              content: 'Check if backup directory exists',
              order: 1
            },
            {
              id: 'step-2',
              name: 'Copy Files',
              content: 'Copy specified folders to backup directory',
              order: 2
            },
            {
              id: 'step-3',
              name: 'Compress Backup',
              content: 'Compress backup files into archive',
              order: 3
            },
            {
              id: 'step-4',
              name: 'Verify Backup',
              content: 'Verify backup file integrity',
              order: 4
            }
          ]
        },
        {
          id: 'xiaohongshu-post',
          name: 'Xiaohongshu Content Collection',
          description: 'Collect Xiaohongshu trending content and topics',
          category: 'Information Collection',
          steps: [
            {
              id: 'step-1',
              name: 'Open Xiaohongshu',
              content: 'Open Xiaohongshu web version',
              order: 1
            },
            {
              id: 'step-2',
              name: 'Search Topics',
              content: 'Search specified topics or keywords',
              order: 2
            },
            {
              id: 'step-3',
              name: 'Collect Content',
              content: 'Collect trending notes titles and content',
              order: 3
            },
            {
              id: 'step-4',
              name: 'Save Data',
              content: 'Save collected data to file',
              order: 4
            }
          ]
        }
      ];

      res.status(200).json(templates);
    } catch (error: any) {
      console.error('Failed to get task templates:', error);
      res.status(500).json({ error: 'Failed to get task templates', message: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
