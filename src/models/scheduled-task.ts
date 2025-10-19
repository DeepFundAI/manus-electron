/**
 * Task step
 */
export interface TaskStep {
  id: string;           // Step unique ID
  name: string;         // Step name
  content: string;      // Step content description
  order: number;        // Execution order
}

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  type: 'interval' | 'cron';                    // Schedule type: interval or cron expression
  intervalUnit?: 'minute' | 'hour' | 'day';     // Interval unit
  intervalValue?: number;                       // Interval value
  cronExpression?: string;                      // Cron expression
}

/**
 * Scheduled task
 */
export interface ScheduledTask {
  id: string;               // Task unique ID
  name: string;             // Task name
  description?: string;     // Task description
  steps: TaskStep[];        // Task steps list
  schedule: ScheduleConfig; // Schedule configuration
  enabled: boolean;         // Whether enabled
  source: 'manual' | 'api'; // Step source: manual input or API import
  templateId?: string;      // If from API, record template ID
  createdAt: Date;          // Creation time
  updatedAt: Date;          // Update time
  lastExecutedAt?: Date;    // Last execution time
  nextExecuteAt?: Date;     // Next execution time
}

/**
 * Task template (obtained from API)
 */
export interface TaskTemplate {
  id: string;               // Template ID
  name: string;             // Template name
  description: string;      // Template description
  steps: TaskStep[];        // Steps list
  category?: string;        // Category
}

/**
 * Note: Scheduled task execution history is now unified in the Task table
 * Associated via Task.taskType === 'scheduled' and Task.scheduledTaskId
 * No longer using independent ExecutionHistory table
 */
