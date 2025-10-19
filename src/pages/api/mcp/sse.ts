import { NextApiRequest, NextApiResponse } from 'next';

// Store all SSE connected clients - use global variable to avoid hot reload reset
declare global {
  var __sseClients: Set<NextApiResponse> | undefined;
}

const clients = globalThis.__sseClients ?? (globalThis.__sseClients = new Set<NextApiResponse>());

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  res.setHeader('X-Accel-Buffering', 'no');

  // Write initial state to ensure response starts
  res.write('data: connected\n\n');
  res.status(200);

  // Add to client list
  clients.add(res);

  console.log(`SSE client connected, total clients: ${clients.size}, sending endpoint info...`);

  // Ensure connection is stable before sending endpoint info
  setTimeout(() => {
    try {
      res.write(`event: endpoint\ndata: /api/mcp/message\n\n`);
      console.log('Sent endpoint info to client');
    } catch (error) {
      console.error('Error sending endpoint info:', error);
      clients.delete(res);
    }
  }, 100);

  // Handle client disconnection
  req.on('close', () => {
    clients.delete(res);
    console.log(`Client disconnected from SSE, remaining clients: ${clients.size}`);
  });

  // Handle connection errors
  req.on('error', (error) => {
    console.error('SSE connection error:', error);
    clients.delete(res);
    console.log(`Client error, remaining clients: ${clients.size}`);
  });
}

// Export a function for other APIs to use, for sending messages to all clients
export function sendSseMessage(id: string, data: any) {
  console.log(`sendSseMessage ${id}, active clients: ${clients.size}`, data);
  const message = `event: message\ndata: ${JSON.stringify(data)}\n\n`;

  if (clients.size === 0) {
    console.warn(`No SSE clients available for message ${id}`);
    return;
  }

  // Send message to all connected clients
  const failedClients: NextApiResponse[] = [];
  clients.forEach(client => {
    try {
      // Check if connection is still valid
      if (client.writable && !client.destroyed) {
        client.write(message);
        console.log('Successfully sent SSE message to client');
      } else {
        console.warn('Client connection is not writable, removing from clients');
        failedClients.push(client);
      }
    } catch (error) {
      console.error('Error sending SSE message to client:', error);
      failedClients.push(client);
    }
  });

  // Clean up invalid client connections
  failedClients.forEach(client => clients.delete(client));
}

// Export client count for health check use
export function getClientCount() {
  return clients.size;
}

// Next.js API configuration
export const config = {
  api: {
    bodyParser: false,
  },
};