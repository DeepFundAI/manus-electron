import { StreamCallbackMessage } from '@jarvis-agent/core';
import { uuidv4 } from '@/common/utils';
import { DisplayMessage, WorkflowMessage, AgentGroupMessage, UserMessage, ToolAction } from '@/models';

// Message transformation and processing class
export class MessageProcessor {
  private messages: DisplayMessage[] = [];
  private workflowMessages = new Map<string, WorkflowMessage>();
  private agentGroups = new Map<string, AgentGroupMessage>();
  private executionId: string = '';

  // Set execution ID
  public setExecutionId(id: string) {
    this.executionId = id;
  }

  // Process streaming messages and convert to structured display messages
  public processStreamMessage(message: StreamCallbackMessage): DisplayMessage[] {
    console.log('MessageProcessor processing message:', message.type, message);

    switch (message.type) {
      case 'workflow':
        this.handleWorkflowMessage(message);
        break;
      // case 'thinking':
      //   this.handleThinkingMessage(message);
      //   break;
      case 'agent_start':
        this.handleAgentStartMessage(message);
        break;
      case 'text':
      case 'thinking':
        this.handleTextMessage(message);
        break;
      case 'tool_streaming':
      case 'tool_use':
      case 'tool_running':
      case 'tool_result':
        this.handleToolMessage(message);
        break;
      case 'agent_result':
        this.handleAgentResultMessage(message);
        break;
      case 'error':
        this.handleErrorMessage(message);
        break;
    }

    console.log('MessageProcessor current message count:', this.messages.length);
    return [...this.messages];
  }

  // Handle workflow message
  private handleWorkflowMessage(message: any) {
    const key = `${message.taskId}-${this.executionId}`;
    let workflowMsg = this.workflowMessages.get(key);
    
    if (!workflowMsg) {
      workflowMsg = {
        id: uuidv4(),
        type: 'workflow',
        taskId: message.taskId,
        workflow: message.workflow,
        timestamp: new Date()
      };
      this.workflowMessages.set(key, workflowMsg);
      // Add directly to message list in order
      this.messages.push(workflowMsg);
    } else {
      // Update workflow information
      workflowMsg.workflow = message.workflow;
    }
  }

  // Handle thinking message
  private handleThinkingMessage(message: any) {
    const key = `${message.taskId}-${this.executionId}`;
    let workflowMsg = this.workflowMessages.get(key);
    
    if (!workflowMsg) {
      workflowMsg = {
        id: uuidv4(),
        type: 'workflow',
        taskId: message.taskId,
        thinking: {
          text: message.text || '',
          completed: message.streamDone || false
        },
        timestamp: new Date()
      };
      this.workflowMessages.set(key, workflowMsg);
    } else {
      // Update thinking information
      if (!workflowMsg.thinking) {
        workflowMsg.thinking = { text: '', completed: false };
      }
      if (message.text) {
        workflowMsg.thinking.text = message.text;
      }
      if (message.streamDone !== undefined) {
        workflowMsg.thinking.completed = message.streamDone;
      }
    }
  }

  // Handle agent_start message
  private handleAgentStartMessage(message: any) {
    const agentKey = `${message.taskId}-${message.nodeId}-${this.executionId}`;
    
    if (!this.agentGroups.has(agentKey)) {
      const agentGroup: AgentGroupMessage = {
        id: uuidv4(),
        type: 'agent_group',
        taskId: message.taskId,
        agentName: message.agentName,
        agentNode: message.agentNode || message.workflow || null,
        messages: [],
        status: 'running',
        timestamp: new Date()
      };
      this.agentGroups.set(agentKey, agentGroup);
      // Add directly to message list in order
      this.messages.push(agentGroup);
    }

  }

  // Handle text message
  private handleTextMessage(message: any) {
    const agentKey = `${message.taskId}-${message.nodeId}-${this.executionId}`;
    let agentGroup = this.agentGroups.get(agentKey);
    
    if (!agentGroup) {
      // If no corresponding agent group, create one
      agentGroup = {
        id: uuidv4(),
        type: 'agent_group',
        taskId: message.taskId,
        agentName: message.agentName,
        messages: [],
        status: 'running',
        timestamp: new Date()
      };
      this.agentGroups.set(agentKey, agentGroup);
      // Add directly to message list in order
      this.messages.push(agentGroup);
    }

    // Find or create corresponding text message
    let textMessage = agentGroup.messages.find(msg => 
      msg.type === 'text' && msg.id === (message.streamId || message.id)
    );
    
    if (!textMessage) {
      textMessage = {
        type: 'text',
        id: message.streamId || message.id || uuidv4(),
        content: message.text || ''
      };
      agentGroup.messages.push(textMessage);
    } else {
      // Update text content (support streaming updates)
      if (message.text) {
        (textMessage as any).content = message.text;
      }
    }
  }

  // Handle tool-related messages
  private handleToolMessage(message: any) {
    const agentKey = `${message.taskId}-${message.nodeId}-${this.executionId}`;
    let agentGroup = this.agentGroups.get(agentKey);
    
    if (!agentGroup) {
      // If no corresponding agent group, create one
      agentGroup = {
        id: uuidv4(),
        type: 'agent_group',
        taskId: message.taskId,
        agentName: message.agentName,
        messages: [],
        status: 'running',
        timestamp: new Date()
      };
      this.agentGroups.set(agentKey, agentGroup);
      // Add directly to message list in order
      this.messages.push(agentGroup);
    }

    // Find or create corresponding tool action
    let toolAction = agentGroup.messages.find(tool => tool.id === message.toolId);
    if (!toolAction) {
      toolAction = {
        type: 'tool',
        id: message.toolId,
        toolName: message.toolName || message.type,
        params: message.params,
        status: this.mapToolStatus(message.type),
        timestamp: new Date(),
        agentName: message.agentName,
      };
      agentGroup.messages.push(toolAction);
    } else {
      if (toolAction.type === 'tool') {
        // Update tool status
      toolAction.status = this.mapToolStatus(message.type);
      if (message.params) {
        toolAction.params = message.params;
      }
      if (message.type === 'tool_result') {
        toolAction.result = message.result;
        toolAction.status = 'completed';
      }
      }
      
    }
  }

  // Handle agent_result message
  private handleAgentResultMessage(message: any) {
    const agentKey = `${message.taskId}-${message.nodeId}-${this.executionId}`;
    let agentGroup = this.agentGroups.get(agentKey);
    
    if (agentGroup) {
      agentGroup.result = message.result;
      agentGroup.status = 'completed';
    }
  }

  // Map tool status
  private mapToolStatus(messageType: string): 'streaming' | 'use' | 'running' | 'completed' {
    switch (messageType) {
      case 'tool_streaming': return 'streaming';
      case 'tool_use': return 'use';
      case 'tool_running': return 'running';
      case 'tool_result': return 'completed';
      default: return 'use';
    }
  }


  // Add user message
  public addUserMessage(content: string): DisplayMessage[] {
    const userMsg: UserMessage = {
      id: uuidv4(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    
    this.messages.push(userMsg);
    return [...this.messages];
  }

  // Handle error message
  private handleErrorMessage(message: any) {
    console.error('Error message received:', message);

    // Create error message as AgentGroupMessage with error status
    const errorMsg: AgentGroupMessage = {
      id: uuidv4(),
      type: 'agent_group',
      taskId: message.taskId || 'unknown',
      agentName: 'System',
      messages: [
        {
          type: 'text',
          id: uuidv4(),
          content: `❌ Error: ${message.error || 'Unknown error occurred'}\n\n${message.detail || ''}`
        }
      ],
      status: 'error',
      timestamp: new Date()
    };

    this.messages.push(errorMsg);
  }

  // Get current message list
  public getMessages(): DisplayMessage[] {
    return [...this.messages];
  }

  // Clear messages
  public clearMessages(): void {
    this.messages = [];
    this.workflowMessages.clear();
    this.agentGroups.clear();
  }
}