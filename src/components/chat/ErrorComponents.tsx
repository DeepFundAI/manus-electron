import React from 'react';
import { 
  Alert, 
  Button, 
  Typography
} from "antd";

const { Text } = Typography;

interface ErrorAlertProps {
  hasError: boolean;
  errorInfo: string;
  onClose: () => void;
  onContinue: () => void;
}

export const ErrorAlert = ({ 
  hasError, 
  errorInfo, 
  onClose, 
  onContinue 
}: ErrorAlertProps) => {
  if (!hasError) return null;
  
  return (
    <Alert
      message="API Request Error"
      description={
        <div>
          <div>{errorInfo}</div>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 Tip: The system will automatically retry and compress context, you can continue using other features
            </Text>
          </div>
        </div>
      }
      type="error"
      showIcon
      closable
      onClose={onClose}
      style={{ marginBottom: 16 }}
      action={
        <Button 
          size="small" 
          type="primary" 
          onClick={onContinue}
        >
          Continue
        </Button>
      }
    />
  );
};
