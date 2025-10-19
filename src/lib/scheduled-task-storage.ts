import { ScheduledTask } from '@/models';

/**
 * Scheduled task configuration storage utility class
 * Based on IndexedDB for storing scheduled task configuration information
 * Note: Execution history is uniformly stored in the Task table of aif10-agent database
 */
export class ScheduledTaskStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'aif10-scheduled-tasks'; // Use independent database name
  private readonly DB_VERSION = 1; // Use version 1
  private readonly SCHEDULED_TASKS_STORE = 'scheduled_tasks';
  private initPromise: Promise<void> | null = null; // Prevent concurrent initialization

  /**
   * Initialize database connection
   * Use singleton pattern to prevent conflicts from concurrent initialization
   */
  async init(): Promise<void> {
    // If database is already open, return directly
    if (this.db) {
      return Promise.resolve();
    }

    // If initializing, return existing Promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // Create new initialization Promise
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        this.initPromise = null; // Reset to allow retry
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Listen for unexpected close
        this.db.onversionchange = () => {
          console.warn('[ScheduledTaskStorage] Database version changed, closing connection');
          this.db?.close();
          this.db = null;
          this.initPromise = null;
        };

        // Listen for abnormal close
        this.db.onclose = () => {
          console.warn('[ScheduledTaskStorage] Database connection closed');
          this.db = null;
          this.initPromise = null;
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create scheduled task configuration storage object
        if (!db.objectStoreNames.contains(this.SCHEDULED_TASKS_STORE)) {
          const scheduledTasksStore = db.createObjectStore(this.SCHEDULED_TASKS_STORE, { keyPath: 'id' });
          scheduledTasksStore.createIndex('enabled', 'enabled', { unique: false });
          scheduledTasksStore.createIndex('createdAt', 'createdAt', { unique: false });
          scheduledTasksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          scheduledTasksStore.createIndex('nextExecuteAt', 'nextExecuteAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // ==================== Scheduled task operations ====================

  /**
   * Save scheduled task
   */
  async saveScheduledTask(task: ScheduledTask): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.SCHEDULED_TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(this.SCHEDULED_TASKS_STORE);

      const request = store.put({
        ...task,
        createdAt: task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt),
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt),
        lastExecutedAt: task.lastExecutedAt ? (task.lastExecutedAt instanceof Date ? task.lastExecutedAt : new Date(task.lastExecutedAt)) : undefined,
        nextExecuteAt: task.nextExecuteAt ? (task.nextExecuteAt instanceof Date ? task.nextExecuteAt : new Date(task.nextExecuteAt)) : undefined,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get single scheduled task
   */
  async getScheduledTask(taskId: string): Promise<ScheduledTask | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.SCHEDULED_TASKS_STORE], 'readonly');
      const store = transaction.objectStore(this.SCHEDULED_TASKS_STORE);
      const request = store.get(taskId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          result.createdAt = new Date(result.createdAt);
          result.updatedAt = new Date(result.updatedAt);
          if (result.lastExecutedAt) result.lastExecutedAt = new Date(result.lastExecutedAt);
          if (result.nextExecuteAt) result.nextExecuteAt = new Date(result.nextExecuteAt);
        }
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all scheduled tasks
   * Optimization: Use getAll() instead of cursor traversal to improve performance
   */
  async getAllScheduledTasks(): Promise<ScheduledTask[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.SCHEDULED_TASKS_STORE], 'readonly');
      const store = transaction.objectStore(this.SCHEDULED_TASKS_STORE);

      // Use getAll() instead of cursor, faster
      const request = store.getAll();

      request.onsuccess = () => {
        const tasks = request.result.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          lastExecutedAt: task.lastExecutedAt ? new Date(task.lastExecutedAt) : undefined,
          nextExecuteAt: task.nextExecuteAt ? new Date(task.nextExecuteAt) : undefined,
        }));

        // Sort by updatedAt in descending order
        tasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        resolve(tasks);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all enabled scheduled tasks
   */
  async getEnabledScheduledTasks(): Promise<ScheduledTask[]> {
    const allTasks = await this.getAllScheduledTasks();
    return allTasks.filter(task => task.enabled);
  }

  /**
   * Delete scheduled task
   */
  async deleteScheduledTask(taskId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.SCHEDULED_TASKS_STORE], 'readwrite');
      const store = transaction.objectStore(this.SCHEDULED_TASKS_STORE);
      const request = store.delete(taskId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update scheduled task
   */
  async updateScheduledTask(taskId: string, updates: Partial<ScheduledTask>): Promise<void> {
    const task = await this.getScheduledTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const updatedTask: ScheduledTask = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };

    await this.saveScheduledTask(updatedTask);
  }

  /**
   * Close database connection
   * Note: It is not recommended to call this method manually unless you are sure the database is no longer needed
   * Database connection will be automatically re-established when needed
   */
  close(): void {
    if (this.db) {
      console.log('[ScheduledTaskStorage] Closing database connection');
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Check database connection status
   */
  isConnected(): boolean {
    return this.db !== null;
  }
}

// Singleton instance
export const scheduledTaskStorage = new ScheduledTaskStorage();

// Close connection on page unload (optional, IndexedDB will auto-manage)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    scheduledTaskStorage.close();
  });
}
