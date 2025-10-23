import { config } from "dotenv";
import path from "node:path";
import { app } from "electron";
import fs from "fs";
import { store } from "./store";

/**
 * Supported providers
 */
export type ProviderType = 'deepseek' | 'qwen' | 'google' | 'anthropic' | 'openrouter';

/**
 * Model configuration interface
 */
export interface ModelConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

/**
 * User model configurations stored in electron-store
 */
export interface UserModelConfigs {
  deepseek?: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  };
  qwen?: {
    apiKey?: string;
    model?: string;
  };
  google?: {
    apiKey?: string;
    model?: string;
  };
  anthropic?: {
    apiKey?: string;
    model?: string;
  };
  openrouter?: {
    apiKey?: string;
    model?: string;
  };
  selectedProvider?: ProviderType;
}

/**
 * Configuration Manager for handling environment variables in both development and production
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private initialized = false;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize configuration with bundled configuration support
   * Priority: Bundled .env.production > System env > Default values
   */
  public initialize(): void {
    if (this.initialized) {
      return;
    }

    const isDev = !app.isPackaged;

    // Development: load from .env.local
    if (isDev) {
      const envLocalPath = path.join(process.cwd(), '.env.local');
      if (fs.existsSync(envLocalPath)) {
        config({ path: envLocalPath });
        console.log('[ConfigManager] Loaded environment variables from .env.local');
        this.initialized = true;
        return;
      }
    }

    // Production: try to load bundled .env.production
    const bundledConfigPath = path.join(app.getAppPath(), '../../.env.production');

    if (fs.existsSync(bundledConfigPath)) {
      config({ path: bundledConfigPath });
      console.log('[ConfigManager] Loaded environment variables from bundled .env.production');
    } else {
      console.log('[ConfigManager] No bundled config found, using system environment variables');
    }

    this.logAvailableKeys();
    this.initialized = true;
  }

  /**
   * Get API key with fallback
   */
  public getApiKey(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
  }

  /**
   * Check if required API keys are configured
   */
  public validateApiKeys(): { isValid: boolean; missingKeys: string[] } {
    const requiredKeys = ['DEEPSEEK_API_KEY', 'BAILIAN_API_KEY'];
    const missingKeys = requiredKeys.filter(key => !this.getApiKey(key));

    return {
      isValid: missingKeys.length === 0,
      missingKeys
    };
  }

  /**
   * Log available API keys for debugging (masked)
   */
  private logAvailableKeys(): void {
    const availableKeys = ['DEEPSEEK_API_KEY', 'BAILIAN_API_KEY', 'OPENROUTER_API_KEY']
      .filter(key => process.env[key])
      .map(key => `${key.substring(0, 8)}...`);

    if (availableKeys.length > 0) {
      console.log('[ConfigManager] Available API keys:', availableKeys);
    } else {
      console.warn('[ConfigManager] No API keys found! Please configure your API keys in .env.production before building.');
    }

    // Validate required keys
    const validation = this.validateApiKeys();
    if (!validation.isValid) {
      console.warn('[ConfigManager] Missing required API keys:', validation.missingKeys);
    }
  }

  /**
   * Get user model configurations from electron-store
   */
  public getUserModelConfigs(): UserModelConfigs {
    return store.get('modelConfigs', {}) as UserModelConfigs;
  }

  /**
   * Save user model configurations to electron-store
   */
  public saveUserModelConfigs(configs: UserModelConfigs): void {
    store.set('modelConfigs', configs);
    console.log('[ConfigManager] User model configurations saved');
  }

  /**
   * Get final model configuration with priority: user config > env > default
   */
  public getModelConfig(provider: ProviderType): ModelConfig | null {
    const userConfigs = this.getUserModelConfigs();

    switch (provider) {
      case 'deepseek':
        return {
          provider: 'deepseek',
          model: userConfigs.deepseek?.model || 'deepseek-chat',
          apiKey: userConfigs.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY || '',
          baseURL: userConfigs.deepseek?.baseURL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
        };

      case 'qwen':
        return {
          provider: 'openai',
          model: userConfigs.qwen?.model || 'qwen-max',
          apiKey: userConfigs.qwen?.apiKey || process.env.QWEN_API_KEY || '',
          baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        };

      case 'google':
        return {
          provider: 'google',
          model: userConfigs.google?.model || 'gemini-1.5-flash-latest',
          apiKey: userConfigs.google?.apiKey || process.env.GOOGLE_API_KEY || ''
        };

      case 'anthropic':
        return {
          provider: 'anthropic',
          model: userConfigs.anthropic?.model || 'claude-3-5-sonnet-latest',
          apiKey: userConfigs.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY || ''
        };

      case 'openrouter':
        return {
          provider: 'openrouter',
          model: userConfigs.openrouter?.model || 'anthropic/claude-3.5-sonnet',
          apiKey: userConfigs.openrouter?.apiKey || process.env.OPENROUTER_API_KEY || ''
        };

      default:
        return null;
    }
  }

  /**
   * Get API key source info (for UI display)
   */
  public getApiKeySource(provider: ProviderType): 'user' | 'env' | 'none' {
    const userConfigs = this.getUserModelConfigs();

    // Check user config first (highest priority)
    if (userConfigs[provider]?.apiKey) {
      return 'user';
    }

    // Then check environment variables
    const envKeys: Record<ProviderType, string> = {
      deepseek: 'DEEPSEEK_API_KEY',
      qwen: 'QWEN_API_KEY',
      google: 'GOOGLE_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      openrouter: 'OPENROUTER_API_KEY'
    };

    const envKey = envKeys[provider];
    if (process.env[envKey]) {
      return 'env';
    }

    return 'none';
  }

  /**
   * Get selected provider (with fallback)
   */
  public getSelectedProvider(): ProviderType {
    const userConfigs = this.getUserModelConfigs();
    return userConfigs.selectedProvider || 'deepseek';
  }

  /**
   * Set selected provider
   */
  public setSelectedProvider(provider: ProviderType): void {
    const userConfigs = this.getUserModelConfigs();
    userConfigs.selectedProvider = provider;
    this.saveUserModelConfigs(userConfigs);
  }

  /**
   * Get maxTokens for specific model
   */
  private getMaxTokensForModel(provider: ProviderType, model: string): number {
    // Define maxTokens for different models
    const tokenLimits: Record<string, number> = {
      // Deepseek
      'deepseek-chat': 8192,
      'deepseek-reasoner': 65536,

      // Google
      'gemini-2.0-flash-thinking-exp-01-21': 65536,
      'gemini-1.5-flash-latest': 8192,
      'gemini-2.0-flash-exp': 8192,
      'gemini-1.5-flash-002': 8192,
      'gemini-1.5-flash-8b': 8192,
      'gemini-1.5-pro-latest': 8192,
      'gemini-1.5-pro-002': 8192,
      'gemini-exp-1206': 8192,

      // Anthropic
      'claude-3-7-sonnet-20250219': 128000,
      'claude-3-5-sonnet-latest': 8000,
      'claude-3-5-sonnet-20240620': 8000,
      'claude-3-5-haiku-latest': 8000,
      'claude-3-opus-latest': 8000,
      'claude-3-sonnet-20240229': 8000,
      'claude-3-haiku-20240307': 8000,

      // Qwen
      'qwen-max': 8192,
      'qwen-plus': 8192,
      'qwen-vl-max': 8192,
    };

    // Return specific token limit or default based on provider
    return tokenLimits[model] || (provider === 'openrouter' ? 8000 : 8192);
  }

  /**
   * Get LLMs configuration for Eko framework
   * Returns configured LLMs object based on selected provider
   */
  public getLLMsConfig(): any {
    const selectedProvider = this.getSelectedProvider();
    const providerConfig = this.getModelConfig(selectedProvider);

    if (!providerConfig) {
      console.error(`[ConfigManager] No config found for provider: ${selectedProvider}`);
      return { default: null };
    }

    const logInfo = (msg: string, ...args: any[]) => console.log(`[ConfigManager] ${msg}`, ...args);
    const maxTokens = this.getMaxTokensForModel(selectedProvider, providerConfig.model);

    // Build default LLM based on selected provider
    let defaultLLM: any;

    switch (selectedProvider) {
      case 'deepseek':
        defaultLLM = {
          provider: providerConfig.provider,
          model: providerConfig.model,
          apiKey: providerConfig.apiKey || "",
          config: {
            baseURL: providerConfig.baseURL || "https://api.deepseek.com/v1",
            maxTokens,
            mode: 'regular',
          },
          fetch: (url: string, options?: any) => {
            // Intercept request and add thinking parameter for deepseek
            const body = JSON.parse((options?.body as string) || '{}');
            body.thinking = { type: "disabled" };
            logInfo('Deepseek request:', providerConfig.model);
            return fetch(url, {
              ...options,
              body: JSON.stringify(body)
            });
          }
        };
        break;

      case 'qwen':
        defaultLLM = {
          provider: providerConfig.provider,
          model: providerConfig.model,
          apiKey: providerConfig.apiKey || "",
          config: {
            baseURL: providerConfig.baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
            maxTokens,
            timeout: 60000,
            temperature: 0.7
          },
          fetch: (url: string, options?: any) => {
            logInfo('Qwen request:', providerConfig.model);
            return fetch(url, options);
          }
        };
        break;

      case 'google':
        defaultLLM = {
          provider: providerConfig.provider,
          model: providerConfig.model,
          apiKey: providerConfig.apiKey || "",
          config: {
            maxTokens,
            temperature: 0.7
          }
        };
        break;

      case 'anthropic':
        defaultLLM = {
          provider: providerConfig.provider,
          model: providerConfig.model,
          apiKey: providerConfig.apiKey || "",
          config: {
            maxTokens,
            temperature: 0.7
          }
        };
        break;

      case 'openrouter':
        defaultLLM = {
          provider: providerConfig.provider,
          model: providerConfig.model,
          apiKey: providerConfig.apiKey || "",
          config: {
            maxTokens
          }
        };
        break;

      default:
        console.error(`[ConfigManager] Unsupported provider: ${selectedProvider}`);
        return { default: null };
    }

    logInfo(`Using provider: ${selectedProvider}, model: ${providerConfig.model}, maxTokens: ${maxTokens}`);

    // Return LLMs configuration
    return {
      default: defaultLLM,
    };
  }
}