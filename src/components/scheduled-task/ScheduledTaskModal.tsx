import React, { useEffect } from 'react';
import { Modal, Form, Input, Switch, message } from 'antd';
import { TaskStepEditor } from './TaskStepEditor';
import { ScheduleConfigEditor } from './ScheduleConfigEditor';
import { useScheduledTaskStore } from '@/stores/scheduled-task-store';
import { TaskStep, ScheduleConfig } from '@/models';

/**
 * Scheduled task create/edit modal
 */
export const ScheduledTaskModal: React.FC = () => {
  const [form] = Form.useForm();

  const {
    showCreateModal,
    setShowCreateModal,
    isEditMode,
    selectedTask,
    createTask,
    updateTask,
  } = useScheduledTaskStore();

  // Initialize form
  useEffect(() => {
    if (showCreateModal) {
      if (isEditMode && selectedTask) {
        // Edit mode: populate existing data
        form.setFieldsValue({
          name: selectedTask.name,
          description: selectedTask.description,
          steps: selectedTask.steps,
          schedule: selectedTask.schedule,
          enabled: selectedTask.enabled,
        });
      } else {
        // Create mode: reset form
        form.resetFields();
        form.setFieldsValue({
          enabled: true,
          schedule: {
            type: 'interval',
            intervalUnit: 'minute',
            intervalValue: 1,
          },
          steps: [],
        });
      }
    }
  }, [showCreateModal, isEditMode, selectedTask, form]);

  // Submit form
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Validate steps
      if (!values.steps || values.steps.length === 0) {
        message.error('Please add at least one task step');
        return;
      }

      // Validate step content
      const hasEmptyStep = values.steps.some(
        (step: TaskStep) => !step.name || !step.content
      );

      if (hasEmptyStep) {
        message.error('Please fill in complete step information');
        return;
      }

      if (isEditMode && selectedTask) {
        // Update task
        await updateTask(selectedTask.id, {
          name: values.name,
          description: values.description,
          steps: values.steps,
          schedule: values.schedule,
          enabled: values.enabled,
          source: 'manual', // Manually created task
        });

        message.success('Task updated successfully');
      } else {
        // Create task
        await createTask({
          name: values.name,
          description: values.description,
          steps: values.steps,
          schedule: values.schedule,
          enabled: values.enabled,
          source: 'manual',
        });

        message.success('Task created successfully');
      }

      handleCancel();
    } catch (error: any) {
      console.error('Submit failed:', error);
      message.error(error.message || 'Operation failed');
    }
  };

  // Cancel
  const handleCancel = () => {
    form.resetFields();
    setShowCreateModal(false);
  };

  return (
    <Modal
      open={showCreateModal}
      onCancel={handleCancel}
      onOk={handleSubmit}
      title={isEditMode ? 'Edit scheduled task' : 'Create scheduled task'}
      width={800}
      okText={isEditMode ? 'Save' : 'Create and enable'}
      cancelText="Cancel"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="mt-4"
      >
        {/* Task name */}
        <Form.Item
          name="name"
          label="Task name"
          rules={[{ required: true, message: 'Please enter task name' }]}
        >
          <Input
            placeholder="Please enter task name"
            className="!bg-main-view !border-border-message !text-text-01-dark"
          />
        </Form.Item>

        {/* Task description */}
        <Form.Item
          name="description"
          label="Task description (optional)"
        >
          <Input.TextArea
            placeholder="Please enter task description"
            rows={2}
            className="!bg-main-view !border-border-message !text-text-01-dark"
          />
        </Form.Item>

        {/* Task steps */}
        <Form.Item
          name="steps"
          label="Task steps"
          rules={[
            {
              validator: async (_, value) => {
                if (!value || value.length === 0) {
                  throw new Error('Please add at least one task step');
                }
              },
            },
          ]}
        >
          <TaskStepEditor />
        </Form.Item>

        {/* Schedule configuration */}
        <Form.Item
          name="schedule"
          label="Schedule configuration"
          rules={[{ required: true, message: 'Please configure execution interval' }]}
        >
          <ScheduleConfigEditor />
        </Form.Item>

        {/* Whether to enable */}
        <Form.Item
          name="enabled"
          label="Enable immediately after creation"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};
