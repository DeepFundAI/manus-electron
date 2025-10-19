import { BrowserWindow, WebContentsView } from "electron";
import { EkoService } from "./eko-service";

/**
 * Window context
 * Each window has its own independent EkoService and detailView
 */
export interface WindowContext {
  window: BrowserWindow;
  detailView: WebContentsView;
  historyView?: WebContentsView | null;
  ekoService: EkoService;
  webContentsId: number;
  windowType: 'main' | 'scheduled-task'; // Window type
  taskId?: string; // Scheduled task ID (if it's a scheduled task window)
  currentExecutionId?: string; // Current execution ID
}

/**
 * Window context manager
 * Responsible for managing all window contexts, implementing window isolation
 */
export class WindowContextManager {
  private contexts: Map<number, WindowContext> = new Map(); // key: webContents.id
  private taskWindows: Map<string, WindowContext> = new Map(); // key: taskId, for finding windows by task ID

  /**
   * Register window context
   */
  registerWindow(context: WindowContext): void {
    this.contexts.set(context.webContentsId, context);

    // If it's a scheduled task window, also register to taskWindows
    if (context.windowType === 'scheduled-task' && context.taskId) {
      this.taskWindows.set(context.taskId, context);
    }

    console.log(`[WindowContextManager] Window registered: ${context.windowType}, webContentsId: ${context.webContentsId}`);
  }

  /**
   * Get window context by webContentsId
   */
  getContext(webContentsId: number): WindowContext | undefined {
    return this.contexts.get(webContentsId);
  }

  /**
   * Get scheduled task window context by taskId
   */
  getTaskWindowContext(taskId: string): WindowContext | undefined {
    return this.taskWindows.get(taskId);
  }

  /**
   * Check if a task already has a window
   */
  hasTaskWindow(taskId: string): boolean {
    return this.taskWindows.has(taskId);
  }

  /**
   * Update scheduled task window execution ID (when window is reused)
   */
  updateTaskWindowExecution(taskId: string, executionId: string): void {
    const context = this.taskWindows.get(taskId);
    if (context) {
      context.currentExecutionId = executionId;
      console.log(`[WindowContextManager] Task window execution ID updated: taskId=${taskId}, executionId=${executionId}`);
    }
  }

  /**
   * Unregister window context
   */
  unregisterWindow(webContentsId: number): void {
    const context = this.contexts.get(webContentsId);

    if (context) {
      // If it's a scheduled task window, also remove from taskWindows
      if (context.windowType === 'scheduled-task' && context.taskId) {
        this.taskWindows.delete(context.taskId);
      }

      this.contexts.delete(webContentsId);
      console.log(`[WindowContextManager] Window unregistered: ${context.windowType}, webContentsId: ${webContentsId}`);
    }
  }

  /**
   * Get all window contexts
   */
  getAllContexts(): WindowContext[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Get main window context
   */
  getMainWindowContext(): WindowContext | undefined {
    return Array.from(this.contexts.values()).find(ctx => ctx.windowType === 'main');
  }

  /**
   * Clean up all window contexts
   */
  clear(): void {
    this.contexts.clear();
    this.taskWindows.clear();
    console.log('[WindowContextManager] All window contexts cleaned up');
  }
}

// Singleton instance
export const windowContextManager = new WindowContextManager();
