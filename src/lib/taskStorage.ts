import { Task } from '@/models';

/**
 * IndexedDB task storage utility class
 * Database name: aif10-agent
 */
export class TaskStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'aif10-agent';
  private readonly DB_VERSION = 3; // Upgrade version to support scheduled task execution history
  private readonly STORE_NAME = 'tasks';

  /**
   * Initialize database connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Create task storage object
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });

          // Create basic indexes
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('name', 'name', { unique: false });

          // New: indexes for scheduled task execution history
          store.createIndex('taskType', 'taskType', { unique: false });
          store.createIndex('scheduledTaskId', 'scheduledTaskId', { unique: false });
          store.createIndex('startTime', 'startTime', { unique: false });
        } else if (oldVersion < 3) {
          // Version upgrade: add scheduled task related indexes
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          const store = transaction?.objectStore(this.STORE_NAME);

          if (store && !store.indexNames.contains('taskType')) {
            store.createIndex('taskType', 'taskType', { unique: false });
          }
          if (store && !store.indexNames.contains('scheduledTaskId')) {
            store.createIndex('scheduledTaskId', 'scheduledTaskId', { unique: false });
          }
          if (store && !store.indexNames.contains('startTime')) {
            store.createIndex('startTime', 'startTime', { unique: false });
          }
        }
      };
    });
  }

  /**
   * Save task
   */
  async saveTask(task: Task): Promise<void> {
    try {
      await this.init();
      if (!this.db) {
        throw new Error('Database not properly initialized');
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
          const store = transaction.objectStore(this.STORE_NAME);

          const request = store.put({
            ...task,
            createdAt: task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt),
            updatedAt: task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt),
          });

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          transaction.onerror = () => reject(transaction.error);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('saveTask error:', error);
      throw error;
    }
  }

  /**
   * Get single task
   */
  async getTask(taskId: string): Promise<Task | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(taskId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Ensure date fields are properly converted
          result.createdAt = new Date(result.createdAt);
          result.updatedAt = new Date(result.updatedAt);
        }
        resolve(result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all tasks list, sorted by update time in descending order
   * Optimization: Use getAll() instead of cursor traversal to improve performance and reduce transaction lock time
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      await this.init();
      if (!this.db) {
        throw new Error('Database not properly initialized');
      }

      // Add timeout mechanism to prevent permanent hang
      return Promise.race([
        this._getAllTasksInternal(),
        this._timeout(10000, 'Get task list timeout') // 10 second timeout
      ]);
    } catch (error) {
      console.error('getAllTasks error:', error);
      // If database has issues, return empty array instead of throwing error
      return [];
    }
  }

  /**
   * Internal method: actually get all tasks
   */
  private _getAllTasksInternal(): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);

        // Use getAll() instead of cursor, faster and shorter transaction time
        const request = store.getAll();

        request.onsuccess = () => {
          const tasks = request.result.map((task: any) => ({
            ...task,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
            startTime: task.startTime ? new Date(task.startTime) : undefined,
            endTime: task.endTime ? new Date(task.endTime) : undefined,
          }));

          // Sort by updatedAt in descending order
          tasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

          resolve(tasks);
        };

        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Timeout helper function
   */
  private _timeout(ms: number, message: string): Promise<never> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        console.error(message);
        resolve([] as never);
      }, ms);
    });
  }

  /**
   * Get paginated task list
   */
  async getTasksPaginated(limit: number = 20, offset: number = 0): Promise<{
    tasks: Task[];
    total: number;
    hasMore: boolean;
  }> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const [tasks, total] = await Promise.all([
      this.getTasksWithPagination(limit, offset),
      this.getTotalTasksCount()
    ]);

    return {
      tasks,
      total,
      hasMore: offset + limit < total
    };
  }

  /**
   * Search tasks
   */
  async searchTasks(keyword: string): Promise<Task[]> {
    const allTasks = await this.getAllTasks();
    const searchTerm = keyword.toLowerCase();

    return allTasks.filter(task =>
      task.name.toLowerCase().includes(searchTerm) ||
      task.id.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(taskId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Batch delete tasks
   */
  async deleteTasks(taskIds: string[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      let completed = 0;
      let errors: any[] = [];

      taskIds.forEach(taskId => {
        const request = store.delete(taskId);
        request.onsuccess = () => {
          completed++;
          if (completed === taskIds.length) {
            errors.length > 0 ? reject(errors) : resolve();
          }
        };
        request.onerror = () => {
          errors.push(request.error);
          completed++;
          if (completed === taskIds.length) {
            reject(errors);
          }
        };
      });
    });
  }

  /**
   * Clear all tasks
   */
  async clearAllTasks(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<{
    total: number;
    completed: number;
    running: number;
    error: number;
  }> {
    const tasks = await this.getAllTasks();
    const stats = {
      total: tasks.length,
      completed: 0,
      running: 0,
      error: 0
    };

    tasks.forEach(task => {
      if (task.status) {
        stats[task.status]++;
      }
    });

    return stats;
  }

  /**
   * Private method: Get tasks with pagination
   */
  private async getTasksWithPagination(limit: number, offset: number): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');

      const tasks: Task[] = [];
      let currentOffset = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && tasks.length < limit) {
          if (currentOffset >= offset) {
            const task = cursor.value;
            task.createdAt = new Date(task.createdAt);
            task.updatedAt = new Date(task.updatedAt);
            tasks.push(task);
          }
          currentOffset++;
          cursor.continue();
        } else {
          resolve(tasks);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Private method: Get total tasks count
   */
  private async getTotalTasksCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get task list by task type
   * Optimization: Add timeout mechanism
   */
  async getTasksByType(taskType: 'normal' | 'scheduled'): Promise<Task[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return Promise.race([
      this._getTasksByTypeInternal(taskType),
      this._timeout(10000, 'Get tasks by type timeout')
    ]).catch((error) => {
      console.error('getTasksByType error:', error);
      return [];
    });
  }

  /**
   * Internal method: Get tasks by type
   */
  private _getTasksByTypeInternal(taskType: 'normal' | 'scheduled'): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('taskType');
      const request = index.getAll(taskType);

      request.onsuccess = () => {
        const tasks = request.result.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          startTime: task.startTime ? new Date(task.startTime) : undefined,
          endTime: task.endTime ? new Date(task.endTime) : undefined,
        }));
        // Sort by updatedAt in descending order
        tasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        resolve(tasks);
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all execution history of specified scheduled task
   * Optimization: Add timeout mechanism
   */
  async getExecutionsByScheduledTaskId(scheduledTaskId: string): Promise<Task[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return Promise.race([
      this._getExecutionsByScheduledTaskIdInternal(scheduledTaskId),
      this._timeout(10000, 'Get execution history timeout')
    ]).catch((error) => {
      console.error('getExecutionsByScheduledTaskId error:', error);
      return [];
    });
  }

  /**
   * Internal method: Get execution history
   */
  private _getExecutionsByScheduledTaskIdInternal(scheduledTaskId: string): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('scheduledTaskId');
      const request = index.getAll(scheduledTaskId);

      request.onsuccess = () => {
        const tasks = request.result.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
          startTime: task.startTime ? new Date(task.startTime) : undefined,
          endTime: task.endTime ? new Date(task.endTime) : undefined,
        }));
        // Sort by startTime in descending order
        tasks.sort((a, b) => {
          const timeA = a.startTime?.getTime() || 0;
          const timeB = b.startTime?.getTime() || 0;
          return timeB - timeA;
        });
        resolve(tasks);
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const taskStorage = new TaskStorage();