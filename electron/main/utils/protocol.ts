import { app, net } from 'electron';
import path from 'node:path';

/**
 * Register client custom protocol handler
 * @param protocolHandler - Protocol handler object (global protocol or session.protocol)
 */
export function registerClientProtocol(protocolHandler: any) {
  protocolHandler.handle('client', async (request: any) => {
    const fileName = request.url.substring(9).replace(/\/$/, ''); // Remove 'client://' prefix and trailing slash
    const filePath = path.join(app.getPath('userData'), 'static', fileName);
    console.log(`Client protocol accessing: ${filePath}`);

    try {
      const response = await net.fetch(`file://${filePath}`);
      const buffer = await response.arrayBuffer();
      const content = new TextDecoder('utf-8').decode(buffer);

      // Set Content-Type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const contentType = ext === '.html' ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';

      return new Response(content, {
        headers: { 'Content-Type': contentType }
      });
    } catch (error) {
      console.error('Error accessing client file:', error);
      return new Response('File not found', { status: 404 });
    }
  });
}