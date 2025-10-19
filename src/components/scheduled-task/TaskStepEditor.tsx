import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, List, Space, Card } from 'antd';
import { DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons';
import { TaskStep, TaskTemplate } from '@/models';
import { useScheduledTaskStore } from '@/stores/scheduled-task-store';

interface TaskStepEditorProps {
  value?: TaskStep[];
  onChange?: (steps: TaskStep[]) => void;
}

/**
 * Task step editor
 * Supports manual step addition and API template import
 */
export const TaskStepEditor: React.FC<TaskStepEditorProps> = ({ value = [], onChange }) => {
  const [steps, setSteps] = useState<TaskStep[]>(value);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const { templates, loadTemplates } = useScheduledTaskStore();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setSteps(value);
  }, [value]);

  // Add new step
  const handleAddStep = () => {
    const newStep: TaskStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: '',
      content: '',
      order: steps.length + 1,
    };

    const newSteps = [...steps, newStep];
    setSteps(newSteps);
    onChange?.(newSteps);
  };

  // Update step
  const handleUpdateStep = (id: string, updates: Partial<TaskStep>) => {
    const newSteps = steps.map((step) =>
      step.id === id ? { ...step, ...updates } : step
    );
    setSteps(newSteps);
    onChange?.(newSteps);
  };

  // Delete step
  const handleRemoveStep = (id: string) => {
    const newSteps = steps.filter((step) => step.id !== id);
    // Reorder
    const reorderedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index + 1,
    }));
    setSteps(reorderedSteps);
    onChange?.(reorderedSteps);
  };

  // Import steps from API
  const handleImportFromTemplate = (template: TaskTemplate) => {
    const importedSteps: TaskStep[] = template.steps.map((step) => ({
      ...step,
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }));

    setSteps(importedSteps);
    onChange?.(importedSteps);
    setShowTemplateModal(false);
  };

  // Move step up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newSteps = [...steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];

    // Reorder
    const reorderedSteps = newSteps.map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));

    setSteps(reorderedSteps);
    onChange?.(reorderedSteps);
  };

  // Move step down
  const handleMoveDown = (index: number) => {
    if (index === steps.length - 1) return;

    const newSteps = [...steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];

    // Reorder
    const reorderedSteps = newSteps.map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));

    setSteps(reorderedSteps);
    onChange?.(reorderedSteps);
  };

  return (
    <div className="task-step-editor">
      {/* Action buttons */}
      <div className="mb-4 flex gap-2">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddStep}
        >
          Manual add step
        </Button>
        <Button onClick={() => setShowTemplateModal(true)}>
          Import from API template
        </Button>
      </div>

      {/* Step list */}
      {steps.length === 0 ? (
        <div className="text-center py-8 text-text-12-dark bg-tool-call rounded border border-border-message">
          No steps yet, please add task steps
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => (
            <Card
              key={step.id}
              className="!bg-tool-call !border-border-message"
              size="small"
            >
              <div className="flex items-start gap-3">
                {/* Step number and drag icon */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <HolderOutlined className="text-text-12-dark cursor-move" />
                  <span className="text-sm font-bold text-text-01-dark">
                    {index + 1}
                  </span>
                </div>

                {/* Step content */}
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Step name"
                    value={step.name}
                    onChange={(e) =>
                      handleUpdateStep(step.id, { name: e.target.value })
                    }
                    className="!bg-main-view !border-border-message !text-text-01-dark"
                  />
                  <Input.TextArea
                    placeholder="Step description (will be part of the prompt)"
                    value={step.content}
                    onChange={(e) =>
                      handleUpdateStep(step.id, { content: e.target.value })
                    }
                    rows={2}
                    className="!bg-main-view !border-border-message !text-text-01-dark"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1">
                  <Button
                    size="small"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === steps.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveStep(step.id)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Template selection modal */}
      <Modal
        open={showTemplateModal}
        onCancel={() => setShowTemplateModal(false)}
        title="Select task template"
        footer={null}
        width={600}
      >
        <List
          dataSource={templates}
          renderItem={(template) => (
            <List.Item
              className="cursor-pointer hover:bg-tool-call px-4 rounded"
              onClick={() => handleImportFromTemplate(template)}
            >
              <List.Item.Meta
                title={<span className="text-text-01-dark">{template.name}</span>}
                description={
                  <div className="text-text-12-dark">
                    <div>{template.description}</div>
                    <div className="mt-1 text-xs">
                      Contains {template.steps.length} steps
                      {template.category && ` · ${template.category}`}
                    </div>
                  </div>
                }
              />
              <Button type="primary" size="small">
                Select
              </Button>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};
