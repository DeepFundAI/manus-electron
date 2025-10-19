import React, { useState, useEffect } from 'react';
import { Button, Input, List, Modal, Drawer, message, Tooltip, Space, Tag, Popconfirm } from 'antd';
import { SearchOutlined, DeleteOutlined, EyeOutlined, ClearOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Task, TaskStatus, TaskType } from '@/models';
import { taskStorage } from '@/lib/taskStorage';

const { Search } = Input;

/**
 * History panel display item (unified for normal tasks and scheduled tasks)
 */
interface HistoryItem {
  id: string; // task.id for normal tasks, scheduledTaskId for scheduled tasks
  name: string;
  taskType: TaskType;
  status?: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  scheduledTaskId?: string; // Scheduled task configuration ID
  latestExecution?: Task; // Latest execution record for scheduled tasks
  executionCount?: number; // Execution count for scheduled tasks
  originalTask?: Task; // Original data for normal tasks
}

interface HistoryPanelProps {
  visible: boolean;
  onClose: () => void;
  onSelectTask: (task: Task) => void;
  currentTaskId?: string;
  isTaskDetailMode?: boolean;
  scheduledTaskId?: string;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  visible,
  onClose,
  onSelectTask,
  currentTaskId,
  isTaskDetailMode = false,
  scheduledTaskId
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    running: 0,
    error: 0
  });

  /**
   * Load and process historical data
   * If in scheduled task detail mode, only show execution history for that scheduled task
   * Otherwise, merge normal tasks and scheduled task execution history
   */
  const loadTasks = async () => {
    setLoading(true);
    try {
      if (isTaskDetailMode && scheduledTaskId) {
        // Scheduled task detail mode: only show all execution history for this scheduled task
        const executions = await taskStorage.getExecutionsByScheduledTaskId(scheduledTaskId);

        const items: HistoryItem[] = executions.map(task => ({
          id: task.id,
          name: task.name,
          taskType: 'scheduled',
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          scheduledTaskId: task.scheduledTaskId,
          originalTask: task,
        }));

        setHistoryItems(items);
        setFilteredItems(items);

        // Statistics
        setStats({
          total: items.length,
          completed: items.filter(item => item.status === 'done').length,
          running: items.filter(item => item.status === 'running').length,
          error: items.filter(item => item.status === 'error' || item.status === 'abort').length
        });
      } else {
        // Main history panel mode: merge normal tasks and scheduled tasks
        const allTasks = await taskStorage.getAllTasks();

        // Separate normal tasks and scheduled task execution history
        const normalTasks = allTasks.filter(t => t.taskType === 'normal');
        const scheduledExecutions = allTasks.filter(t => t.taskType === 'scheduled');

        // Group scheduled task execution history by scheduledTaskId
        const scheduledGroups = new Map<string, Task[]>();
        scheduledExecutions.forEach(task => {
          if (task.scheduledTaskId) {
            if (!scheduledGroups.has(task.scheduledTaskId)) {
              scheduledGroups.set(task.scheduledTaskId, []);
            }
            scheduledGroups.get(task.scheduledTaskId)!.push(task);
          }
        });

        // Build history item list
        const items: HistoryItem[] = [];

        // Add normal tasks
        normalTasks.forEach(task => {
          items.push({
            id: task.id,
            name: task.name,
            taskType: 'normal',
            status: task.status,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            originalTask: task,
          });
        });

        // Add scheduled tasks (each scheduled task only shows the latest execution)
        scheduledGroups.forEach((executions, scheduledTaskId) => {
          // Sort by updatedAt, take the latest one
          const sortedExecutions = executions.sort((a, b) =>
            b.updatedAt.getTime() - a.updatedAt.getTime()
          );
          const latestExecution = sortedExecutions[0];

          items.push({
            id: scheduledTaskId, // Use scheduledTaskId as unique identifier
            name: latestExecution.name,
            taskType: 'scheduled',
            status: latestExecution.status,
            createdAt: latestExecution.createdAt,
            updatedAt: latestExecution.updatedAt,
            scheduledTaskId,
            latestExecution,
            executionCount: executions.length,
          });
        });

        // Sort by updatedAt in descending order (newest first)
        items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        setHistoryItems(items);
        setFilteredItems(items);

        // Statistics
        setStats({
          total: items.length,
          completed: items.filter(item => item.status === 'done').length,
          running: items.filter(item => item.status === 'running').length,
          error: items.filter(item => item.status === 'error' || item.status === 'abort').length
        });
      }
    } catch (error) {
      console.error('Failed to load history tasks:', error);
      message.error('Failed to load history tasks');
    } finally {
      setLoading(false);
    }
  };

  // Search history items
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    if (!value.trim()) {
      setFilteredItems(historyItems);
      return;
    }

    const keyword = value.trim().toLowerCase();
    const filtered = historyItems.filter(item =>
      item.name.toLowerCase().includes(keyword) ||
      item.id.toLowerCase().includes(keyword)
    );
    setFilteredItems(filtered);
  };

  // Delete single history item
  const handleDeleteTask = async (item: HistoryItem) => {
    console.log('Attempting to delete:', item);
    try {
      if (item.taskType === 'scheduled' && !isTaskDetailMode) {
        // Scheduled task in main panel: delete all execution history for this scheduled task
        const executions = await taskStorage.getExecutionsByScheduledTaskId(item.scheduledTaskId!);
        await Promise.all(executions.map(task => taskStorage.deleteTask(task.id)));
        message.success(`Deleted ${executions.length} execution history records for scheduled task`);
      } else {
        // Normal task or single execution history in scheduled task detail mode
        await taskStorage.deleteTask(item.id);
        message.success('Task deleted');
      }
      await loadTasks();
    } catch (error) {
      console.error('Delete failed:', error);
      message.error('Delete failed');
    }
  };

  // Clear all history
  const handleClearAll = async () => {
    console.log('Attempting to clear all history');
    try {
      if (isTaskDetailMode && scheduledTaskId) {
        // Scheduled task detail mode: clear all execution history for this task
        const executions = await taskStorage.getExecutionsByScheduledTaskId(scheduledTaskId);
        await Promise.all(executions.map(task => taskStorage.deleteTask(task.id)));
        message.success('Execution history cleared');
      } else {
        // Main panel mode: clear all tasks
        await taskStorage.clearAllTasks();
        message.success('History tasks cleared');
      }
      await loadTasks();
    } catch (error) {
      console.error('Clear failed:', error);
      message.error('Clear failed');
    }
  };

  /**
   * Handle history item click
   * - Normal task: display directly
   * - Scheduled task (main panel): open scheduled task window
   * - Scheduled task (detail mode): show specific execution record
   */
  const handleSelectItem = async (item: HistoryItem) => {
    console.log('Selecting history item:', item);

    if (item.taskType === 'scheduled' && !isTaskDetailMode) {
      // Scheduled task in main panel: call main process to open scheduled task window
      try {
        if (typeof window !== 'undefined' && (window as any).api) {
          await (window as any).api.invoke('open-task-history', item.scheduledTaskId);
          message.success('Opening scheduled task window');
          onClose(); // Close history panel
        }
      } catch (error) {
        console.error('Failed to open scheduled task window:', error);
        message.error('Failed to open scheduled task window');
      }
    } else {
      // Normal task or scheduled task detail mode: display directly
      const task = item.originalTask || item.latestExecution;
      if (task) {
        onSelectTask(task);
        message.info('Switched to history task view mode');
      }
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status tag
  const getStatusTag = (status?: TaskStatus) => {
    switch (status) {
      case 'done':
        return <Tag color="green">Completed</Tag>;
      case 'running':
        return <Tag color="blue">Running</Tag>;
      case 'error':
        return <Tag color="red">Error</Tag>;
      case 'abort':
        return  <Tag color="red">Aborted</Tag>;
      default:
        return <Tag color="default">Unknown</Tag>;
    }
  };

  // Load tasks when component mounts
  useEffect(() => {
    if (visible) {
      loadTasks();
    }
  }, [visible]);

  return (
    <Drawer
      title={isTaskDetailMode ? "Execution History" : "History"}
      placement="left"
      size="large"
      open={visible}
      onClose={onClose}
      width={480}
      className="history-panel-drawer"
      styles={{
        wrapper: {
          marginTop: '48px', // header height
          height: 'calc(100vh - 48px)' // subtract header height
        },
        body: {
          padding: '16px',
          height: '100%'
        }
      }}
      extra={
        <Space>
          <Popconfirm
            title="Confirm Clear"
            description={isTaskDetailMode ? "Are you sure you want to clear all execution history for this task? This action cannot be undone." : "Are you sure you want to clear all history tasks? This action cannot be undone."}
            okText="Confirm"
            cancelText="Cancel"
            okType="danger"
            onConfirm={handleClearAll}
          >
            <Button danger icon={<ClearOutlined />}>
              Clear History
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <div className="space-y-4 flex flex-col h-full">
        {/* Search box */}
        <Search
          placeholder="Search task name or ID..."
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          onChange={(e) => !e.target.value && handleSearch('')}
        />

        {/* Unified history item list */}
        <List
          loading={loading}
          dataSource={filteredItems}
          rowKey="id"
          size="small"
          className="overflow-y-auto flex-1"
          locale={{ emptyText: isTaskDetailMode ? 'No execution history yet' : 'No history tasks yet' }}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              className={`cursor-pointer transition-colors ${
                currentTaskId === item.id ? 'opacity-80' : 'hover:opacity-70'
              }`}
              style={{
                backgroundColor: currentTaskId === item.id ? 'rgba(126, 141, 255, 0.1)' : undefined,
                borderLeft: currentTaskId === item.id ? '3px solid #7E8DFF' : undefined
              }}
              onClick={() => handleSelectItem(item)}
              actions={[
                item.taskType === 'normal' && (
                  <Tooltip key="view" title="View details">
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectItem(item);
                      }}
                    />
                  </Tooltip>
                ),
                <Popconfirm
                  key="delete"
                  title="Confirm Delete"
                  description={
                    item.taskType === 'scheduled' && !isTaskDetailMode
                      ? `Are you sure you want to delete all ${item.executionCount || 0} execution history records for this scheduled task? This action cannot be undone.`
                      : 'Are you sure you want to delete this history task? This action cannot be undone.'
                  }
                  okText="Confirm"
                  cancelText="Cancel"
                  okType="danger"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDeleteTask(item);
                  }}
                >
                  <Tooltip title={item.taskType === 'scheduled' && !isTaskDetailMode ? "Delete all execution history" : "Delete task"}>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Popconfirm>
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      {item.taskType === 'scheduled' && (
                        <ClockCircleOutlined className="text-blue-500" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {item.name}
                      </span>
                    </div>
                    {getStatusTag(item.status)}
                  </div>
                }
                description={
                  <div className="text-xs opacity-70">
                    <div className="flex items-center justify-between">
                      <span>ID: {item.id.slice(0, 16)}...</span>
                      {item.taskType === 'scheduled' && item.executionCount && !isTaskDetailMode && (
                        <Tag color="blue">
                          {item.executionCount} executions
                        </Tag>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span>Created: {formatTime(item.createdAt)}</span>
                      <span>Updated: {formatTime(item.updatedAt)}</span>
                    </div>
                    {item.originalTask?.messages && item.originalTask.messages.length > 0 && (
                      <div className="mt-1 opacity-90">
                        {item.originalTask.messages.length} messages
                      </div>
                    )}
                    {item.latestExecution?.messages && item.latestExecution.messages.length > 0 && (
                      <div className="mt-1 opacity-90">
                        {item.latestExecution.messages.length} messages
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />

        {/* Information message */}
        {!isTaskDetailMode && (
          <div className="text-center text-sm p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)' }}>
            <div className="font-medium mb-1" style={{ color: '#FF9500' }}>
              📋 History Session is Read-Only Mode
            </div>
            <div className="opacity-80">
              Selecting history will enter view mode and you cannot continue the conversation temporarily. To continue similar tasks, click the DeepFundAI icon to create a new session.
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default HistoryPanel;