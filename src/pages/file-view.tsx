import { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Button, Space, Spin, App } from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  CopyOutlined,
  CodeOutlined,
  FileOutlined
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

interface FileViewState {
  content: string;
  isLoading: boolean;
  fileName: string;
  lastUpdated: Date | null;
  wordCount: number;
  lineCount: number;
  url: string;
}

export default function FileView() {
  const { message } = App.useApp();
  const [fileState, setFileState] = useState<FileViewState>({
    content: '',
    isLoading: true,
    fileName: 'filename',
    lastUpdated: null,
    wordCount: 0,
    lineCount: 0,
    url: ''
  });

  const contentRef = useRef<HTMLDivElement>(null);

  type ShowTypeOption = 'code' | 'preview';

  const [showType, setShowType] = useState<ShowTypeOption>('code')
  const [url, setUrl] = useState<string>('')

  // Calculate file statistics
  const calculateStats = (content: string) => {
    const lineCount = content.split('\n').length;
    const wordCount = content.replace(/\s+/g, ' ').trim().split(' ').filter(word => word.length > 0).length;
    return { wordCount, lineCount };
  };

  // Listen for file update events
  useEffect(() => {
    const handleFileUpdated = (status: ShowTypeOption, content: string) => {
      console.log('File content updated:', content.length, 'characters');

      setShowType(status)
      if (status === 'preview') {
        setFileState(pre => ({
          ...pre,
          url: content,
          isLoading: false,
          lastUpdated: new Date(),
        }))
        return;
      }

      const stats = calculateStats(content);
      
      setFileState(prev => ({
        ...prev,
        content,
        isLoading: false,
        lastUpdated: new Date(),
        wordCount: stats.wordCount,
        lineCount: stats.lineCount
      }));

      // Scroll to bottom to show latest content
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      }, 100);
    };

    // Listen for file update events from main thread
    if (window.api?.onFileUpdated) {
      window.api.onFileUpdated(handleFileUpdated);
    }

    // Set loading state on initialization
    setTimeout(() => {
      if (fileState.content === '') {
        setFileState(prev => ({ ...prev, isLoading: false }));
      }
    }, 3000);

    // Clean up listeners
    return () => {
      if (window.api?.removeAllListeners) {
        window.api.removeAllListeners('file-updated');
      }
    };
  }, []);

  // Copy content to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fileState.content);
      message.success('Content copied to clipboard');
    } catch (error) {
      console.error('Copy failed:', error);
      message.error('Copy failed');
    }
  };

  // Download file
  const handleDownload = () => {
    const blob = new Blob([fileState.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileState.fileName}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('File downloaded successfully');
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Content className='p-4 flex flex-col' style={{ padding: '16px' }}>
        {/* Header information bar */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileTextOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  AI Generated File Preview
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {fileState.lastUpdated ? `Last updated: ${formatTime(fileState.lastUpdated)}` : 'Waiting for content generation...'}
                </Text>
              </div>
            </div>
            
            <Space>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Lines: {fileState.lineCount} | Words: {fileState.wordCount}
              </Text>
              <Button 
                icon={<CodeOutlined />} 
                size="small" 
                onClick={() => setShowType('code')}
                type={showType === 'code' ? 'primary' : 'default'}
              >
                Code
              </Button>
              <Button 
                icon={<FileOutlined />} 
                size="small" 
                onClick={() => setShowType('preview')}
                disabled={!fileState.url}
                type={showType === 'preview' ? 'primary' : 'default'}
              >
                Preview
              </Button>
              <Button 
                icon={<CopyOutlined />} 
                size="small" 
                onClick={handleCopy}
                disabled={!fileState.content}
              >
                Copy
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                size="small" 
                onClick={handleDownload}
                disabled={!fileState.content}
              >
                Download
              </Button>
            </Space>
          </div>
        </Card>

        {/* File content area */}
        {showType === 'code' ? (<Card className='flex-1 overflow-auto' ref={contentRef}>
          {fileState.isLoading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <Spin size="large" />
              <Text type="secondary">Waiting for AI to generate content...</Text>
            </div>
          ) : fileState.content ? (
            <div
              style={{
                height: '100%',
                overflow: 'auto',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '14px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                padding: '16px',
                borderRadius: '6px'
              }}
            >
              {fileState.content}
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <FileTextOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
              <div style={{ textAlign: 'center' }}>
                <Title level={4} type="secondary">No content yet</Title>
                <Text type="secondary">
                  When AI starts generating or modifying files, content will be displayed here in real-time
                </Text>
              </div>
            </div>
          )}
        </Card>) : (<>
        <iframe src={fileState.url} className='h-full bg-white' frameborder="0"></iframe>
        </>)}
        
      </Content>
    </Layout>
  );
}