# Configuration Guide

This guide explains how to configure API keys and environment variables for the DeepFundAI application.

## Configuration Strategy

The application uses a multi-level configuration strategy:
- **Development**: Uses `.env.local` file
- **Production**: Uses bundled `.env.production` file (packaged with the app)
- **Priority**: Bundled config > System environment variables

This allows developers to configure API keys once during build, and end users don't need any additional configuration.

## Environment Variables Setup

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
DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# OpenAI API Configuration
OPENAI_API_KEY=your_actual_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_actual_anthropic_api_key_here
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1

# Alibaba Cloud Bailian API Keys (for Douyin/Xiaohongshu services)
BAILIAN_API_KEY=your_actual_bailian_douyin_api_key_here

# OpenRouter API Configuration
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

## API Key Sources

### DeepSeek
- Visit: https://platform.deepseek.com/
- Create account and generate API key

### OpenAI
- Visit: https://platform.openai.com/
- Create account and generate API key

### Anthropic
- Visit: https://console.anthropic.com/
- Create account and generate API key

### Alibaba Cloud Bailian
- Visit: https://bailian.console.aliyun.com/
- Create service and generate API keys
- Separate keys recommended for Douyin and Xiaohongshu services

### OpenRouter
- Visit: https://openrouter.ai/
- Create account and generate API key

### Text-to-Speech
- Visit: https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/
- Create Azure Cognitive Services account
- Get region and API key

## Security Notes

- **Never commit actual API keys** to version control
- Use `.env.local` for local development (already in `.gitignore`)
- For production, use your hosting platform's environment variable configuration
- All hardcoded API keys have been removed from source code
- Configuration template provides placeholder values for security

## Development Workflow

1. Copy `.env.template` to `.env.local`
2. Fill in your actual API keys in `.env.local`
3. Restart the development server if it's running
4. The application will automatically use the environment variables

## Production Deployment

### For Desktop Application Build

Before building the desktop application, configure the `.env.production` file:

```bash
# Edit production configuration file
# Replace all placeholder API keys with actual values
```

Then build the application:

```bash
npm run build
```

The `.env.production` file will be bundled with the application, so end users don't need to configure anything.

### For Web Deployment

Set the environment variables in your hosting platform:
- Vercel: Environment Variables in project settings
- Netlify: Environment Variables in site settings
- Other platforms: Refer to their documentation for environment variable setup

## Troubleshooting

### Desktop Application

If you encounter API key errors in the desktop application:
1. Check that `.env.production` is properly configured before building
2. Verify the application was built after configuring `.env.production`
3. Check application logs for configuration loading messages
4. Ensure required API keys are present and valid

### Development Environment

If you encounter API key errors in development:
1. Check that all required API keys are set in `.env.local`
2. Verify API keys are valid and have sufficient quota
3. Restart the development server after changing environment variables
4. Check browser console for specific error messages

### Common Issues

- **No API keys found**: Ensure `.env.production` is configured before building
- **Configuration not loading**: Check that the file exists in the build output
- **API authentication errors**: Verify API keys are correct and have proper permissions