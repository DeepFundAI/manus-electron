import { useState, useCallback } from 'react';
import { Task, DisplayMessage } from '@/models';
import { taskStorage } from '@/lib/taskStorage';

interface UseTaskManagerReturn {
  tasks: Task[];
  currentTask: Task | undefined;
  messages: DisplayMessage[];
  currentTaskId: string;
  isHistoryMode: boolean;

  // Task operations
  setCurrentTaskId: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  createTask: (taskId: string, initialData: Partial<Task>) => void;
  updateMessages: (taskId: string, messages: DisplayMessage[]) => void;
  addToolHistory: (taskId: string, toolData: any) => void;
  replaceTaskId: (oldTaskId: string, newTaskId: string) => void;

  // History mode
  enterHistoryMode: (task: Task) => void;
  exitHistoryMode: () => void;

  // Reset
  reset: () => void;
}

export const useTaskManager = (): UseTaskManagerReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [isHistoryMode, setIsHistoryMode] = useState<boolean>(false);

  // Computed properties
  const currentTask = tasks.find(task => task.id === currentTaskId);
  const messages = currentTask?.messages || [];

  // Automatically save tasks to IndexedDB
  const saveTask = useCallback(async (task: Task) => {
    try {
      await taskStorage.saveTask(task);
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  }, []);

  // Update task
  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    if (!taskId || isHistoryMode) return;

    setTasks(prevTasks => {
      const existingTaskIndex = prevTasks.findIndex(task => task.id === taskId);
      if (existingTaskIndex >= 0) {
        const updatedTasks = [...prevTasks];
        const updatedTask = {
          ...updatedTasks[existingTaskIndex],
          ...updates,
          updatedAt: new Date()
        };
        updatedTasks[existingTaskIndex] = updatedTask;

        // Asynchronous save
        saveTask(updatedTask);

        return updatedTasks;
      }
      return prevTasks;
    });
  }, [isHistoryMode, saveTask]);

  // Create new task
  const createTask = useCallback((taskId: string, initialData: Partial<Task>) => {
    if (isHistoryMode) return;

    const newTask: Task = {
      id: taskId,
      name: `Task ${taskId.slice(0, 8)}`,
      messages: [],
      taskType: 'normal', // Default to normal task
      createdAt: new Date(),
      updatedAt: new Date(),
      ...initialData
    };

    setTasks(prevTasks => {
      // Check if already exists
      const exists = prevTasks.some(task => task.id === taskId);
      if (exists) return prevTasks;

      // Asynchronous save
      saveTask(newTask);

      return [...prevTasks, newTask];
    });
  }, [isHistoryMode, saveTask]);

  // Update messages
  const updateMessages = useCallback((taskId: string, messages: DisplayMessage[]) => {
    updateTask(taskId, { messages });
  }, [updateTask]);

  // Add tool history
  const addToolHistory = useCallback((taskId: string, toolData: any) => {
    setTasks(prevTasks => {
      const existingTaskIndex = prevTasks.findIndex(task => task.id === taskId);
      if (existingTaskIndex >= 0) {
        const updatedTasks = [...prevTasks];
        const currentToolHistory = updatedTasks[existingTaskIndex].toolHistory || [];
        const updatedTask = {
          ...updatedTasks[existingTaskIndex],
          toolHistory: [...currentToolHistory, toolData],
          updatedAt: new Date()
        };
        updatedTasks[existingTaskIndex] = updatedTask;

        // Asynchronous save
        saveTask(updatedTask);

        return updatedTasks;
      }
      return prevTasks;
    });
  }, [saveTask]);

  // Replace task ID (for temporary task -> real task transition)
  const replaceTaskId = useCallback((oldTaskId: string, newTaskId: string) => {
    if (isHistoryMode) return;

    setTasks(prevTasks => {
      const existingTaskIndex = prevTasks.findIndex(task => task.id === oldTaskId);
      if (existingTaskIndex >= 0) {
        const updatedTasks = [...prevTasks];
        // Create new task object with new ID, keep all other data
        const newTask = {
          ...updatedTasks[existingTaskIndex],
          id: newTaskId,
          updatedAt: new Date()
        };

        // Replace old task with new task
        updatedTasks[existingTaskIndex] = newTask;

        // Save new task to IndexedDB
        saveTask(newTask);

        // Delete old temporary task from IndexedDB
        taskStorage.deleteTask(oldTaskId).catch(error => {
          console.error('Failed to delete temporary task:', error);
        });

        return updatedTasks;
      }
      return prevTasks;
    });

    // Update currentTaskId if it matches the old ID
    if (currentTaskId === oldTaskId) {
      setCurrentTaskId(newTaskId);
    }
  }, [isHistoryMode, saveTask, currentTaskId]);

  // Enter history mode
  const enterHistoryMode = useCallback((task: Task) => {
    setIsHistoryMode(true);
    setCurrentTaskId(task.id);
    setTasks([task]);
  }, []);

  // Exit history mode
  const exitHistoryMode = useCallback(() => {
    setIsHistoryMode(false);
    setCurrentTaskId('');
    setTasks([]);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setTasks([]);
    setCurrentTaskId('');
    setIsHistoryMode(false);
  }, []);

  return {
    tasks,
    currentTask,
    messages,
    currentTaskId,
    isHistoryMode,

    setCurrentTaskId,
    updateTask,
    createTask,
    updateMessages,
    addToolHistory,
    replaceTaskId,

    enterHistoryMode,
    exitHistoryMode,

    reset
  };
};