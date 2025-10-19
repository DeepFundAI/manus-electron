import { taskWindowManager } from "./task-window-manager";
import { ipcMain } from "electron";

/**
 * Scheduled task queue item
 */
interface QueuedTask {
  taskId: string;
  taskName: string;
  steps: Array<{ id: string; name: string; content: string; order: number }>;
  scheduledTime: Date;
}

/**
 * Running task
 */
interface RunningTask {
  taskId: string;
  executionId: string;
  startTime: Date;
}

/**
 * Task scheduler
 * Responsible for scheduling and execution management of scheduled tasks
 * Runs in Electron main process
 */
export class TaskScheduler {
  private taskQueue: QueuedTask[] = []; // Task queue waiting for execution
  private runningTasks: Map<string, RunningTask> = new Map(); // Running tasks
  private scheduledTimers: Map<string, NodeJS.Timeout> = new Map(); // Timer mapping
  private isRunning: boolean = false;
  private isInitialized: boolean = false; // Flag if initialized from storage

  constructor() {
    this.setupIpcHandlers();
  }

  /**
   * Setup IPC handlers
   */
  private setupIpcHandlers(): void {
    // Start scheduler
    ipcMain.handle('scheduler:start', async () => {
      return this.start();
    });

    // Stop scheduler
    ipcMain.handle('scheduler:stop', async () => {
      return this.stop();
    });

    // Add scheduled task
    ipcMain.handle('scheduler:add-task', async (event, task: any) => {
      return this.scheduleTask(task);
    });

    // Remove scheduled task
    ipcMain.handle('scheduler:remove-task', async (event, taskId: string) => {
      return this.removeScheduledTask(taskId);
    });

    // Execute task immediately
    ipcMain.handle('scheduler:execute-now', async (event, task: any) => {
      return this.executeTaskNow(task);
    });

    // Get queue status
    ipcMain.handle('scheduler:get-status', async () => {
      return {
        isRunning: this.isRunning,
        queueLength: this.taskQueue.length,
        runningCount: this.runningTasks.size,
        scheduledCount: this.scheduledTimers.size
      };
    });

    // Check if initialized
    ipcMain.handle('scheduler:is-initialized', async () => {
      return this.isInitialized;
    });

    // Mark as initialized
    ipcMain.handle('scheduler:mark-initialized', async () => {
      this.isInitialized = true;
      console.log('[TaskScheduler] Marked as initialized');
      return { success: true };
    });
  }

  /**
   * Start scheduler
   */
  start(): { success: boolean; message: string } {
    if (this.isRunning) {
      return { success: false, message: 'Scheduler is already running' };
    }

    this.isRunning = true;
    console.log('[TaskScheduler] Scheduler started');

    return { success: true, message: 'Scheduler started successfully' };
  }

  /**
   * Stop scheduler
   */
  stop(): { success: boolean; message: string } {
    if (!this.isRunning) {
      return { success: false, message: 'Scheduler is not running' };
    }

    // Clear all timers
    this.scheduledTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.scheduledTimers.clear();

    // Clear queue
    this.taskQueue = [];

    this.isRunning = false;
    console.log('[TaskScheduler] Scheduler stopped');

    return { success: true, message: 'Scheduler stopped successfully' };
  }

  /**
   * Schedule a timed task
   * @param task Task configuration
   */
  scheduleTask(task: any): { success: boolean; message: string; nextExecuteAt?: Date } {
    if (!this.isRunning) {
      return { success: false, message: 'Scheduler not started' };
    }

    const { id, name, steps, schedule } = task;

    // Calculate next execution time
    const nextExecuteAt = this.calculateNextExecuteTime(schedule);

    if (!nextExecuteAt) {
      return { success: false, message: 'Invalid schedule configuration' };
    }

    // Calculate delay time
    const delay = nextExecuteAt.getTime() - Date.now();

    if (delay < 0) {
      return { success: false, message: 'Calculated execution time has expired' };
    }

    // Clear old timer (prevent duplicate registration)
    const existingTimer = this.scheduledTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      console.log(`[TaskScheduler] Cleared old timer for task ${name} to avoid duplicate execution`);
    }

    // Create timer
    const timer = setTimeout(() => {
      this.executeTask(id, name, steps);
      this.scheduledTimers.delete(id);

      // If it's a periodic task, reschedule
      if (schedule.type === 'interval') {
        this.scheduleTask(task);
      }
    }, delay);

    // Save timer
    this.scheduledTimers.set(id, timer);

    console.log(`[TaskScheduler] Task ${name} scheduled, next execution time: ${nextExecuteAt.toLocaleString()}`);

    return { success: true, message: 'Task scheduled successfully', nextExecuteAt };
  }

  /**
   * Remove scheduled task
   * @param taskId Task ID
   */
  removeScheduledTask(taskId: string): { success: boolean; message: string } {
    const timer = this.scheduledTimers.get(taskId);

    if (!timer) {
      return { success: false, message: 'Task schedule not found' };
    }

    clearTimeout(timer);
    this.scheduledTimers.delete(taskId);

    console.log(`[TaskScheduler] Task ${taskId} schedule removed`);

    return { success: true, message: 'Task schedule removed' };
  }

  /**
   * Execute task immediately
   * @param task Task configuration
   */
  async executeTaskNow(task: any): Promise<{ success: boolean; message: string; executionId?: string }> {
    const { id, name, steps } = task;
    return this.executeTask(id, name, steps);
  }

  /**
   * Execute task
   * @param taskId Task ID
   * @param taskName Task name
   * @param steps Task steps
   */
  private async executeTask(
    taskId: string,
    taskName: string,
    steps: Array<{ id: string; name: string; content: string; order: number }>
  ): Promise<{ success: boolean; message: string; executionId?: string }> {
    try {
      // Check if new task can be executed
      if (!taskWindowManager.canRunNewTask()) {
        // Add to queue
        this.taskQueue.push({
          taskId,
          taskName,
          steps,
          scheduledTime: new Date()
        });

        console.log(`[TaskScheduler] Task ${taskName} added to queue, current running tasks: ${taskWindowManager.getRunningTaskCount()}`);

        return { success: true, message: 'Task added to queue' };
      }

      // Execute task
      const executionId = this.generateExecutionId();
      await this.runTaskInNewWindow(taskId, taskName, steps, executionId);

      return { success: true, message: 'Task execution started', executionId };
    } catch (error: any) {
      console.error('[TaskScheduler] Failed to execute task:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Run task in new window
   */
  private async runTaskInNewWindow(
    taskId: string,
    taskName: string,
    steps: Array<{ id: string; name: string; content: string; order: number }>,
    executionId: string
  ): Promise<void> {
    try {
      console.log(`[TaskScheduler] Starting task execution: ${taskName} (${executionId})`);

      // Create task-dedicated window
      const { window, ekoService } = await taskWindowManager.createTaskWindow(taskId, executionId);

      // Record running task
      this.runningTasks.set(executionId, {
        taskId,
        executionId,
        startTime: new Date()
      });

      // Notify renderer process that task has started
      window.webContents.send('task-execution-start', {
        taskId,
        taskName,
        executionId,
        steps
      });

      // Combine steps into complete task description
      const taskPrompt = this.buildTaskPrompt(steps);

      // Execute task
      const result = await ekoService.run(taskPrompt);

      console.log(`[TaskScheduler] Task execution completed: ${taskName}`, result?.stopReason);

      // Notify renderer process task completion, save execution history
      window.webContents.send('task-execution-complete', {
        taskId,
        taskName,
        executionId,
        status: result?.stopReason || 'done',
        endTime: new Date()
      });

      // No longer auto-close window, let user view results and history
      // Remove from running tasks list
      this.runningTasks.delete(executionId);

      // Process next task in queue
      this.processQueue();

    } catch (error) {
      console.error('[TaskScheduler] Task execution failed:', error);

      // No longer auto-close window, let user view error info
      // Remove from running tasks list
      this.runningTasks.delete(executionId);

      // Process next task in queue
      this.processQueue();
    }
  }

  /**
   * Combine step list into task prompt
   */
  private buildTaskPrompt(steps: Array<{ id: string; name: string; content: string; order: number }>): string {
    const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
    const stepTexts = sortedSteps.map((step, index) => `${index + 1}. ${step.content}`).join('\n');

    return `Please execute the task following these steps:\n${stepTexts}`;
  }

  /**
   * Process tasks in queue
   */
  private async processQueue(): Promise<void> {
    if (this.taskQueue.length > 0 && taskWindowManager.canRunNewTask()) {
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        console.log(`[TaskScheduler] Retrieving task from queue: ${nextTask.taskName}`);
        const executionId = this.generateExecutionId();
        await this.runTaskInNewWindow(nextTask.taskId, nextTask.taskName, nextTask.steps, executionId);
      }
    }
  }

  /**
   * Calculate next execution time
   */
  private calculateNextExecuteTime(schedule: any): Date | null {
    const now = new Date();

    if (schedule.type === 'interval') {
      const { intervalUnit, intervalValue } = schedule;

      if (!intervalUnit || !intervalValue) {
        return null;
      }

      let milliseconds = 0;

      switch (intervalUnit) {
        case 'minute':
          milliseconds = intervalValue * 60 * 1000;
          break;
        case 'hour':
          milliseconds = intervalValue * 60 * 60 * 1000;
          break;
        case 'day':
          milliseconds = intervalValue * 24 * 60 * 60 * 1000;
          break;
        default:
          return null;
      }

      return new Date(now.getTime() + milliseconds);
    }

    // TODO: Support cron expressions
    if (schedule.type === 'cron') {
      console.warn('[TaskScheduler] Cron expressions not yet supported');
      return null;
    }

    return null;
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get scheduler status (synchronous method, for tray use)
   */
  getStatus(): {
    isRunning: boolean;
    queueLength: number;
    runningCount: number;
    scheduledCount: number;
  } {
    return {
      isRunning: this.isRunning,
      queueLength: this.taskQueue.length,
      runningCount: this.runningTasks.size,
      scheduledCount: this.scheduledTimers.size
    };
  }

  /**
   * Destroy scheduler
   */
  destroy(): void {
    this.stop();
    this.runningTasks.clear();
    console.log('[TaskScheduler] Scheduler destroyed');
  }
}

// Singleton instance
export const taskScheduler = new TaskScheduler();
