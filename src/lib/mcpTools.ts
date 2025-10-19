interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

interface ToolResult {
  content: Array<{
    type: string;
    text?: string;
    image?: string;
    mimeType?: string;
  }>;
  extInfo?: Record<string, any>;
}

type ToolHandler = (args: any, extInfo?: any) => Promise<ToolResult>;

class McpToolManager {
  private tools: Map<string, ToolHandler> = new Map();
  
  constructor() {
    this.registerDefaultTools();
  }

  public registerTool(name: string, handler: ToolHandler) {
    this.tools.set(name, handler);
    console.log(`Registered tool: ${name}`);
  }

  public getTools(): ToolSchema[] {
    const toolSchemas: { [key: string]: ToolSchema } = {
      get_douyin_download_link: {
        name: 'get_douyin_download_link',
        description: 'Get Douyin video watermark-free download link',
        inputSchema: {
          type: 'object',
          properties: {
            share_link: {
              type: 'string',
              description: 'Douyin share link or text containing the link'
            }
          },
          required: ['share_link']
        }
      },
      extract_xiaohongshu_text: {
        name: 'extract_xiaohongshu_text',
        description: 'Extract text content from Xiaohongshu video (audio to text). Note: Only works with video posts!',
        inputSchema: {
          type: 'object',
          properties: {
            video_url: {
              type: 'string',
              description: 'Xiaohongshu video URL'
            },
            model: {
              type: 'string',
              description: 'Speech recognition model, default is sensevoice-v1',
              default: 'sensevoice-v1'
            }
          },
          required: ['video_url']
        }
      },
      extract_douyin_text: {
        name: 'extract_douyin_text',
        description: 'Extract text content from Douyin video (audio to text)',
        inputSchema: {
          type: 'object',
          properties: {
            share_link: {
              type: 'string',
              description: 'Douyin share link or text containing the link'
            },
            model: {
              type: 'string',
              description: 'Speech recognition model, default is paraformer-v2',
              default: 'paraformer-v2'
            }
          },
          required: ['share_link']
        }
      },
      parse_douyin_video_info: {
        name: 'parse_douyin_video_info',
        description: 'Parse Douyin video basic information (without downloading video file)',
        inputSchema: {
          type: 'object',
          properties: {
            share_link: {
              type: 'string',
              description: 'Douyin share link'
            }
          },
          required: ['share_link']
        }
      }
    };

    const tools: ToolSchema[] = [];
    
    this.tools.forEach((handler, name) => {
      if (toolSchemas[name]) {
        tools.push(toolSchemas[name]);
      } else {
        // Default tool definition
        tools.push({
          name,
          description: `Tool: ${name}`,
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        });
      }
    });

    return tools;
  }

  public async callTool(name: string, args: any, extInfo?: any): Promise<ToolResult> {
    const toolHandler = this.tools.get(name);
    if (!toolHandler) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      const result = await toolHandler(args, extInfo);
      return result;
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      throw error;
    }
  }

  private registerDefaultTools() {
    // Douyin related tools
    this.registerTool('get_douyin_download_link', async (args: any) => {
      try {
        const response = await this.callDouyinMcp('get_douyin_download_link', args);
        return response;
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to get Douyin download link: ${error}`
          }]
        };
      }
    });

    this.registerTool('extract_douyin_text', async (args: any) => {
      try {
        const response = await this.callDouyinMcp('extract_douyin_text', args);
        return response;
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to extract Douyin text: ${error}`
          }]
        };
      }
    });

    this.registerTool('parse_douyin_video_info', async (args: any) => {
      try {
        const response = await this.callDouyinMcp('parse_douyin_video_info', args);
        return response;
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to parse Douyin video info: ${error}`
          }]
        };
      }
    });

    // Xiaohongshu related tools
    this.registerTool('extract_xiaohongshu_text', async (args: any) => {
      try {
        const response = await this.callXiaohongshuMcp('extract_xiaohongshu_text', args);
        return response;
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to extract Xiaohongshu video text: ${error}`
          }]
        };
      }
    });
  }

  // Call real douyin service
  private async callDouyinMcp(toolName: string, args: any): Promise<ToolResult> {
    const { DouyinService } = await import('./douyin');

    // Initialize service with Alibaba Cloud Bailian API key from environment
    const douyinService = new DouyinService({
      apiKey: process.env.BAILIAN_API_KEY || ''
    });

    console.log(`Calling real douyin service tool: ${toolName}`, args);

    try {
      if (toolName === 'get_douyin_download_link') {
        const result = await douyinService.getDownloadLink(args.share_link);
        return {
          content: [{
            type: 'text',
            text: `Douyin video parsed successfully!\n\nTitle: ${result.videoInfo.title}\nAuthor: ${result.videoInfo.author}\nDuration: ${result.videoInfo.duration} seconds\n\nWatermark-free download link: ${result.videoUrl}`
          }],
          extInfo: {
            videoInfo: result.videoInfo,
            downloadUrl: result.videoUrl
          }
        };
      }

      if (toolName === 'extract_douyin_text') {
        const text = await douyinService.extractText(args.share_link, args.model);
        return {
          content: [{
            type: 'text',
            text: `Douyin video text extraction successful!\n\nExtracted text content:\n${text}`
          }],
          extInfo: {
            extractedText: text,
            model: args.model || 'paraformer-v2'
          }
        };
      }

      if (toolName === 'parse_douyin_video_info') {
        const videoInfo = await douyinService.getVideoInfo(args.share_link);
        return {
          content: [{
            type: 'text',
            text: `Douyin video info parsed successfully!\n\nVideo ID: ${videoInfo.videoId}\nTitle: ${videoInfo.title}\nAuthor: ${videoInfo.author}\nDuration: ${videoInfo.duration} seconds\nCover: ${videoInfo.cover}`
          }],
          extInfo: {
            videoInfo
          }
        };
      }

      throw new Error(`Unknown douyin tool: ${toolName}`);

    } catch (error) {
      console.error(`Douyin service error for ${toolName}:`, error);
      throw error;
    }
  }

  // Call real xiaohongshu service
  private async callXiaohongshuMcp(toolName: string, args: any): Promise<ToolResult> {
    const { XiaohongshuService } = await import('./xiaohongshu');

    // Initialize service with Alibaba Cloud Bailian API key from environment
    const xiaohongshuService = new XiaohongshuService({
      apiKey: process.env.BAILIAN_API_KEY || ''
    });

    console.log(`Calling xiaohongshu service tool: ${toolName}`, args);

    try {
      if (toolName === 'extract_xiaohongshu_text') {
        const text = await xiaohongshuService.extractText(args.video_url, args.model);
        return {
          content: [{
            type: 'text',
            text: `Xiaohongshu video text extraction successful!\n\nExtracted text content:\n${text}`
          }],
          extInfo: {
            extractedText: text,
            model: args.model || 'sensevoice-v1'
          }
        };
      }

      throw new Error(`Unknown xiaohongshu tool: ${toolName}`);

    } catch (error) {
      console.error(`Xiaohongshu service error for ${toolName}:`, error);
      throw error;
    }
  }
}

// Create global instance
const mcpToolManager = new McpToolManager();

export default mcpToolManager;
export type { ToolSchema, ToolResult }; 