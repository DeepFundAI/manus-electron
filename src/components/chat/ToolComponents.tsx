import React from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Tag, 
  Spin,
  Alert,
  Descriptions,
  Timeline,
  Collapse,
  Button
} from "antd";
import { 
  ToolOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CodeOutlined,
  FileTextOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Tool usage component
export const ToolUseDisplay = ({ toolName, params }: { toolName: string; params: any }) => {
  const [showParams, setShowParams] = React.useState(false);
  
  const getToolIcon = (name: string) => {
    if (name.includes('current_page') || name.includes('browser')) return <FileTextOutlined />;
    if (name.includes('click') || name.includes('type')) return <PlayCircleOutlined />;
    return <ToolOutlined />;
  };

     const getToolDescription = (name: string) => {
     const descriptions: Record<string, string> = {
       'current_page': 'Get current page information',
       'click': 'Click page element',
       'type': 'Input text',
       'scroll': 'Scroll page',
       'navigate': 'Navigate to page',
       'wait': 'Wait for page load',
       'screenshot': 'Capture page screenshot'
     };
     return descriptions[name] || 'Execute tool operation';
   };

  const formatParams = (params: any) => {
    if (!params || typeof params !== 'object' || Object.keys(params).length === 0) {
      return [{ key: 'empty', label: 'Parameters', children: 'No parameters' }];
    }
    
    const items = Object.entries(params).map(([key, value]) => ({
      key,
      label: key,
      children: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    }));

    return items;
  };

  return (
    <Card 
      size="small" 
      style={{ 
        backgroundColor: '#f0f9ff', 
        border: '1px solid #bae6fd',
        borderRadius: '8px'
      }}
      title={
        <Space>
          {getToolIcon(toolName)}
          <Text strong style={{ color: '#0369a1' }}>{toolName}</Text>
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={showParams ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setShowParams(!showParams)}
        >
          {showParams ? 'Hide' : 'View'} Parameters
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Tag row */}
        <div>
          <Tag color="blue" style={{ fontSize: '11px' }}>Tool Call</Tag>
        </div>

        {/* Tool description */}
        <Text type="secondary" style={{ fontSize: '13px' }}>
          {getToolDescription(toolName)}
        </Text>

        {/* Parameter display */}
        {showParams && (
          <Collapse size="small" ghost>
            <Panel header="Call Parameters" key="params">
              <Descriptions
                size="small"
                column={1}
                items={formatParams(params)}
                labelStyle={{ fontWeight: 'bold', width: '100px' }}
              />
            </Panel>
          </Collapse>
        )}
      </Space>
    </Card>
  );
};

// Tool running component
export const ToolRunningDisplay = ({ toolName, text }: { toolName: string; text: string }) => {
  return (
    <Card 
      size="small" 
      style={{ 
        backgroundColor: '#fefce8', 
        border: '1px solid #fde047',
        borderRadius: '8px'
      }}
      title={
        <Space>
          <Spin size="small" indicator={<LoadingOutlined style={{ color: '#ca8a04' }} />} />
          <Text strong style={{ color: '#a16207' }}>{toolName}</Text>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Status tag */}
        <div>
          <Tag color="warning" style={{ fontSize: '11px' }}>Executing</Tag>
        </div>

        {/* Execution information */}
        {text && (
          <div style={{ padding: '6px 10px', backgroundColor: '#fffbeb', borderRadius: '4px' }}>
            <Text style={{ fontSize: '12px', color: '#92400e' }}>{text}</Text>
          </div>
        )}
      </Space>
    </Card>
  );
};

// Tool result display component
export const ToolResultDisplay = ({ toolName, params, result }: { 
  toolName: string; 
  params: any; 
  result: any; 
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  
  const formatResult = (result: any) => {
    if (!result) return 'No result';
    
    if (typeof result.content === 'string') {
      return result.content;
    }
    
    if (typeof result.content === 'object') {
      // Handle special result types
      if (result.content.url) {
        return `Page URL: ${result.content.url}`;
      }
      if (result.content.title) {
        return `Page Title: ${result.content.title}`;
      }
      return JSON.stringify(result.content, null, 2);
    }
    
    return String(result.content || result);
  };

  const isError = result?.isError || false;
  const isSuccess = !isError && result;

  return (
    <Card 
      size="small" 
      style={{ 
        backgroundColor: isError ? '#fef2f2' : '#f0fdf4', 
        border: isError ? '1px solid #fecaca' : '1px solid #bbf7d0',
        borderRadius: '8px'
      }}
      title={
        <Space>
          {isError ? (
            <Text style={{ color: '#dc2626' }}>❌</Text>
          ) : (
            <CheckCircleOutlined style={{ color: '#16a34a' }} />
          )}
          <Text strong style={{ color: isError ? '#dc2626' : '#15803d' }}>
            {toolName}
          </Text>
        </Space>
      }
      extra={
        <Button
          type="text"
          size="small"
          icon={<CodeOutlined />}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide' : 'View'} Details
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Status tag */}
        <div>
          <Tag color={isError ? 'error' : 'success'} style={{ fontSize: '11px' }}>
            {isError ? 'Execution Failed' : 'Execution Successful'}
          </Tag>
        </div>

        {/* Result content */}
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: isError ? '#fef7f7' : '#f7fef7', 
          borderRadius: '4px',
          border: `1px solid ${isError ? '#f3e8e8' : '#e8f5e8'}`
        }}>
          <Paragraph 
            ellipsis={{ rows: 3, expandable: true }}
            style={{ 
              margin: 0, 
              fontSize: '13px',
              color: isError ? '#991b1b' : '#166534'
            }}
          >
            {formatResult(result)}
          </Paragraph>
        </div>

        {/* Details display */}
        {showDetails && (
          <Collapse size="small" ghost>
            <Panel header="Execution Details" key="details">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Descriptions
                  size="small"
                  column={1}
                  title="Call Parameters"
                  items={params && typeof params === 'object' ?
                    Object.entries(params).map(([key, value]) => ({
                      key,
                      label: key,
                      children: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
                    })) :
                    [{ key: 'empty', label: 'Parameters', children: 'No parameters' }]
                  }
                />
                
                {result && (
                  <div style={{ marginTop: 12 }}>
                    <Text strong>Return Result:</Text>
                    <pre style={{ 
                      marginTop: 4, 
                      padding: '8px', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                )}
              </Space>
            </Panel>
          </Collapse>
        )}
      </Space>
    </Card>
  );
};

// Tool process timeline component
export const ToolTimelineDisplay = ({ 
  toolName, 
  status, 
  params, 
  result, 
  streamText 
}: { 
  toolName: string;
  status: 'use' | 'running' | 'result';
  params?: any;
  result?: any;
  streamText?: string;
}) => {
  const items = [
    {
      dot: <ToolOutlined style={{ color: '#1890ff' }} />,
      children: (
        <div>
          <Text strong>Call Tool: {toolName}</Text>
          {params && typeof params === 'object' && Object.keys(params).length > 0 && (
            <div style={{ marginTop: 4 }}>
              <Tag color="blue">Parameters: {Object.keys(params).length} items</Tag>
            </div>
          )}
        </div>
      )
    }
  ];

  if (status === 'running' || status === 'result') {
    items.push({
      dot: status === 'running' ? 
        <LoadingOutlined style={{ color: '#faad14' }} /> : 
        <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      children: (
        <div>
          <Text>{status === 'running' ? 'Executing...' : 'Execution Completed'}</Text>
          {streamText && (
            <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
              {streamText}
            </div>
          )}
        </div>
      )
    });
  }

  if (status === 'result' && result) {
    items.push({
      dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      children: (
        <div>
          <Text strong>Return Result</Text>
          <div style={{ 
            marginTop: 4, 
            padding: '6px 8px', 
            backgroundColor: '#f6ffed', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            {typeof result.content === 'string' ? result.content : JSON.stringify(result.content)}
          </div>
        </div>
      )
    });
  }

  return (
    <Timeline style={{ marginLeft: 8 }}>
      {items.map((item, index) => (
        <Timeline.Item key={index} dot={item.dot}>
          {item.children}
        </Timeline.Item>
      ))}
    </Timeline>
  );
}; 