# Manus Electron

[English](./README.md) | [简体中文](./README.zh-CN.md)

一个基于 Next.js 和 Electron 构建的 AI 智能浏览器。支持多模态 AI 任务执行、定时任务、社交媒体集成以及高级文件管理功能，并支持多个 AI 提供商。

基于 [Next.js](https://nextjs.org) 和 [Electron](https://electronjs.org) 构建。

## 技术栈

- **前端**: Next.js 15 + React 19
- **桌面应用**: Electron 33
- **UI**: Ant Design + Tailwind CSS
- **状态管理**: Zustand
- **存储**: IndexedDB (via electron-store)
- **AI Agent**: @jarvis-agent (基于 [Eko](https://github.com/FellouAI/eko))
- **构建工具**: Vite + TypeScript

## 开发环境配置
Node 版本: 20.19.3

## 快速开始

### 1. 配置 API 密钥

运行应用前，需要配置 API 密钥：

```bash
# 复制配置模板
cp .env.template .env.local

# 编辑 .env.local 并填入你的 API 密钥
# 支持: DEEPSEEK_API_KEY, QWEN_API_KEY, GOOGLE_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY
```

详细配置说明请参见 [CONFIGURATION.zh-CN.md](./docs/CONFIGURATION.zh-CN.md)。

### 2. 开发环境设置

首先，运行开发服务器：

```bash
# 安装依赖
pnpm install

# 构建桌面应用客户端
pnpm run build:deps

# 启动 Web 开发服务器
pnpm run next

# 启动桌面应用
pnpm run electron
```

### 3. 构建桌面应用

构建用于分发的桌面应用：

```bash
# 配置生产环境 API 密钥
# 编辑 .env.production 文件并填入实际的 API 密钥

# 构建应用
pnpm run build
```

构建的应用将包含你的 API 配置，终端用户无需额外配置。

## 功能特性

- **多 AI 提供商支持**: 支持 DeepSeek、Qwen、Google Gemini、Anthropic Claude 和 OpenRouter
- **UI 配置**: 直接在应用中配置 AI 模型和 API 密钥，无需编辑文件
- **AI 智能浏览器**: 具有自动化任务执行的智能浏览器
- **多模态 AI**: 视觉和文本处理能力
- **定时任务**: 创建和管理自动化定期任务
- **语音识别与 TTS**: 语音识别和文字转语音集成
- **文件管理**: 高级文件操作和管理

## 截图

### 首页
输入任务，让 AI 自动执行。

![首页](./docs/shotscreen/home.png)

### 主界面
左侧：AI 思考和执行步骤。右侧：实时浏览器操作预览。

![主界面](./docs/shotscreen/main.png)

### 定时任务
创建具有自定义间隔和执行步骤的定时任务。

![定时任务](./docs/shotscreen/schedule.png)

### 历史记录
查看过去的任务，支持搜索和回放功能。

![历史记录](./docs/shotscreen/history.png)

## 支持的 AI 提供商

- **DeepSeek**: deepseek-chat, deepseek-reasoner
- **Qwen (阿里云)**: qwen-max, qwen-plus, qwen-vl-max
- **Google Gemini**: gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro 等
- **Anthropic Claude**: claude-3.7-sonnet, claude-3.5-sonnet, claude-3-opus 等
- **OpenRouter**: 多个提供商（Claude、GPT、Gemini、Mistral、Cohere 等）

## 文档

- [配置指南](./docs/CONFIGURATION.zh-CN.md) - 详细的 API 密钥设置说明

## 致谢

特别感谢 [Eko](https://github.com/FellouAI/eko) - 一个生产就绪的 Agent 框架，为本项目提供了 AI 能力支持。

## 贡献

请确保所有 API 密钥仅在开发环境文件中配置。永远不要将实际的 API 密钥提交到仓库中。
