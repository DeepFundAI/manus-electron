import React from 'react';
import { Form, Radio, InputNumber, Select, Space } from 'antd';
import { ScheduleConfig } from '@/models';

interface ScheduleConfigEditorProps {
  value?: ScheduleConfig;
  onChange?: (value: ScheduleConfig) => void;
}

/**
 * Schedule configuration editor
 * Supports interval time and Cron expression two methods
 */
export const ScheduleConfigEditor: React.FC<ScheduleConfigEditorProps> = ({ value, onChange }) => {
  const [scheduleType, setScheduleType] = React.useState<'interval' | 'cron'>(value?.type || 'interval');
  const [intervalUnit, setIntervalUnit] = React.useState<'minute' | 'hour' | 'day'>(
    value?.intervalUnit || 'minute'
  );
  const [intervalValue, setIntervalValue] = React.useState<number>(value?.intervalValue || 1);
  const [cronExpression, setCronExpression] = React.useState<string>(value?.cronExpression || '');

  const handleChange = () => {
    const config: ScheduleConfig = {
      type: scheduleType,
      ...(scheduleType === 'interval'
        ? { intervalUnit, intervalValue }
        : { cronExpression }),
    };

    onChange?.(config);
  };

  React.useEffect(() => {
    handleChange();
  }, [scheduleType, intervalUnit, intervalValue, cronExpression]);

  const getIntervalText = () => {
    const unitText = {
      minute: 'minutes',
      hour: 'hours',
      day: 'days',
    };
    return `Execute every ${intervalValue} ${unitText[intervalUnit]}`;
  };

  return (
    <div className="schedule-config-editor">
      <Form.Item label="Schedule type">
        <Radio.Group
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value)}
        >
          <Radio value="interval">Interval time</Radio>
          <Radio value="cron" disabled>
            Cron expression (not supported yet)
          </Radio>
        </Radio.Group>
      </Form.Item>

      {scheduleType === 'interval' && (
        <Form.Item label="Execution interval">
          <Space>
            <span>Every</span>
            <InputNumber
              min={1}
              max={999}
              value={intervalValue}
              onChange={(val) => setIntervalValue(val || 1)}
              className="!w-20"
            />
            <Select
              value={intervalUnit}
              onChange={(val) => setIntervalUnit(val)}
              className="!w-24"
            >
              <Select.Option value="minute">minutes</Select.Option>
              <Select.Option value="hour">hours</Select.Option>
              <Select.Option value="day">days</Select.Option>
            </Select>
            <span>execute once</span>
          </Space>
        </Form.Item>
      )}

      {scheduleType === 'cron' && (
        <Form.Item label="Cron expression">
          <input
            type="text"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="Example: 0 0 * * * (every day at 0:00)"
            className="ant-input"
            disabled
          />
          <div className="mt-2 text-sm text-gray-400">
            Cron expression not supported yet, stay tuned
          </div>
        </Form.Item>
      )}

      <div className="mt-4 p-3 bg-tool-call rounded border border-border-message">
        <div className="text-sm text-text-12-dark">
          <strong>Execution rule:</strong>
          {scheduleType === 'interval' ? getIntervalText() : 'Execute based on Cron expression'}
        </div>
      </div>
    </div>
  );
};
