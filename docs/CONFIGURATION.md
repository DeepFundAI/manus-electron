# Configuration Guide

This guide explains how to configure AI models and API keys for the Manus Electron application.

## Configuration Strategy

The application supports multiple configuration methods with the following priority:

**Priority Order**: User UI Configuration > Environment Variables > Default Values

### Configuration Methods

1. **UI Configuration (Recommended for End Users)**
   - Configure directly in the application settings
   - No need to edit files or restart the app
   - Changes take effect immediately

2. **Environment Variables (For Development)**
   - Uses `.env.local` file in development
   - Uses bundled `.env.production` file in production builds
   - Suitable for developers and automated deployments

3. **Default Values**
   - Built-in fallback values
   - Used when no other configuration is provided

## Supported AI Providers

The application supports the following AI providers:

| Provider | Models | Get API Key |
|----------|--------|-------------|
| **DeepSeek** | deepseek-chat, deepseek-reasoner | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| **Qwen (Alibaba)** | qwen-max, qwen-plus, qwen-vl-max | [bailian.console.aliyun.com](https://bailian.console.aliyun.com/) |
| **Google Gemini** | gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro, etc. | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Anthropic Claude** | claude-3.7-sonnet, claude-3.5-sonnet, claude-3-opus, etc. | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **OpenRouter** | Multiple providers (Claude, GPT, Gemini, etc.) | [openrouter.ai](https://openrouter.ai/keys) |

## UI Configuration (Recommended)

### Configure AI Provider in the Application

1. **Launch the Application**
   - Open the Manus Electron application

2. **Access Model Settings**
   - On the home page, you'll see the model configuration panel
   - The panel is located above the input area

3. **Select Provider**
   - Click the provider dropdown
   - Choose from: Deepseek, Qwen, Google Gemini, Anthropic, or OpenRouter

4. **Select Model**
   - After selecting a provider, choose your preferred model
   - Different providers offer different models with varying capabilities

5. **Configure API Key**
   - Click "Edit API Key"
   - Enter your API key for the selected provider
   - Click the checkmark to save
   - API key status indicator shows:
     - 🟢 **Set by user**: You configured it in the UI
     - 🟢 **Set via environment variable**: Configured in .env file
     - 🟡 **Not configured**: No API key found

6. **Get API Key**
   - Click "Get API Key" link to open the provider's API key page
   - Sign up or log in to get your API key
   - Copy and paste it into the application

### Configuration Takes Effect Immediately

- No need to restart the application
- Changes apply to the next message you send
- All running tasks are terminated when configuration changes

## Environment Variables Setup (For Developers)

### 1. Copy Configuration Template

Copy the template file to create your local environment configuration:

```bash
cp .env.template .env.local
```

### 2. Configure API Keys

Edit `.env.local` and fill in your API keys:

```bash
# AI Service API Keys
# ===================

# DeepSeek API Configuration
# Get your API key from: https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Alibaba Cloud Qwen API Configuration
# Get your API key from: https://bailian.console.aliyun.com/
QWEN_API_KEY=your_actual_qwen_api_key_here

# Google Gemini API Configuration
# Get your API key from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_actual_google_api_key_here

# Anthropic Claude API Configuration
# Get your API key from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=your_actual_anthropic_api_key_here

# OpenRouter API Configuration (supports multiple providers)
# Get your API key from: https://openrouter.ai/keys
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here

# Text-to-Speech Configuration
TTS_REGION=eastasia
TTS_KEY=your_actual_tts_key_here

# Application Settings
# ===================

# Screenshot settings
EKO_SCREENSHOT_SCALE=0.5
# Alternative: use maximum width for proportional scaling
# EKO_SCREENSHOT_MAX_WIDTH=1280

# Development Settings
# ===================

# Next.js development settings
NEXT_PUBLIC_APP_ENV=development

# Electron settings
ELECTRON_IS_DEV=true
```

## Model Capabilities & Token Limits

Different models have different maximum token limits:

| Model | Provider | Max Tokens | Best For |
|-------|----------|------------|----------|
| deepseek-reasoner | DeepSeek | 65,536 | Complex reasoning tasks |
| claude-3-7-sonnet | Anthropic | 128,000 | Long-context tasks |
| gemini-2.0-flash-thinking | Google | 65,536 | Reasoning with multimodal |
| deepseek-chat | DeepSeek | 8,192 | General tasks |
| qwen-max | Qwen | 8,192 | Chinese language tasks |
| claude-3.5-sonnet | Anthropic | 8,000 | Balanced performance |

The application automatically configures the correct token limit based on your selected model.

## Security Notes

- **Never commit actual API keys** to version control
- Use `.env.local` for local development (already in `.gitignore`)
- User-configured API keys are stored securely in electron-store (encrypted)
- All hardcoded API keys have been removed from source code
- Configuration template provides placeholder values for security

## Configuration Priority Examples

### Example 1: User Configuration Overrides Environment Variable

```
User UI: DEEPSEEK_API_KEY = "sk-user-key"
.env.local: DEEPSEEK_API_KEY = "sk-env-key"
Result: Uses "sk-user-key"
```

### Example 2: Environment Variable as Fallback

```
User UI: DEEPSEEK_API_KEY = (not set)
.env.local: DEEPSEEK_API_KEY = "sk-env-key"
Result: Uses "sk-env-key"
```

### Example 3: Default Values

```
User UI: DEEPSEEK_API_KEY = (not set)
.env.local: DEEPSEEK_API_KEY = (not set)
Result: No API key, will show error when trying to use
```

## Development Workflow

### For End Users
1. Launch the application
2. Click provider dropdown on home page
3. Select your preferred AI provider
4. Enter API key in the UI
5. Start chatting!

### For Developers
1. Copy `.env.template` to `.env.local`
2. Fill in your actual API keys in `.env.local`
3. Restart the development server if it's running
4. The application will automatically use the environment variables
5. Can override specific keys in the UI if needed

## Production Deployment

### For Desktop Application Build

**Option 1: Bundle API Keys (Not Recommended for Distribution)**

Before building the desktop application, configure the `.env.production` file:

```bash
# Edit production configuration file
# Replace all placeholder API keys with actual values
```

Then build the application:

```bash
npm run build
```

The `.env.production` file will be bundled with the application.

**Option 2: User Configuration (Recommended)**

Build the application without API keys:

```bash
npm run build
```

End users will configure their own API keys in the UI after installation.

## Troubleshooting

### UI Configuration Issues

**Problem**: API key status shows "Not configured"
- **Solution**: Click "Edit API Key" and enter your API key
- Verify you clicked the checkmark to save

**Problem**: Changes not taking effect
- **Solution**: Configuration reloads automatically
- Check console for error messages
- Try selecting a different model and switching back

**Problem**: Can't find the configuration panel
- **Solution**: The model configuration panel is on the home page, above the input area
- Make sure you're on the home page, not in a chat session

### API Key Errors

**Problem**: "API key is invalid" error
- **Solution**:
  - Verify you copied the complete API key
  - Check that the API key is active in the provider's dashboard
  - Ensure you have sufficient credits/quota

**Problem**: "Cannot connect to API" error
- **Solution**:
  - Check your internet connection
  - Verify the API provider's service is operational
  - Try a different provider to isolate the issue

### Development Environment

If you encounter API key errors in development:
1. Check that all required API keys are set in `.env.local`
2. Verify API keys are valid and have sufficient quota
3. Restart the development server after changing environment variables
4. Check browser console and terminal for specific error messages

### Common Issues

- **Configuration not saving**: Check electron-store permissions
- **API authentication errors**: Verify API keys are correct and have proper permissions
- **Model not available**: Some providers may have regional restrictions
- **Rate limiting**: You may have exceeded the API provider's rate limits