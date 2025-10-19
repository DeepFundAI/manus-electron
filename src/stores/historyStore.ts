import { create } from 'zustand';
import { Task } from '@/models';

interface HistoryState {
  // State
  showHistoryPanel: boolean;
  selectedHistoryTask: Task | null;

  // Function to terminate current task (set by main.tsx)
  terminateCurrentTaskFn: ((reason: string) => Promise<boolean>) | null;

  // Actions
  setShowHistoryPanel: (show: boolean) => void;
  selectHistoryTask: (task: Task) => void;
  clearSelectedHistoryTask: () => void;
  setTerminateCurrentTaskFn: (fn: (reason: string) => Promise<boolean>) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  // Initial state
  showHistoryPanel: false,
  selectedHistoryTask: null,
  terminateCurrentTaskFn: null,

  // Actions
  setShowHistoryPanel: (show) => set({ showHistoryPanel: show }),

  selectHistoryTask: (task) => set((state) => ({
    selectedHistoryTask: task,
    showHistoryPanel: false
  })),

  clearSelectedHistoryTask: () => set({ selectedHistoryTask: null }),

  setTerminateCurrentTaskFn: (fn) => set({ terminateCurrentTaskFn: fn }),
}));