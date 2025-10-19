import { NextApiRequest, NextApiResponse } from 'next';
import mcpToolManager from '../../../lib/mcpTools';
import { sendSseMessage, getClientCount } from './sse';

interface McpListToolParam {
  taskId: string;
  nodeId: string;
  environment: string;
  agent_name: string;
  prompt: string;
  browser_url?: string;
  params: Record<string, any>;
}

interface McpCallToolParam {
  name: string;
  arguments: Record<string, any>;
  extInfo?: Record<string, any>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jsonrpc, id, method, params } = req.body;
    
    console.log(`Received ${method} request:`, { id, params });

    let result: any;
    
    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: true,
            },
            sampling: {},
          },
          serverInfo: {
            name: 'EkoMcpServer',
            version: '1.0.0',
          },
        };
        break;

      case 'tools/list':
        result = await handleListTools(params);
        break;

      case 'tools/call':
        result = await handleCallTool(params);
        break;

      case 'ping':
        result = {};
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    // Send response
    res.status(200).send('Accepted');

    // Check if there are active SSE connections
    if (getClientCount() === 0) {
      console.warn(`No SSE clients connected for message ${id}`);
      return;
    }

    // Send result via SSE, add brief delay to ensure SSE connection is ready
    setTimeout(() => {
      try {
        sendSseMessage(id, { jsonrpc, id, result });
      } catch (error) {
        console.error(`Failed to send SSE message for ${id}:`, error);
      }
    }, 50);

  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error'
      }
    });
  }
}

async function handleListTools(params: McpListToolParam): Promise<{ tools: any[] }> {
  console.log('Listing tools for:', params);
  
  const tools = mcpToolManager.getTools();
  return { tools };
}

async function handleCallTool(params: McpCallToolParam): Promise<any> {
  const { name, arguments: args, extInfo } = params;
  console.log(`Calling tool: ${name}`, { args, extInfo });

  try {
    const result = await mcpToolManager.callTool(name, args, extInfo);
    return result;
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw error;
  }
} 