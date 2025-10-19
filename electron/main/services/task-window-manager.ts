import { BrowserWindow, dialog, WebContentsView } from "electron";
import { EkoService } from "./eko-service";
import { windowContextManager, type WindowContext } from "./window-context-manager";
import { createWindow } from '../ui/window';
import { createView } from "../ui/view";


/**
 * Task execution context
 */
interface TaskWindowContext {
  window: BrowserWindow;
  view: WebContentsView;
  ekoService: EkoService;
  taskId: string;
  executionId: string;
  createdAt: Date;
}

/**
 * Task window manager
 * Responsible for creating and managing independent execution windows for scheduled tasks
 * Manages windows by taskId, supports window reuse
 */
export class TaskWindowManager {
  private taskWindows: Map<string, TaskWindowContext> = new Map(); // Manage by taskId
  private maxConcurrentTasks: number = 3; // Maximum concurrent tasks

  /**
   * Create or reuse execution window for task
   * @param taskId Task ID
   * @param executionId Execution ID
   * @returns Window context
   */
  async createTaskWindow(taskId: string, executionId: string): Promise<TaskWindowContext> {
    // Check if window for this task already exists (window reuse)
    const existingContext = this.taskWindows.get(taskId);

    if (existingContext) {
      console.log(`[TaskWindowManager] Reusing existing window: taskId=${taskId}`);

      // Terminate currently executing task
      if (existingContext.executionId) {
        console.log(`[TaskWindowManager] Terminating old task: executionId=${existingContext.executionId}`);
        try {
          await existingContext.ekoService.cancleTask(existingContext.executionId);
        } catch (error) {
          console.error('[TaskWindowManager] Failed to terminate old task:', error);
        }
      }

      // Update execution ID
      existingContext.executionId = executionId;

      // Reload page with new executionId (keep original loadURL format)
      existingContext.window.loadURL(`http://localhost:5173/main?taskId=${taskId}&executionId=${executionId}`);

      // Focus window
      existingContext.window.show();
      existingContext.window.focus();

      return existingContext;
    }

    // Check concurrency limit (only for new windows)
    if (this.taskWindows.size >= this.maxConcurrentTasks) {
      throw new Error(`Maximum concurrent tasks reached (${this.maxConcurrentTasks})`);
    }

    console.log(`[TaskWindowManager] Creating new window: taskId=${taskId}, executionId=${executionId}`);

    // Create new window (keep original loadURL format)
    const taskWindow = createWindow(`http://localhost:5173/main?taskId=${taskId}&executionId=${executionId}`)

    // Create detailView
    const detailView = createView(`https://www.google.com`, "view", '2');

    // Set detailView position and size
    taskWindow.contentView.addChildView(detailView);
    detailView.setBounds({
      x: 818,
      y: 264,
      width: 748,
      height: 560,
    });

    // Set detailView hidden by default
    detailView.setVisible(false);

    detailView.webContents.setWindowOpenHandler(({url}) => {
        detailView.webContents.loadURL(url);
        return {
          action: "deny",
        }
      })

    // Listen for detail view URL changes
    detailView.webContents.on('did-navigate', (_event, url) => {
      console.log('detail view did-navigate:', url);
      taskWindow?.webContents.send('url-changed', url);
    });

    detailView.webContents.on('did-navigate-in-page', (_event, url) => {
      console.log('detail view did-navigate-in-page:', url);
      taskWindow?.webContents.send('url-changed', url);
    });

    // Create independent EkoService instance for this window
    const ekoService = new EkoService(taskWindow, detailView);

    // Ensure window is visible
    taskWindow.show();
    taskWindow.focus();

    // Create context
    const context: TaskWindowContext = {
      window: taskWindow,
      view: detailView,
      ekoService,
      taskId,
      executionId,
      createdAt: new Date()
    };

    // Record window by taskId (instead of executionId)
    this.taskWindows.set(taskId, context);

    // Also register to windowContextManager
    const windowContext: WindowContext = {
      window: taskWindow,
      detailView,
      historyView: null,
      ekoService,
      webContentsId: taskWindow.webContents.id,
      windowType: 'scheduled-task',
      taskId,
      currentExecutionId: executionId
    };
    windowContextManager.registerWindow(windowContext);

    // Listen for window close event (close: triggered before closing, can be prevented)
    // Check task status, prompt user
    taskWindow.on('close', async (event) => {
      // Check if any task is running
      const hasRunningTask = ekoService.hasRunningTask();

      if (hasRunningTask) {
        // Prevent default close behavior
        event.preventDefault();

        // Show confirmation dialog
        const { response } = await dialog.showMessageBox(taskWindow, {
          type: 'warning',
          title: 'Scheduled Task Running',
          message: 'A scheduled task is currently executing. Closing the window will terminate the task',
          detail: 'Please choose an action:',
          buttons: ['Cancel', 'Stop Task and Close'],
          defaultId: 0,
          cancelId: 0
        });

        if (response === 1) {
          // Stop task and close
          console.log(`[TaskWindowManager] User chose to stop task: taskId=${taskId}`);

          // Get all task IDs
          const allTaskIds = ekoService['eko']?.getAllTaskId() || [];

          // Abort all tasks
          await ekoService.abortAllTasks();

          // Send abort event (frontend will listen and update IndexedDB)
          allTaskIds.forEach(tid => {
            taskWindow.webContents.send('task-aborted-by-system', {
              taskId: tid,
              reason: 'User closed scheduled task window, task terminated',
              timestamp: new Date().toISOString()
            });
          });

          // Delay to ensure message delivery and processing
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Actually close window
          taskWindow.destroy();
        }
        // response === 0: cancel close, do nothing
      }
      // No task running, allow closing
    });

    // Clean up on window close
    taskWindow.on('closed', () => {
      console.log(`[TaskWindowManager] Window closed event triggered: taskId=${taskId}`);

      // Remove from taskWindows
      this.taskWindows.delete(taskId);

      // Safely unregister window context (check if webContents is destroyed)
      try {
        if (!taskWindow.isDestroyed() && taskWindow.webContents) {
          windowContextManager.unregisterWindow(taskWindow.webContents.id);
        }
      } catch (error) {
        console.error('[TaskWindowManager] Failed to unregister window context:', error);
      }

      console.log(`[TaskWindowManager] Window cleanup completed: taskId=${taskId}, remaining windows: ${this.taskWindows.size}`);
    });

    console.log(`[TaskWindowManager] Window created successfully: taskId=${taskId}, current windows: ${this.taskWindows.size}`);

    return context;
  }

  /**
   * Close task window (by taskId)
   * @param taskId Task ID
   */
  async closeTaskWindow(taskId: string): Promise<void> {
    const context = this.taskWindows.get(taskId);
    if (!context) {
      console.warn(`[TaskWindowManager] Task window not found: taskId=${taskId}`);
      return;
    }

    if (!context.window.isDestroyed()) {
      context.window.close();
    }

    console.log(`[TaskWindowManager] Task window closed: taskId=${taskId}`);
  }

  /**
   * Get task window context (by taskId)
   * @param taskId Task ID
   */
  getTaskWindow(taskId: string): TaskWindowContext | undefined {
    return this.taskWindows.get(taskId);
  }

  /**
   * Get current number of executing tasks
   */
  getRunningTaskCount(): number {
    return this.taskWindows.size;
  }

  /**
   * Check if new task can be executed
   */
  canRunNewTask(): boolean {
    return this.taskWindows.size < this.maxConcurrentTasks;
  }

  /**
   * Set maximum concurrent tasks
   * @param max Maximum concurrency (1-5)
   */
  setMaxConcurrentTasks(max: number): void {
    if (max < 1 || max > 5) {
      throw new Error('Maximum concurrent tasks must be between 1-5');
    }
    this.maxConcurrentTasks = max;
    console.log(`[TaskWindowManager] Max concurrent tasks set to ${max}`);
  }

  /**
   * Get all running tasks
   */
  getRunningTasks(): Array<{ taskId: string; executionId: string; createdAt: Date }> {
    return Array.from(this.taskWindows.values()).map(ctx => ({
      taskId: ctx.taskId,
      executionId: ctx.executionId,
      createdAt: ctx.createdAt
    }));
  }

  /**
   * Close all task windows
   */
  closeAllTaskWindows(): void {
    console.log(`[TaskWindowManager] Closing all task windows (${this.taskWindows.size})`);

    Array.from(this.taskWindows.values()).forEach((context) => {
      if (!context.window.isDestroyed()) {
        context.window.close();
      }
    });

    this.taskWindows.clear();
  }

  /**
   * Destroy manager
   */
  destroy(): void {
    this.closeAllTaskWindows();
  }
}

// Singleton instance
export const taskWindowManager = new TaskWindowManager();
