import { NextApiRequest, NextApiResponse } from 'next';
import mcpToolManager from '../../../lib/mcpTools';
import { getClientCount } from './sse';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tools = mcpToolManager.getTools();
  
  res.json({
    status: 'ok',
    tools: tools.map(t => t.name),
    connectedClients: getClientCount(),
    timestamp: new Date().toISOString(),
    serverInfo: {
      name: 'EkoMcpServer (Next.js)',
      version: '1.0.0',
      totalTools: tools.length
    }
  });
} 