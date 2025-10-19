import React from 'react';
import { 
  Input, 
  Card, 
  Button, 
  Space, 
  Spin
} from "antd";
import { 
  SendOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (value: string) => void;
  sendMessage: () => void;
  isLoading: boolean;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

export const ChatInput = ({ 
  inputMessage, 
  setInputMessage, 
  sendMessage, 
  isLoading, 
  onKeyPress 
}: ChatInputProps) => {
  return (
    <Card>
      <Space.Compact style={{ width: '100%' }}>
        <TextArea
          placeholder="Please enter your question... (Shift+Enter for new line, Enter to send)"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={onKeyPress}
          disabled={isLoading}
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ resize: 'none' }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={isLoading}
          onClick={sendMessage}
          disabled={!inputMessage.trim() || isLoading}
          style={{ height: 'auto', minHeight: '32px' }}
        >
          Send
        </Button>
      </Space.Compact>
      
      {isLoading && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <Space>
            <Spin size="small" />
            <span style={{ color: '#999', fontSize: '14px' }}>AI is thinking...</span>
          </Space>
        </div>
      )}
    </Card>
  );
}; 