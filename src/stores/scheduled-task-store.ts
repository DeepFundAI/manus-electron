import { create } from 'zustand';
import { ScheduledTask, TaskTemplate } from '@/models';
import { scheduledTaskStorage } from '@/lib/scheduled-task-storage';

/**
 * Scheduled task state management
 */
interface ScheduledTaskState {
  // ==================== State ====================

  // Scheduled task list
  scheduledTasks: ScheduledTask[];

  // Currently selected scheduled task
  selectedTask: ScheduledTask | null;

  // Task template list
  templates: TaskTemplate[];

  // UI state
  showCreateModal: boolean;
  showListPanel: boolean;
  showHistoryPanel: boolean;
  showDetailPanel: boolean;
  isEditMode: boolean;

  // Loading state
  isLoading: boolean;

  // ==================== Actions ====================

  // Load scheduled task list
  loadScheduledTasks: () => Promise<void>;

  // Create task
  createTask: (task: Omit<ScheduledTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;

  // Update task
  updateTask: (id: string, updates: Partial<ScheduledTask>) => Promise<void>;

  // Delete task
  deleteTask: (id: string) => Promise<void>;

  // Toggle task enabled status
  toggleTaskEnabled: (id: string) => Promise<void>;

  // Select task
  selectTask: (task: ScheduledTask | null) => void;

  // Load templates
  loadTemplates: () => Promise<void>;

  // UI control
  setShowCreateModal: (show: boolean) => void;
  setShowListPanel: (show: boolean) => void;
  setShowHistoryPanel: (show: boolean) => void;
  setShowDetailPanel: (show: boolean) => void;
  setIsEditMode: (isEdit: boolean) => void;

  // Execute task immediately
  executeTaskNow: (task: ScheduledTask) => Promise<void>;

  // Initialize scheduler (load all enabled tasks)
  initializeScheduler: () => Promise<void>;
}

export const useScheduledTaskStore = create<ScheduledTaskState>((set, get) => ({
  // ==================== Initial State ====================
  scheduledTasks: [],
  selectedTask: null,
  executionHistory: [],
  selectedExecution: null,
  templates: [],
  showCreateModal: false,
  showListPanel: false,
  showHistoryPanel: false,
  showDetailPanel: false,
  isEditMode: false,
  isLoading: false,

  // ==================== Actions Implementation ====================

  /**
   * Load scheduled task list
   */
  loadScheduledTasks: async () => {
    set({ isLoading: true });
    try {
      const tasks = await scheduledTaskStorage.getAllScheduledTasks();
      set({ scheduledTasks: tasks });
    } catch (error) {
      console.error('Failed to load scheduled tasks:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Create task
   */
  createTask: async (taskData) => {
    set({ isLoading: true });
    try {
      const newTask: ScheduledTask = {
        ...taskData,
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await scheduledTaskStorage.saveScheduledTask(newTask);

      // Reload task list
      await get().loadScheduledTasks();

      // If task is enabled, notify scheduler
      if (newTask.enabled && typeof window !== 'undefined' && (window as any).api) {
        await (window as any).api.invoke('scheduler:add-task', newTask);
      }

      set({ showCreateModal: false });
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Update task
   */
  updateTask: async (id, updates) => {
    set({ isLoading: true });
    try {
      await scheduledTaskStorage.updateScheduledTask(id, updates);

      // Reload task list
      await get().loadScheduledTasks();

      // If task enabled status or schedule configuration changes, update scheduler
      if (typeof window !== 'undefined' && (window as any).api) {
        const task = get().scheduledTasks.find(t => t.id === id);
        if (task) {
          if (task.enabled) {
            await (window as any).api.invoke('scheduler:add-task', task);
          } else {
            await (window as any).api.invoke('scheduler:remove-task', id);
          }
        }
      }

      set({ showCreateModal: false, isEditMode: false });
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Delete task
   */
  deleteTask: async (id) => {
    set({ isLoading: true });
    try {
      // First remove from scheduler
      if (typeof window !== 'undefined' && (window as any).api) {
        await (window as any).api.invoke('scheduler:remove-task', id);
      }

      // Delete task
      await scheduledTaskStorage.deleteScheduledTask(id);

      // Reload task list
      await get().loadScheduledTasks();

      // If deleting the currently selected task, clear selection
      if (get().selectedTask?.id === id) {
        set({ selectedTask: null });
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Toggle task enabled status
   */
  toggleTaskEnabled: async (id) => {
    const task = get().scheduledTasks.find(t => t.id === id);
    if (!task) return;

    await get().updateTask(id, { enabled: !task.enabled });
  },

  /**
   * Select task
   */
  selectTask: (task) => {
    set({ selectedTask: task });
  },

  /**
   * Load templates
   */
  loadTemplates: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/task-templates');
      const templates = await response.json();
      set({ templates });
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Execute task immediately
   */
  executeTaskNow: async (task) => {
    try {
      if (typeof window !== 'undefined' && (window as any).api) {
        const result = await (window as any).api.invoke('scheduler:execute-now', task);
        console.log('Task execution result:', result);
      }
    } catch (error) {
      console.error('Failed to execute task:', error);
      throw error;
    }
  },

  /**
   * Initialize scheduler
   * Called when App starts, loads all enabled scheduled tasks and registers them to the scheduler
   */
  initializeScheduler: async () => {
    try {
      console.log('[ScheduledTaskStore] Starting scheduler initialization...');

      // Load all scheduled tasks
      await scheduledTaskStorage.init();
      const allTasks = await scheduledTaskStorage.getAllScheduledTasks();
      const enabledTasks = allTasks.filter(task => task.enabled);

      console.log(`[ScheduledTaskStore] Found ${allTasks.length} scheduled tasks, ${enabledTasks.length} enabled`);

      // Register to scheduler
      if (typeof window !== 'undefined' && (window as any).api) {
        for (const task of enabledTasks) {
          try {
            const result = await (window as any).api.invoke('scheduler:add-task', task);
            if (result.success) {
              console.log(`[ScheduledTaskStore] ✓ Registered task: ${task.name}`, result.nextExecuteAt);
            } else {
              console.warn(`[ScheduledTaskStore] ✗ Failed to register task: ${task.name}`, result.message);
            }
          } catch (error) {
            console.error(`[ScheduledTaskStore] Exception registering task: ${task.name}`, error);
          }
        }

        console.log('[ScheduledTaskStore] Scheduler initialization completed');
      } else {
        console.warn('[ScheduledTaskStore] Window API not available, cannot initialize scheduler');
      }
    } catch (error) {
      console.error('[ScheduledTaskStore] Failed to initialize scheduler:', error);
    }
  },

  // ==================== UI Control ====================

  setShowCreateModal: (show) => set({ showCreateModal: show }),

  setShowListPanel: (show) => set({ showListPanel: show }),

  setShowHistoryPanel: (show) => set({ showHistoryPanel: show }),

  setShowDetailPanel: (show) => set({ showDetailPanel: show }),

  setIsEditMode: (isEdit) => set({ isEditMode: isEdit }),
}));
