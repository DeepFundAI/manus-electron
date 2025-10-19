import { Eko, Log, SimpleSseMcpClient, type LLMs, type StreamCallbackMessage } from "@jarvis-agent/core";
import { BrowserAgent, FileAgent } from "@jarvis-agent/electron";
import type { EkoResult } from "@jarvis-agent/core/types";
import { BrowserWindow, WebContentsView, app } from "electron";
import path from "node:path";

export class EkoService {
  private eko: Eko | null = null;
  private mainWindow: BrowserWindow;
  private detailView: WebContentsView;

  constructor(mainWindow: BrowserWindow, detailView: WebContentsView) {
    this.mainWindow = mainWindow;
    this.detailView = detailView;
    this.initializeEko();
  }

  private initializeEko() {
    console.log(process.env)
    // LLMs configuration - read from environment variables
    const llms: LLMs = {
      default: {
        provider: "deepseek",
        model: "deepseek-chat",
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        config: {
          baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
          maxTokens: 8192,
          mode: 'regular',
        },

        fetch: (url, options) => {
          // Intercept request and add thinking parameter
          const body = JSON.parse((options?.body as string) || '{}');
          body.thinking = { type: "disabled" };

          Log.info('Deepseek request options:\n', body);

          return fetch(url, {
            ...options,
            body: JSON.stringify(body)
          });
        }
      },
      "qwen-vl": {
        provider: "openai",
        model: "qwen-vl-max-2025-08-13",
        apiKey: process.env.BAILIAN_API_KEY || "", // Use Bailian API key from environment
        config: {
          baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
          maxTokens: 16000,
          timeout: 60000,
          temperature: 0.7
        },
        fetch: (url, options) => {
          Log.info('Vision model request parameters', options)
          return fetch(url, options);
        }
      },
      'open-router': {
        provider: "openrouter",
        model: "openai/gpt-5-mini",
        apiKey: process.env.OPENROUTER_API_KEY || "",
        config: {
          // baseURL: "https://openai-proxy.awsv.cn/v1",
        },
    },
    };

    // Get correct application path
    const appPath = app.isPackaged
      ? path.join(app.getPath('userData'), 'static')  // Packaged path
      : path.join(process.cwd(), 'public', 'static');    // Development environment path

    Log.info(`FileAgent working path: ${appPath}`);

    // MCP client configuration - configure based on your MCP server address
    const sseUrl = "http://localhost:5173/api/mcp/sse";
    let mcpClient = new SimpleSseMcpClient(sseUrl);

    const echartMcpUrl = "http://localhost:3033/sse";
    const echartMcpClient = new SimpleSseMcpClient(echartMcpUrl);



    // Create agents - can now use FileAgent since we're in Node.js environment
    const agents = [new BrowserAgent(this.detailView, mcpClient), new FileAgent(this.detailView, appPath)];

    // Stream callback handler
    const callback = {
      onMessage: (message: StreamCallbackMessage): Promise<void> => {
        Log.info('EkoService stream callback:', message);

        // Window destroyed, return directly to avoid errors
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
          Log.warn('Main window destroyed, skipping message processing');
          return Promise.resolve();
        }

        return new Promise((resolve) => {
           // Send stream message to renderer process via IPC
        this.mainWindow.webContents.send('eko-stream-message', message);

        // When file is modified, main view window loads file content display page
        if (message.type === 'tool_streaming' && message.toolName === 'file_write') {

          let args;
          try {
            args = JSON.parse(message.paramsText);
          } catch (error) {
            Log.error('File stream incomplete! Need to complete')
          }

          try {
            args = JSON.parse(`${message.paramsText}\"}`);
          } catch (error) {
            Log.error('File stream completion failed!');
          }

          if (args && args.content) {
            Log.info('File write detected, loading file-view in mainView', args.content);
            const url = this.detailView.webContents.getURL();
            Log.info('current URL', url, !url.includes('file-view'))
            if (!url.includes('file-view')) {
              this.detailView.webContents.loadURL(`http://localhost:5173/file-view`);
              this.detailView.webContents.once('did-finish-load', () => {
                this.detailView.webContents.send('file-updated', 'code', args.content);
                resolve();
              });
            } else {
              this.detailView.webContents.send('file-updated',  'code', args.content);
              resolve();
            }
          } else {
            resolve();
          }
        } else {
          resolve();
        }
        })  
      },
      onHuman: (message: any) => {
        console.log('EkoService human callback:', message);
      }
    };

    // Initialize Eko instance
    this.eko = new Eko({ llms, agents, callback });
    console.log('EkoService initialized with FileAgent support');
  }

  /**
   * Run new task
   */
  async run(message: string): Promise<EkoResult | null> {
    if (!this.eko) {
      throw new Error('Eko service not initialized');
    }
    
    console.log('EkoService running task:', message);
    let result = null;
    try {
      result = await this.eko.run(message);
    } catch (error) {
      Log.error('EkoService run error:', error);
    }
    return result;
  }

  /**
   * Modify existing task
   */
  async modify(taskId: string, message: string): Promise<EkoResult | null> {
    if (!this.eko) {
      throw new Error('Eko service not initialized');
    }
    let result = null;
    try {
      await this.eko.modify(taskId, message);
      result = await this.eko.execute(taskId);
    } catch (error) {
      Log.error('EkoService modify error:', error);
    }
    return result;
  }

  /**
   * Execute task
   */
  async execute(taskId: string): Promise<EkoResult> {
    if (!this.eko) {
      throw new Error('Eko service not initialized');
    }

    console.log('EkoService executing task:', taskId);
    return await this.eko.execute(taskId);
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<any> {
    if (!this.eko) {
      throw new Error('Eko service not initialized');
    }

    // If Eko has a method to get task status, it can be called here
    // return await this.eko.getTaskStatus(taskId);
    console.log('EkoService getting task status:', taskId);
    return { taskId, status: 'unknown' };
  }

  /**
   * Cancel task
   */
  async cancleTask(taskId: string): Promise<any> {
    if (!this.eko) {
      throw new Error('Eko service not initialized');
    }

    const res = await this.eko.abortTask(taskId, 'cancle');
    return res;
  }

  /**
   * Check if any task is running
   */
  hasRunningTask(): boolean {
    if (!this.eko) {
      return false;
    }

    const allTaskIds = this.eko.getAllTaskId();

    // Iterate through all tasks, check if any task is not terminated
    for (const taskId of allTaskIds) {
      const context = this.eko.getTask(taskId);
      if (context && !context.controller.signal.aborted) {
        // Task exists and not terminated, meaning it may be running
        return true;
      }
    }

    return false;
  }

  /**
   * Abort all running tasks
   */
  async abortAllTasks(): Promise<void> {
    if (!this.eko) {
      return;
    }

    const allTaskIds = this.eko.getAllTaskId();
    const abortPromises = allTaskIds.map(taskId => this.eko!.abortTask(taskId, 'window-closing'));

    await Promise.all(abortPromises);
    Log.info('All tasks aborted');
  }

  /**
   * Destroy service
   */
  destroy() {
    console.log('EkoService destroyed');
    this.eko = null;
  }
}