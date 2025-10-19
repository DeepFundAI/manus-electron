import { DisplayMessage } from './message';

// Task status enum - consistent with eko-core
export type TaskStatus = 'running' | 'done' | 'error' | 'abort';

// Task type enum
export type TaskType = 'normal' | 'scheduled';

// Task object (unified for normal tasks and scheduled task execution history)
export interface Task {
  id: string;
  name: string;
  workflow?: any; // Workflow type
  messages: DisplayMessage[]; // Use specific message types
  executionId?: string; // Execution ID, used to associate specific execution records
  status?: TaskStatus; // Task status
  createdAt: Date; // Creation time
  updatedAt: Date; // Update time

  // Tool call history (includes screenshots)
  toolHistory?: Array<{
    id: string;
    toolName: string;
    type: 'tool';
    status: 'streaming' | 'use' | 'running' | 'completed';
    timestamp: Date;
    screenshot?: string;
    toolSequence?: number;
    agentName: string;
  }>;

  // === Task type identifier (key fields for unified storage) ===
  taskType: TaskType; // Task type: normal=normal task, scheduled=scheduled task execution history

  // === Scheduled task execution history related fields ===
  scheduledTaskId?: string; // Associated scheduled task configuration ID (only used when taskType=scheduled)
  startTime?: Date; // Execution start time
  endTime?: Date; // Execution end time
  duration?: number; // Execution duration (milliseconds)
  error?: string; // Error message
  windowId?: string; // Execution window ID

  // Whether it's a historical task (read-only)
  isHistorical?: boolean;
}