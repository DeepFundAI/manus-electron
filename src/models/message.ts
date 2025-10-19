import { WorkflowAgent } from "@jarvis-agent/core";

// Tool execution action
export interface ToolAction {
  id: string;
  toolName: string;
  type: 'tool';
  params?: any;
  status: 'streaming' | 'use' | 'running' | 'completed';
  result?: any;
  timestamp: Date;
  agentName: string;
}

// Text output in workflow
export interface TextMessage {
  type: 'text';
  id: string;
  content: string;
}

export type AgentMessage = ToolAction | TextMessage;

// Workflow message - contains planning and thinking process
export interface WorkflowMessage {
  id: string;
  type: 'workflow';
  taskId: string;
  workflow?: any; // Workflow type
  thinking?: {
    text: string;
    completed: boolean;
  };
  timestamp: Date;
}

// Agent group message - contains complete execution process of an agent
export interface AgentGroupMessage {
  id: string;
  type: 'agent_group';
  taskId: string;
  agentName: string;
  agentNode?: WorkflowAgent; // WorkflowAgent type
  messages: AgentMessage[];  // Tool execution sequence
  result?: string;
  status: 'running' | 'completed' | 'error';
  timestamp: Date;
}

// User message type
export interface UserMessage {
  id: string;
  type: 'user';
  content: string;
  timestamp: Date;
}

// Display layer message union type
export type DisplayMessage = WorkflowMessage | AgentGroupMessage | UserMessage;