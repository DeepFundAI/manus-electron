import { Eko, Log, SimpleSseMcpClient, type LLMs, type StreamCallbackMessage } from "@jarvis-agent/core";
import { BrowserAgent, FileAgent } from "@jarvis-agent/electron";
import type { EkoResult } from "@jarvis-agent/core/types";
import { BrowserWindow, WebContentsView, app } from "electron";
import path from "node:path";
import { ConfigManager } from "../utils/config-manager";

export class EkoService {
  private eko: Eko | null = null;
  private mainWindow: BrowserWindow;
  private detailView: WebContentsView;
  private mcpClient!: SimpleSseMcpClient;
  private agents!: any[];

  constructor(mainWindow: BrowserWindow, detailView: WebContentsView) {
    this.mainWindow = mainWindow;
    this.detailView = detailView;
    this.initializeEko();
  }

  /**
   * Create stream callback handler
   */
  private createCallback() {
    return {
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
  }

  private initializeEko() {
    // Get LLMs configuration from ConfigManager
    // Priority: user config > env > default
    const configManager = ConfigManager.getInstance();
    const llms: LLMs = configManager.getLLMsConfig();

    // Get correct application path
    const appPath = app.isPackaged
      ? path.join(app.getPath('userData'), 'static')  // Packaged path
      : path.join(process.cwd(), 'public', 'static');    // Development environment path

    Log.info(`FileAgent working path: ${appPath}`);

    // MCP client configuration - configure based on your MCP server address
    const sseUrl = "http://localhost:5173/api/mcp/sse";
    this.mcpClient = new SimpleSseMcpClient(sseUrl);

    // Create agents - can now use FileAgent since we're in Node.js environment
    this.agents = [new BrowserAgent(this.detailView, this.mcpClient), new FileAgent(this.detailView, appPath)];

    // Create callback and initialize Eko instance
    const callback = this.createCallback();
    this.eko = new Eko({ llms, agents: this.agents, callback });
    Log.info('EkoService initialized with LLMs:', llms.default?.model);
  }

  /**
   * Reload LLM configuration and reinitialize Eko instance
   * Called when user changes model configuration in UI
   */
  public reloadConfig(): void {
    Log.info('Reloading EkoService configuration...');

    // Abort all running tasks before reloading
    if (this.eko) {
      const allTaskIds = this.eko.getAllTaskId();
      allTaskIds.forEach(taskId => {
        try {
          this.eko!.abortTask(taskId, 'config-reload');
        } catch (error) {
          Log.error(`Failed to abort task ${taskId}:`, error);
        }
      });
    }

    // Get new LLMs configuration
    const configManager = ConfigManager.getInstance();
    const llms: LLMs = configManager.getLLMsConfig();

    Log.info('New LLMs config:', llms.default?.model);

    // Create new Eko instance with updated config and fresh callback
    const callback = this.createCallback();
    this.eko = new Eko({ llms, agents: this.agents, callback });

    Log.info('EkoService configuration reloaded successfully');

    // Notify frontend about config reload
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('eko-config-reloaded', {
      model: llms.default?.model,
      provider: llms.default?.provider
    });
  }

  /**
   * Run new task
   */
  async run(message: string): Promise<EkoResult | null> {
    if (!this.eko) {
      const errorMsg = 'Eko service not initialized';
      Log.error(errorMsg);
      this.sendErrorToFrontend(errorMsg);
      return null;
    }

    console.log('EkoService running task:', message);
    let result = null;
    try {
      result = await this.eko.run(message);
    } catch (error: any) {
      Log.error('EkoService run error:', error);

      // Extract error message
      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      this.sendErrorToFrontend(errorMessage, error);
    }
    return result;
  }

  /**
   * Send error message to frontend
   */
  private sendErrorToFrontend(errorMessage: string, error?: any, taskId?: string): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      Log.warn('Main window destroyed, cannot send error message');
      return;
    }

    this.mainWindow.webContents.send('eko-stream-message', {
      type: 'error',
      error: errorMessage,
      detail: error?.stack || error?.toString() || errorMessage,
      taskId: taskId // Include taskId if available
    });
  }

  /**
   * Modify existing task
   */
  async modify(taskId: string, message: string): Promise<EkoResult | null> {
    if (!this.eko) {
      const errorMsg = 'Eko service not initialized';
      Log.error(errorMsg);
      this.sendErrorToFrontend(errorMsg, undefined, taskId);
      return null;
    }

    let result = null;
    try {
      await this.eko.modify(taskId, message);
      result = await this.eko.execute(taskId);
    } catch (error: any) {
      Log.error('EkoService modify error:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to modify task';
      this.sendErrorToFrontend(errorMessage, error, taskId);
    }
    return result;
  }

  /**
   * Execute task
   */
  async execute(taskId: string): Promise<EkoResult | null> {
    if (!this.eko) {
      const errorMsg = 'Eko service not initialized';
      Log.error(errorMsg);
      this.sendErrorToFrontend(errorMsg, undefined, taskId);
      return null;
    }

    console.log('EkoService executing task:', taskId);
    try {
      return await this.eko.execute(taskId);
    } catch (error: any) {
      Log.error('EkoService execute error:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to execute task';
      this.sendErrorToFrontend(errorMessage, error, taskId);
      return null;
    }
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