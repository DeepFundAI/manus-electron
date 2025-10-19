import React, { useEffect } from 'react';
import { Drawer, List, Button, Switch, Popconfirm, Tag, Empty, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useScheduledTaskStore } from '@/stores/scheduled-task-store';
import { ScheduledTask } from '@/models';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * Scheduled task list panel
 */
export const ScheduledTaskListPanel: React.FC = () => {
  const {
    showListPanel,
    setShowListPanel,
    scheduledTasks,
    loadScheduledTasks,
    toggleTaskEnabled,
    deleteTask,
    selectTask,
    setShowCreateModal,
    setIsEditMode,
    executeTaskNow,
  } = useScheduledTaskStore();

  useEffect(() => {
    if (showListPanel) {
      loadScheduledTasks();
    }
  }, [showListPanel]);

  // Edit task
  const handleEdit = (task: ScheduledTask) => {
    selectTask(task);
    setIsEditMode(true);
    setShowCreateModal(true);
  };

  // Delete task
  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      message.success('Task deleted successfully');
    } catch (error) {
      message.error('Delete failed');
    }
  };

  // Execute immediately
  const handleExecuteNow = async (task: ScheduledTask) => {
    try {
      await executeTaskNow(task);
      message.success('Task has started executing');
    } catch (error) {
      message.error('Execution failed');
    }
  };

  // View execution history
  const handleViewHistory = async (task: ScheduledTask) => {
    try {
      // Call main process to open task window history panel
      if (typeof window !== 'undefined' && (window as any).api) {
        await (window as any).api.invoke('open-task-history', task.id);
        message.success('Opening execution history');
        // Close task list panel
        setShowListPanel(false);
      }
    } catch (error) {
      console.error('Failed to open execution history:', error);
      message.error('Failed to open execution history');
    }
  };

  // Get interval description
  const getIntervalText = (task: ScheduledTask) => {
    const { schedule } = task;
    if (schedule.type === 'interval') {
      const unitText = {
        minute: 'minutes',
        hour: 'hours',
        day: 'days',
      };
      return `Every ${schedule.intervalValue} ${unitText[schedule.intervalUnit!]}`;
    }
    return 'Cron';
  };

  // Get last execution time description
  const getLastExecutedText = (task: ScheduledTask) => {
    if (!task.lastExecutedAt) {
      return 'Never executed';
    }

    try {
      return formatDistanceToNow(new Date(task.lastExecutedAt), {
        addSuffix: true,
        locale: zhCN,
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <>
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span>Scheduled task list</span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setIsEditMode(false);
                selectTask(null);
                setShowCreateModal(true);
              }}
            >
              New task
            </Button>
          </div>
        }
        open={showListPanel}
        onClose={() => setShowListPanel(false)}
        width={500}
        className="scheduled-task-list-panel"
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
      >
        {scheduledTasks.length === 0 ? (
          <Empty
            description="No scheduled tasks yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => {
                setIsEditMode(false);
                selectTask(null);
                setShowCreateModal(true);
              }}
            >
              Create first task
            </Button>
          </Empty>
        ) : (
          <List
            dataSource={scheduledTasks}
            renderItem={(task) => (
              <List.Item
                className="!bg-tool-call !border !border-border-message rounded-lg px-4 mb-3"
                key={task.id}
              >
                <div className="w-full px-2">
                  {/* Task header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-text-01-dark m-0">
                          {task.name}
                        </h4>
                        <Tag color={task.enabled ? 'success' : 'default'}>
                          {task.enabled ? 'Enabled' : 'Disabled'}
                        </Tag>
                      </div>
                      {task.description && (
                        <p className="text-sm text-text-12-dark m-0 mb-2">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Enable switch */}
                    <Switch
                      checked={task.enabled}
                      onChange={() => toggleTaskEnabled(task.id)}
                      checkedChildren="Enable"
                      unCheckedChildren="Disable"
                    />
                  </div>

                  {/* Task information */}
                  <div className="flex items-center gap-4 text-sm text-text-12-dark mb-3">
                    <span>
                      <ClockCircleOutlined className="mr-1" />
                      {getIntervalText(task)}
                    </span>
                    <span>Last executed: {getLastExecutedText(task)}</span>
                    <span>Steps: {task.steps.length}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleExecuteNow(task)}
                      disabled={!task.enabled}
                    >
                      Execute now
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleViewHistory(task)}
                    >
                      Execution history
                    </Button>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(task)}
                    >
                      Edit
                    </Button>
                    <Popconfirm
                      title="Confirm deletion"
                      description="Once deleted, it cannot be recovered. Are you sure you want to delete this task?"
                      onConfirm={() => handleDelete(task.id)}
                      okText="Delete"
                      cancelText="Cancel"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                      >
                        Delete
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
};
