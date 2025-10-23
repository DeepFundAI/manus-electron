import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import Header from '@/components/Header'
import { Input, Slider, Button, message as antdMessage } from 'antd'
import { EkoResult, StreamCallbackMessage } from '@jarvis-agent/core/dist/types';
import { MessageList } from '@/components/chat/MessageComponents';
import { uuidv4 } from '@/common/utils';
import { StepUpDown, SendMessage, CancleTask } from '@/icons/deepfundai-icons';
import { Task, ToolAction } from '@/models';
import { MessageProcessor } from '@/utils/messageTransform';
import { useTaskManager } from '@/hooks/useTaskManager';
import { useHistoryStore } from '@/stores/historyStore';
import { scheduledTaskStorage } from '@/lib/scheduled-task-storage';


export default function main() {
    const router = useRouter();
    const { taskId: urlTaskId, executionId: urlExecutionId } = router.query;

    // Check if in task detail mode (opened from scheduled task window)
    const isTaskDetailMode = !!urlTaskId && !!urlExecutionId;

    // Scheduled task's scheduledTaskId (from URL)
    const scheduledTaskIdFromUrl = typeof urlTaskId === 'string' ? urlTaskId : undefined;

    // Use task management Hook
    const {
        tasks,
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
    } = useTaskManager();

    // Use Zustand history state management
    const { selectedHistoryTask, clearSelectedHistoryTask, setTerminateCurrentTaskFn } = useHistoryStore();

    const [showDetail, setShowDetail] = useState(false);
    const [query, setQuery] = useState('');
    const [currentUrl, setCurrentUrl] = useState<string>('');
    // Current tool information state
    const [currentTool, setCurrentTool] = useState<{
        toolName: string;
        operation: string;
        status: 'running' | 'completed' | 'error';
    } | null>(null);
    // Tool call history
    const [toolHistory, setToolHistory] = useState<(ToolAction & { screenshot?: string, toolSequence?: number })[]>([]);
    // Current displayed history tool index, -1 means showing the latest detail panel
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(-1);

    const showDetailAgents = ['Browser', 'File'];

    const [ekoRequest, setEkoRequest] = useState<Promise<any> | null>(null)

    // Check if current task is running
    const isCurrentTaskRunning = useMemo(() => {
        if (!currentTaskId || isHistoryMode) return false;

        const currentTask = tasks.find(task => task.id === currentTaskId);
        return currentTask?.status === 'running';
    }, [currentTaskId, isHistoryMode, tasks]);

    // Task ID reference
    const taskIdRef = useRef<string>(currentTaskId);
    // Message processor
    const messageProcessorRef = useRef(new MessageProcessor());
    // Execution ID reference, generate new unique identifier for each task execution
    const executionIdRef = useRef<string>('');
    // Scroll related state and references
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout>(null);

    // Synchronize taskIdRef
    useEffect(() => {
        taskIdRef.current = currentTaskId;
    }, [currentTaskId]);

    // Monitor detail panel display status changes, synchronize control of detail view
    useEffect(() => {
        if (window.api && (window.api as any).setDetailViewVisible) {
            const showDetailView = isHistoryMode ? false : showDetail;
            (window.api as any).setDetailViewVisible(showDetailView);
        }

        // When detail panel is hidden, also close history screenshot preview view
        if (!showDetail && window.api && (window.api as any).hideHistoryView) {
            (window.api as any).hideHistoryView();
        }
    }, [showDetail]);

    // Cleanup logic when page is destroyed
    useEffect(() => {
        return () => {
            console.log('Main page unloaded, performing cleanup');
            if (window.api) {
                // Close detail view
                if ((window.api as any).setDetailViewVisible) {
                    (window.api as any).setDetailViewVisible(false);
                }
                // Close history screenshot preview view
                if ((window.api as any).hideHistoryView) {
                    (window.api as any).hideHistoryView();
                }
                // Terminate current task
                if ((window.api as any).ekoCancelTask && taskIdRef.current) {
                    window.api.ekoCancelTask(taskIdRef.current);
                }
            }
        };
    }, []); // Empty dependency array, only executes on component mount/unmount

    // Get current URL and monitor URL changes on initialization
    useEffect(() => {
        const initUrl = async () => {
            if (window.api && (window.api as any).getCurrentUrl) {
                const url = await (window.api as any).getCurrentUrl();
                setCurrentUrl(url);
            }
        };

        // Monitor URL changes
        if (window.api && (window.api as any).onUrlChange) {
            (window.api as any).onUrlChange((url: string) => {
                setCurrentUrl(url);
                console.log('URL changed:', url);
            });
        }

        initUrl();
    }, []);

    // Handle implicit message passing from home page
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const pendingMessage = sessionStorage.getItem('pendingMessage');
            if (pendingMessage) {
                console.log('Detected pending message:', pendingMessage);
                setQuery(pendingMessage);
                // Clear message to avoid duplicate sending
                sessionStorage.removeItem('pendingMessage');
                // Automatically send message
                setTimeout(() => {
                    sendMessage(pendingMessage);
                }, 100);
            }
        }
    }, []);

    // Monitor history task selection from Zustand store (as elegant as Pinia's watch!)
    useEffect(() => {
        if (selectedHistoryTask) {
            handleSelectHistoryTask(selectedHistoryTask);
            // Clear selection after processing
            clearSelectedHistoryTask();
        }
    }, [selectedHistoryTask]);

    // Monitor open history panel event (click "Execution History" from scheduled task list)
    useEffect(() => {
        if (!isTaskDetailMode || !window.api) return;

        const handleOpenHistoryPanel = (event: any) => {
            console.log('[Main] Received open history panel event:', event);

            // Use Zustand to open history panel
            const { setShowHistoryPanel } = useHistoryStore.getState();
            setShowHistoryPanel(true);
        };

        // Monitor open history panel event
        if ((window.api as any).onOpenHistoryPanel) {
            (window.api as any).onOpenHistoryPanel(handleOpenHistoryPanel);
        }

        return () => {
            if (window.api && (window.api as any).removeAllListeners) {
                (window.api as any).removeAllListeners('open-history-panel');
            }
        };
    }, [isTaskDetailMode]);

    // Monitor task aborted by system event, update task status to IndexedDB
    useEffect(() => {
        if (!window.api) return;

        const handleTaskAbortedBySystem = async (event: any) => {
            const { taskId, reason, timestamp } = event;

            console.log(`[Main] Task aborted by system: ${taskId}, reason: ${reason}`);

            try {
                // Update task status to abort
                updateTask(taskId, {
                    status: 'abort',
                    endTime: new Date(timestamp),
                });

                antdMessage.warning(`Task terminated: ${reason}`);
            } catch (error) {
                console.error('[Main] Failed to update aborted task status:', error);
            }
        };

        // Monitor task aborted by system event
        if ((window.api as any).onTaskAbortedBySystem) {
            (window.api as any).onTaskAbortedBySystem(handleTaskAbortedBySystem);
        }

        return () => {
            if (window.api && (window.api as any).removeAllListeners) {
                (window.api as any).removeAllListeners('task-aborted-by-system');
            }
        };
    }, [updateTask]);

    // Monitor scheduled task execution completion event, update task end time and scheduled task configuration
    useEffect(() => {
        if (!isTaskDetailMode || !window.api) return;

        const handleTaskExecutionComplete = async (event: any) => {
            const { taskId, executionId, status, endTime } = event;

            try {
                const endTimeDate = endTime ? new Date(endTime) : new Date();

                // Update current task's end time and duration (automatically saved via useTaskManager)
                if (taskIdRef.current) {
                    const currentTask = tasks.find(t => t.id === taskIdRef.current);
                    const startTime = currentTask?.startTime || currentTask?.createdAt;

                    updateTask(taskIdRef.current, {
                        endTime: endTimeDate,
                        duration: startTime ? endTimeDate.getTime() - startTime.getTime() : undefined,
                        status: status as any,
                    });
                }

                // Update scheduled task configuration's lastExecutedAt field
                const scheduledTaskId = scheduledTaskIdFromUrl || taskId;
                if (scheduledTaskId) {
                    await scheduledTaskStorage.updateScheduledTask(scheduledTaskId, {
                        lastExecutedAt: endTimeDate
                    });
                    console.log(`[Main] Scheduled task configuration updated lastExecutedAt: ${scheduledTaskId}`);
                }

                antdMessage.success('Task execution completed');
            } catch (error) {
                console.error('[Main] Failed to update task completion status:', error);
                antdMessage.error('Failed to update task status');
            }
        };

        // Monitor task execution completion event
        if ((window.api as any).onTaskExecutionComplete) {
            (window.api as any).onTaskExecutionComplete(handleTaskExecutionComplete);
        }

        return () => {
            if (window.api && (window.api as any).removeAllListeners) {
                (window.api as any).removeAllListeners('task-execution-complete');
            }
        };
    }, [isTaskDetailMode, tasks, updateTask, scheduledTaskIdFromUrl]);

    // Generic function to terminate current task
    const terminateCurrentTask = useCallback(async (reason: string = 'User manually terminated') => {
        console.log(taskIdRef.current)
        if (!currentTaskId || !isCurrentTaskRunning) {
            return false; // No task to terminate
        }

        try {
            const result = await window.api.ekoCancelTask(currentTaskId);
            updateTask(currentTaskId, { status: 'abort' });
            console.log(`Task terminated, reason: ${reason}`, result);
            return true; // Termination successful
        } catch (error) {
            console.error('Failed to terminate task:', error);
            return false; // Termination failed
        }
    }, [currentTaskId, isCurrentTaskRunning, updateTask]);

    // Register termination function in store for use by other components
    useEffect(() => {
        setTerminateCurrentTaskFn(terminateCurrentTask);
    }, [terminateCurrentTask]);

    // Scroll to bottom function
    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    // Handle scroll events
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const isBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
        setIsAtBottom(isBottom);

        // User active scrolling marker
        setIsUserScrolling(true);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 150);
    };

    // Monitor message changes, auto scroll to bottom
    useEffect(() => {
        if (isAtBottom && !isUserScrolling) {
            setTimeout(() => scrollToBottom(), 50); // Slight delay to ensure DOM updates
        }
    }, [messages, isAtBottom, isUserScrolling]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Handle sending message logic
            console.log('Sending message');
            sendMessage(query);
        }
    };

    const callback = {
        onMessage: (message: StreamCallbackMessage) => {
            console.log('Processing stream message:', message);

            // Do not process new messages in history mode
            if (isHistoryMode) return;

            // Use message processor to handle stream messages
            const updatedMessages = messageProcessorRef.current.processStreamMessage(message);
            console.log('Updated message list:', updatedMessages);

            // Handle task ID replacement: temporary task -> real task
            const isCurrentTaskTemporary = taskIdRef.current?.startsWith('temp-');
            const hasRealTaskId = message.taskId && !message.taskId.startsWith('temp-');

            if (isCurrentTaskTemporary && hasRealTaskId) {
                const tempTaskId = taskIdRef.current;
                const realTaskId = message.taskId;

                console.log(`Replacing temporary task ${tempTaskId} with real task ${realTaskId}`);

                // Replace task ID
                replaceTaskId(tempTaskId, realTaskId);

                // Update taskIdRef
                taskIdRef.current = realTaskId;

                // Update task with new workflow info if available
                if (message.type === 'workflow' && message.workflow?.name) {
                    updateTask(realTaskId, {
                        name: message.workflow.name,
                        workflow: message.workflow,
                        messages: updatedMessages
                    });
                } else {
                    updateTask(realTaskId, { messages: updatedMessages });
                }

                return; // Exit early, task ID has been replaced
            }

            // Set task ID (if not already set and not temporary)
            if (message.taskId && !currentTaskId && !message.taskId.startsWith('temp-')) {
                setCurrentTaskId(message.taskId);
            }

            // Update or create task
            const taskIdToUpdate = message.taskId || taskIdRef.current;
            if (taskIdToUpdate) {
                const updates: Partial<Task> = {
                    messages: updatedMessages
                };

                if (message.type === 'workflow' && message.workflow?.name) {
                    updates.name = message.workflow.name;
                    updates.workflow = message.workflow;
                }

                // For error messages, also update task status
                if (message.type === 'error') {
                    updates.status = 'error';
                }

                // Always update task (will only work if task exists)
                updateTask(taskIdToUpdate, updates);
            }

            // Detect tool call messages, automatically show detail panel
            if (message.type.includes('tool')) {
                const toolName = (message as any).toolName || 'Unknown tool';
                const operation = getToolOperation(message);
                const status = getToolStatus(message.type);

                setCurrentTool({
                    toolName,
                    operation,
                    status
                });
                // Show detail panel
                if (showDetailAgents.includes(message.agentName)) {
                    setShowDetail(true);
                }

                // Take screenshot when tool call completes
                if (message.type === 'tool_result') {
                    handleToolComplete({
                        type: 'tool',
                        id: message.toolId,
                        toolName: message.toolName,
                        status: 'completed',
                        timestamp: new Date(),
                        agentName: message.agentName
                    });
                }
            }
        },
    }

    // Get tool operation description
    const getToolOperation = (message: StreamCallbackMessage): string => {
        const toolName = (message as any).toolName || '';
        switch (toolName.toLowerCase()) {
            case 'browser':
            case 'browser_navigate':
                return 'Browsing web page';
            case 'file_write':
            case 'file':
                return 'Writing file';
            case 'file_read':
                return 'Reading file';
            case 'search':
                return 'Searching';
            default:
                return `Executing ${toolName}`;
        }
    };

    // Get tool status
    const getToolStatus = (messageType: string): 'running' | 'completed' | 'error' => {
        switch (messageType) {
            case 'tool_use':
            case 'tool_streaming':
            case 'tool_running':
                return 'running';
            case 'tool_result':
                return 'completed';
            case 'error':
                return 'error';
            default:
                return 'running';
        }
    };

    // Handle screenshot when tool call completes
    const handleToolComplete = async (message: ToolAction) => {
        try {
            if (window.api && (window.api as any).getMainViewScreenshot) {
                let result: any = null;
                if (showDetailAgents.includes(message.agentName)) {
                    result = await (window.api as any).getMainViewScreenshot();
                }
                const toolMessage = {
                    ...message,
                    screenshot: result?.imageBase64,
                    toolSequence: toolHistory.length + 1
                };

                // Update local toolHistory state
                setToolHistory(prev => [...prev, toolMessage]);

                // Also save to current task's toolHistory
                if (taskIdRef.current) {
                    addToolHistory(taskIdRef.current, toolMessage);
                }

                console.log('Tool call screenshot saved:', message.type, toolMessage.toolSequence);
            }
        } catch (error) {
            console.error('Screenshot failed:', error);
        }
    };

    // Handle tool call click, show historical screenshot
    const handleToolClick = async (message: ToolAction) => {
        console.log('Tool call clicked:', message);
        // Set current tool information
        setCurrentTool({
            toolName: message.toolName,
            operation: getToolOperation({ toolName: message.toolName } as any),
            status: getToolStatus(message.status === 'completed' ? 'tool_result' :
                message.status === 'running' ? 'tool_running' : 'error')
        });

        // Find corresponding historical tool call
        const historyTool = toolHistory.find(tool =>
            (tool as any).toolId === (message as any).toolId && tool.id === message.id
        );
        if (historyTool && historyTool.toolSequence && historyTool.screenshot) {
            setCurrentHistoryIndex(historyTool.toolSequence - 1);
            // Show detail panel
            setShowDetail(true);
            await switchToHistoryIndex(historyTool.toolSequence - 1);
        }
    };

    // Switch to specified history index
    const switchToHistoryIndex = async (newIndex: number) => {
        // If switching to the last tool, set to -1 to indicate latest state
        if ((newIndex >= toolHistory.length - 1) && !isHistoryMode) {
            setCurrentHistoryIndex(-1);
            try {
                if (window.api && (window.api as any).hideHistoryView) {
                    await (window.api as any).hideHistoryView();
                    console.log('Switched to real-time view');
                }
            } catch (error) {
                console.error('Failed to hide history view:', error);
            }
        } else {
            setCurrentHistoryIndex(newIndex);
            // Show corresponding historical screenshot
            const historyTool = toolHistory[newIndex];
            if (historyTool && historyTool.screenshot) {
                try {
                    if (window.api && (window.api as any).showHistoryView) {
                        await (window.api as any).showHistoryView(historyTool.screenshot);
                        console.log('Switched to history tool:', newIndex + 1);
                    }
                } catch (error) {
                    console.error('Failed to show history view:', error);
                }
            }
        }
    };

    // Handle history task selection
    const handleSelectHistoryTask = async (task: Task) => {
        try {
            // If there's a currently running task, terminate it first
            if (currentTaskId && isCurrentTaskRunning) {
                const terminated = await terminateCurrentTask('Switching to history task view mode');
                if (terminated) {
                    console.log('Switched to history task, current task terminated');
                }
            }

            // Use Hook to enter history mode
            enterHistoryMode(task);
            setToolHistory(task.toolHistory || []);

            // Clear current tool state
            setShowDetail(false);
            setCurrentTool(null);
            setCurrentHistoryIndex(toolHistory.length - 1);

            antdMessage.info('Switched to history task view mode');
        } catch (error) {
            console.error('Failed to load history task:', error);
            antdMessage.error('Failed to load history task');
        }
    };

    // EkoService stream message monitoring
    useEffect(() => {
        const handleEkoStreamMessage = (message: StreamCallbackMessage) => {
            console.log('Received EkoService stream message:', message);
            // Directly process stream messages
            callback.onMessage(message);
        };

        // Monitor stream messages from main thread
        window.api.onEkoStreamMessage(handleEkoStreamMessage);

        return () => {
            window.api.removeAllListeners('eko-stream-message');
        };
    }, [callback]);

    const sendMessage = async (message: string) => {
        if (!message) {
            antdMessage.warning('Please enter your question!');
            return;
        }
        // Prohibit sending messages in history mode
        if (isHistoryMode) {
            antdMessage.warning('History tasks are read-only mode, cannot send messages');
            return;
        }

        console.log('Sending message', message);

        // Generate new execution ID for each task execution
        const newExecutionId = uuidv4();
        executionIdRef.current = newExecutionId;
        messageProcessorRef.current.setExecutionId(newExecutionId);

        // Add user message to message processor
        const updatedMessages = messageProcessorRef.current.addUserMessage(message.trim());

        // If no current task, create temporary task immediately to display user message
        if (!taskIdRef.current) {
            const tempTaskId = `temp-${newExecutionId}`;
            taskIdRef.current = tempTaskId;
            setCurrentTaskId(tempTaskId);

            // Create temporary task with user message
            createTask(tempTaskId, {
                name: 'Processing...',
                messages: updatedMessages,
                status: 'running',
                taskType: isTaskDetailMode ? 'scheduled' : 'normal',
                scheduledTaskId: isTaskDetailMode ? scheduledTaskIdFromUrl : undefined,
                startTime: new Date(),
            });
        } else {
            // Update existing task's messages
            updateMessages(taskIdRef.current, updatedMessages);
            // Set existing task to running state
            updateTask(taskIdRef.current, { status: 'running' });
        }

        // Clear input field
        setQuery('');

        let result: EkoResult | null = null;

        if (ekoRequest) {
            console.log('Waiting for current request to finish, avoiding conflicts');
            await window.api.ekoCancelTask(taskIdRef.current);
            await ekoRequest;
        }

        try {
            // Check if current task is temporary
            const isTemporaryTask = taskIdRef.current.startsWith('temp-');

            if (isTemporaryTask) {
                // Use IPC to call main thread's EkoService to run new task
                const req = window.api.ekoRun(message.trim());
                setEkoRequest(req);
                result = await req;
                // Note: real taskId will be set via stream callback's replaceTaskId
            } else {
                // Modify existing task
                const req = window.api.ekoModify(taskIdRef.current, message.trim());
                setEkoRequest(req);
                result = await req;
            }

            // Update task status based on result (directly using eko-core status)
            if (result && taskIdRef.current) {
                updateTask(taskIdRef.current, {
                    status: result.stopReason
                });
            }

        } catch (error) {
            // Set task to error state when sending fails
            if (taskIdRef.current) {
                updateTask(taskIdRef.current, { status: 'error' });
            }
            console.error('Failed to send message:', error);
            antdMessage.error('Failed to send message');
        }
    }


    // Task termination handling (manual click cancel button)
    const handleCancelTask = async () => {
        if (!currentTaskId) {
            antdMessage.error('No task currently running');
            return;
        }

        const success = await terminateCurrentTask('User manually terminated');
        if (success) {
            antdMessage.success('Task terminated');
        } else {
            antdMessage.error('Failed to terminate task');
        }
    };

    return (
        <>
            <Header />
            <div className='bg-main-view bg-origin-padding bg-no-repeat bg-cover h-[calc(100%_-_48px)] overflow-y-auto text-text-01-dark flex'>
                <div className='flex-1 h-full transition-all duration-300'>
                    <div className='w-[636px] mx-auto flex flex-col gap-2 pt-7 pb-4 h-full relative'>
                        {/* Task title and history button */}
                        <div className='absolute top-0 left-0 w-full flex items-center justify-between'>
                            <div className='line-clamp-1 text-xl font-semibold flex-1'>
                                {currentTaskId && tasks.find(task => task.id === currentTaskId)?.name}
                                {isHistoryMode && (
                                    <span className='ml-2 text-sm text-gray-500'>(History Task - Read Only)</span>
                                )}
                            </div>
                        </div>
                        {/* Message list */}
                        <div
                            ref={scrollContainerRef}
                            className='flex-1 h-full overflow-x-hidden overflow-y-auto px-4 pt-5'
                            onScroll={handleScroll}
                        >
                            <MessageList messages={messages} onToolClick={handleToolClick} />
                        </div>
                        {/* Question input box */}
                        <div className='h-30 gradient-border relative'>
                            <Input.TextArea
                                value={query}
                                onKeyDown={handleKeyDown}
                                onChange={(e) => setQuery(e.target.value)}
                                className="!h-full !bg-tool-call !text-text-01-dark !placeholder-text-12-dark !py-2"
                                placeholder={isHistoryMode ? 'History tasks are read-only mode, cannot input new messages' : 'Enter your question...'}
                                disabled={isHistoryMode}
                            />

                            {/* Send/Cancel button - only shown in non-history mode */}
                            {!isHistoryMode && (
                                <div className="absolute right-3 bottom-3">
                                    {isCurrentTaskRunning ? (
                                        <span 
                                        className='bg-ask-status rounded-md flex justify-center items-center w-7 h-7 cursor-pointer'
                                        onClick={handleCancelTask}>
                                            <CancleTask className="w-5 h-5" />
                                        </span>
                                    ) : (
                                        <span
                                        className={`bg-ask-status rounded-md flex justify-center items-center w-7 h-7 cursor-pointer ${
                                           query ? '' : '!cursor-not-allowed opacity-60' 
                                        }`}
                                        onClick={() => sendMessage(query)}>
                                            <SendMessage className="w-5 h-5" />
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
                <div className='h-full transition-all pt-5 pb-4 pr-4 duration-300 text-text-01-dark' style={{ width: showDetail ? '800px' : '0px' }}>
                    {showDetail && (
                        <div className='h-full border-border-message border flex flex-col rounded-xl'>
                            {/* Detail panel title */}
                            <div className='p-4'>
                                <h3 className='text-xl font-semibold'>Jarvis's Computer</h3>
                                <div className='flex flex-col items-start justify-centerce px-5 py-3 gap-3 border-border-message border rounded-md h-[80px] bg-tool-call mt-3'>
                                    {currentTool && (
                                        <>
                                            <div className='border-b w-full border-dashed border-border-message flex items-center'>
                                                Jarvis is using tool
                                                <div className={`w-2 h-2 ml-2 rounded-full ${currentTool.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                                        currentTool.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                                                    }`}></div>
                                                <span className='ml-1 text-xs text-text-12-dark'>
                                                    {currentTool.status === 'running' ? 'Running' :
                                                        currentTool.status === 'completed' ? 'Completed' : 'Execution Error'}
                                                </span>

                                            </div>
                                            <h3 className='text-sm text-text-12-dark'>
                                                {currentTool.toolName} - {currentTool.operation}
                                            </h3>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Detail panel content area - reserved space */}
                            <div className='p-4 pt-0 flex-1 '>
                                <div className='border-border-message border rounded-md h-full flex flex-col'>
                                    <div className='h-[42px] bg-tool-call rounded-md flex items-center justify-center p-2'>
                                        {currentUrl && (
                                            <div className='text-xs text-text-12-dark line-clamp-1'>
                                                {currentUrl}
                                            </div>
                                        )}
                                    </div>
                                    <div className='flex-1'></div>
                                    <div className='h-[42px] bg-tool-call rounded-md flex items-center px-3'>
                                        {/* Tool call progress bar */}
                                        {toolHistory.length > 0 && (
                                            <div className='flex-1 flex items-center gap-2'>
                                                {/* Forward/Backward button group */}
                                                <div className='flex items-center border border-border-message rounded'>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        disabled={toolHistory.length === 0 || (currentHistoryIndex === 0)}
                                                        onClick={() => {
                                                            const newIndex = currentHistoryIndex === -1 ? toolHistory.length - 2 : currentHistoryIndex - 1;
                                                            switchToHistoryIndex(Math.max(0, newIndex));
                                                        }}
                                                        className='!border-0 !rounded-r-none'
                                                    >
                                                        <StepUpDown className='w-3 h-3' />
                                                    </Button>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        disabled={currentHistoryIndex === -1}
                                                        onClick={() => switchToHistoryIndex(currentHistoryIndex + 1)}
                                                        className='!border-0 !rounded-l-none border-l border-border-message'
                                                    >
                                                        <StepUpDown className='rotate-180 w-3 h-3' />
                                                    </Button>
                                                </div>

                                                <Slider
                                                    className='flex-1'
                                                    min={0}
                                                    max={toolHistory.length}
                                                    value={currentHistoryIndex === -1 ? toolHistory.length : currentHistoryIndex + 1}
                                                    onChange={(value) => switchToHistoryIndex(value - 1)}
                                                    step={1}
                                                    marks={toolHistory.reduce((marks, _, index) => {
                                                        marks[index + 1] = '';
                                                        return marks;
                                                    }, {} as Record<number, string>)}
                                                />

                                                <span className='text-xs text-text-12-dark'>
                                                    Real-time
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </>
    )
}
