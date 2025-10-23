import React, { useState, useEffect } from 'react';
import { Select, Button, Input, App } from 'antd';
import { EditOutlined, CheckOutlined, CloseOutlined, LinkOutlined } from '@ant-design/icons';
import type { UserModelConfigs } from '@/type';

const { Option } = Select;

// Provider options
const PROVIDERS = [
  { value: 'deepseek', label: 'Deepseek', getKeyUrl: 'https://platform.deepseek.com/api_keys' },
  { value: 'qwen', label: 'Qwen (Alibaba)', getKeyUrl: 'https://bailian.console.aliyun.com/' },
  { value: 'google', label: 'Google Gemini', getKeyUrl: 'https://aistudio.google.com/app/apikey' },
  { value: 'anthropic', label: 'Anthropic', getKeyUrl: 'https://console.anthropic.com/settings/keys' },
  { value: 'openrouter', label: 'OpenRouter', getKeyUrl: 'https://openrouter.ai/keys' },
];

// Model options for each provider
const MODELS: Record<string, string[]> = {
  deepseek: [
    'deepseek-chat',
    'deepseek-reasoner',
  ],
  google: [
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash-thinking-exp-01-21',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro-002',
    'gemini-exp-1206',
  ],
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'deepseek/deepseek-coder',
    'google/gemini-flash-1.5',
    'google/gemini-pro-1.5',
    'x-ai/grok-beta',
    'mistralai/mistral-nemo',
    'qwen/qwen-110b-chat',
    'cohere/command',
  ],
  anthropic: [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-latest',
    'claude-3-5-sonnet-20240620',
    'claude-3-5-haiku-latest',
    'claude-3-opus-latest',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],
  qwen: [
    'qwen-max',
    'qwen-plus',
    'qwen-vl-max',
  ],
};

type ProviderType = 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter';

export const ModelConfigBar: React.FC = () => {

  const message = App.useApp().message;

  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('deepseek');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-chat');
  const [apiKeySource, setApiKeySource] = useState<'user' | 'env' | 'none'>('none');
  const [configs, setConfigs] = useState<UserModelConfigs>({});
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Load initial configurations
  useEffect(() => {
    loadConfigs();
  }, []);

  // Update model when provider changes
  useEffect(() => {
    const models = MODELS[selectedProvider];
    if (models && models.length > 0) {
      const currentModel = configs[selectedProvider]?.model || models[0];
      setSelectedModel(currentModel);
    }
  }, [selectedProvider, configs]);

  const loadConfigs = async () => {
    try {
      const userConfigs = await window.api.getUserModelConfigs();
      const provider = await window.api.getSelectedProvider();
      const source = await window.api.getApiKeySource(provider);

      setConfigs(userConfigs);
      setSelectedProvider(provider);
      setApiKeySource(source);
    } catch (error) {
      console.error('Failed to load model configs:', error);
    }
  };

  const handleProviderChange = async (value: ProviderType) => {
    try {
      setSelectedProvider(value);
      await window.api.setSelectedProvider(value);
      const source = await window.api.getApiKeySource(value);
      setApiKeySource(source);
    } catch (error) {
      console.error('Failed to change provider:', error);
      message.error('Failed to change provider');
    }
  };

  const handleModelChange = async (value: string) => {
    try {
      setSelectedModel(value);
      const updatedConfigs = {
        ...configs,
        [selectedProvider]: {
          ...configs[selectedProvider],
          model: value,
        },
      };
      await window.api.saveUserModelConfigs(updatedConfigs);
      setConfigs(updatedConfigs);
      message.success('Model updated');
    } catch (error) {
      console.error('Failed to update model:', error);
      message.error('Failed to update model');
    }
  };

  const handleEditApiKey = () => {
    setIsEditingApiKey(true);
    setTempApiKey(configs[selectedProvider]?.apiKey || '');
  };

  const handleCancelEdit = () => {
    setIsEditingApiKey(false);
    setTempApiKey('');
  };

  const handleSaveApiKey = async () => {
    // Validate API Key is not empty
    if (!tempApiKey || tempApiKey.trim() === '') {
      message.warning('API Key cannot be empty');
      return;
    }

    try {
      const updatedConfigs = {
        ...configs,
        [selectedProvider]: {
          ...configs[selectedProvider],
          apiKey: tempApiKey.trim(),
        },
      };
      await window.api.saveUserModelConfigs(updatedConfigs);
      setConfigs(updatedConfigs);
      setIsEditingApiKey(false);
      setApiKeySource('user');
      message.success('API Key saved');
    } catch (error) {
      console.error('Failed to save API key:', error);
      message.error('Failed to save API Key');
    }
  };

  const currentProvider = PROVIDERS.find(p => p.value === selectedProvider);

  return (
    <div className="w-full px-4 pt-3 pb-3" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      {/* Provider and Model Selection */}
      <div className="flex gap-3 mb-3">
        <Select
          value={selectedProvider}
          onChange={handleProviderChange}
          className="flex-1"
          size="middle"
          style={{ minWidth: '160px' }}
        >
          {PROVIDERS.map(p => (
            <Option key={p.value} value={p.value}>{p.label}</Option>
          ))}
        </Select>

        <Select
          value={selectedModel}
          onChange={handleModelChange}
          className="flex-1"
          size="middle"
          style={{ minWidth: '200px' }}
        >
          {MODELS[selectedProvider]?.map(model => (
            <Option key={model} value={model}>{model}</Option>
          ))}
        </Select>
      </div>

      {/* API Key Section */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-gray-400 whitespace-nowrap">
            {selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API Key:
          </span>

          {apiKeySource === 'env' && !isEditingApiKey && (
            <span className="flex items-center gap-1 text-green-400">
              <CheckOutlined />
              Set via environment variable
            </span>
          )}

          {apiKeySource === 'user' && !isEditingApiKey && (
            <span className="flex items-center gap-1 text-blue-400">
              <CheckOutlined />
              Set by user
            </span>
          )}

          {apiKeySource === 'none' && !isEditingApiKey && (
            <span className="text-yellow-400">Not configured</span>
          )}

          {isEditingApiKey && (
            <Input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Enter your API Key"
              className="flex-1 max-w-sm"
              size="small"
              onPressEnter={handleSaveApiKey}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isEditingApiKey ? (
            <>
              <Button
                icon={<EditOutlined />}
                onClick={handleEditApiKey}
                size="small"
                type="text"
                className="text-gray-300 hover:text-white"
              >
                Edit API Key
              </Button>
              <a
                href={currentProvider?.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 whitespace-nowrap"
              >
                <LinkOutlined />
                Get API Key
              </a>
            </>
          ) : (
            <>
              <CheckOutlined
                onClick={handleSaveApiKey}
                className="!text-green-400 hover:!text-green-300 cursor-pointer text-xs"
              />
              <CloseOutlined
                onClick={handleCancelEdit}
                className="!text-red-400 hover:!text-red-300 cursor-pointer text-xs"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
