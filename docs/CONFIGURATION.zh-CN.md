# 配置指南

本指南介绍如何为 Manus Electron 应用配置 AI 模型和 API 密钥。

## 配置策略

应用支持多种配置方式，优先级如下：

**优先级顺序**：用户 UI 配置 > 环境变量 > 默认值

### 配置方式

1. **UI 配置（推荐给终端用户）**
   - 直接在应用设置中配置
   - 无需编辑文件或重启应用
   - 配置立即生效

2. **环境变量（适合开发者）**
   - 开发环境使用 `.env.local` 文件
   - 生产构建使用打包的 `.env.production` 文件
   - 适合开发者和自动化部署

3. **默认值**
   - 内置的后备值
   - 在没有其他配置时使用

## 支持的 AI 提供商

应用支持以下 AI 提供商：

| 提供商 | 模型 | 获取 API 密钥 |
|--------|------|--------------|
| **DeepSeek** | deepseek-chat, deepseek-reasoner | [platform.deepseek.com](https://platform.deepseek.com/api_keys) |
| **Qwen (阿里云)** | qwen-max, qwen-plus, qwen-vl-max | [bailian.console.aliyun.com](https://bailian.console.aliyun.com/) |
| **Google Gemini** | gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro 等 | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Anthropic Claude** | claude-3.7-sonnet, claude-3.5-sonnet, claude-3-opus 等 | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **OpenRouter** | 多个提供商（Claude, GPT, Gemini 等） | [openrouter.ai](https://openrouter.ai/keys) |

## UI 配置（推荐）

### 在应用中配置 AI 提供商

1. **启动应用**
   - 打开 Manus Electron 应用

2. **访问模型设置**
   - 在首页，你会看到模型配置面板
   - 面板位于输入框上方

3. **选择提供商**
   - 点击提供商下拉菜单
   - 从以下选项中选择：Deepseek、Qwen、Google Gemini、Anthropic 或 OpenRouter

4. **选择模型**
   - 选择提供商后，选择你偏好的模型
   - 不同提供商提供不同能力的模型

5. **配置 API 密钥**
   - 点击"编辑 API 密钥"
   - 输入所选提供商的 API 密钥
   - 点击对勾保存
   - API 密钥状态指示器显示：
     - 🟢 **用户设置**：你在 UI 中配置的
     - 🟢 **环境变量设置**：在 .env 文件中配置的
     - 🟡 **未配置**：未找到 API 密钥

6. **获取 API 密钥**
   - 点击"获取 API 密钥"链接打开提供商的 API 密钥页面
   - 注册或登录以获取你的 API 密钥
   - 复制并粘贴到应用中

### 配置立即生效

- 无需重启应用
- 更改将应用于你发送的下一条消息
- 配置更改时所有运行中的任务将被终止

## 环境变量配置（适合开发者）

### 1. 复制配置模板

复制模板文件以创建本地环境配置：

```bash
cp .env.template .env.local
```

### 2. 配置 API 密钥

编辑 `.env.local` 并填入你的 API 密钥：

```bash
# AI 服务 API 密钥
# ===================

# DeepSeek API 配置
# 从这里获取 API 密钥：https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=你的_deepseek_api_密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# 阿里云通义千问 API 配置
# 从这里获取 API 密钥：https://bailian.console.aliyun.com/
QWEN_API_KEY=你的_qwen_api_密钥

# Google Gemini API 配置
# 从这里获取 API 密钥：https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=你的_google_api_密钥

# Anthropic Claude API 配置
# 从这里获取 API 密钥：https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=你的_anthropic_api_密钥

# OpenRouter API 配置（支持多个提供商）
# 从这里获取 API 密钥：https://openrouter.ai/keys
OPENROUTER_API_KEY=你的_openrouter_api_密钥

# 语音转文字配置
TTS_REGION=eastasia
TTS_KEY=你的_tts_密钥

# 应用设置
# ===================

# 截图设置
EKO_SCREENSHOT_SCALE=0.5
# 或者使用最大宽度进行比例缩放
# EKO_SCREENSHOT_MAX_WIDTH=1280

# 开发设置
# ===================

# Next.js 开发设置
NEXT_PUBLIC_APP_ENV=development

# Electron 设置
ELECTRON_IS_DEV=true
```

## 模型能力与 Token 限制

不同模型有不同的最大 token 限制：

| 模型 | 提供商 | 最大 Tokens | 最适合 |
|------|--------|-------------|--------|
| deepseek-reasoner | DeepSeek | 65,536 | 复杂推理任务 |
| claude-3-7-sonnet | Anthropic | 128,000 | 长文本任务 |
| gemini-2.0-flash-thinking | Google | 65,536 | 多模态推理 |
| deepseek-chat | DeepSeek | 8,192 | 通用任务 |
| qwen-max | Qwen | 8,192 | 中文任务 |
| claude-3.5-sonnet | Anthropic | 8,000 | 平衡性能 |

应用会根据你选择的模型自动配置正确的 token 限制。

## 安全注意事项

- **永远不要将实际的 API 密钥提交到版本控制**
- 本地开发使用 `.env.local`（已在 `.gitignore` 中）
- 用户配置的 API 密钥安全存储在 electron-store 中（已加密）
- 所有硬编码的 API 密钥已从源代码中删除
- 配置模板提供占位符值以确保安全

## 配置优先级示例

### 示例 1：用户配置覆盖环境变量

```
用户 UI：DEEPSEEK_API_KEY = "sk-user-key"
.env.local：DEEPSEEK_API_KEY = "sk-env-key"
结果：使用 "sk-user-key"
```

### 示例 2：环境变量作为后备

```
用户 UI：DEEPSEEK_API_KEY =（未设置）
.env.local：DEEPSEEK_API_KEY = "sk-env-key"
结果：使用 "sk-env-key"
```

### 示例 3：默认值

```
用户 UI：DEEPSEEK_API_KEY =（未设置）
.env.local：DEEPSEEK_API_KEY =（未设置）
结果：没有 API 密钥，尝试使用时会显示错误
```

## 开发工作流程

### 终端用户
1. 启动应用
2. 在首页点击提供商下拉菜单
3. 选择你偏好的 AI 提供商
4. 在 UI 中输入 API 密钥
5. 开始聊天！

### 开发者
1. 复制 `.env.template` 到 `.env.local`
2. 在 `.env.local` 中填入你的实际 API 密钥
3. 如果开发服务器正在运行，重启它
4. 应用将自动使用环境变量
5. 如需要，可在 UI 中覆盖特定密钥

## 生产部署

### 桌面应用构建

**选项 1：打包 API 密钥（不推荐用于分发）**

在构建桌面应用前，配置 `.env.production` 文件：

```bash
# 编辑生产配置文件
# 将所有占位符 API 密钥替换为实际值
```

然后构建应用：

```bash
npm run build
```

`.env.production` 文件将被打包到应用中。

**选项 2：用户配置（推荐）**

不带 API 密钥构建应用：

```bash
npm run build
```

终端用户在安装后会在 UI 中配置自己的 API 密钥。

## 故障排除

### UI 配置问题

**问题**：API 密钥状态显示"未配置"
- **解决方案**：点击"编辑 API 密钥"并输入你的 API 密钥
- 确认你点击了对勾保存

**问题**：更改未生效
- **解决方案**：配置会自动重新加载
- 检查控制台是否有错误消息
- 尝试选择不同的模型然后切换回来

**问题**：找不到配置面板
- **解决方案**：模型配置面板在首页，输入框上方
- 确保你在首页，而不是在聊天会话中

### API 密钥错误

**问题**："API 密钥无效"错误
- **解决方案**：
  - 确认你复制了完整的 API 密钥
  - 检查 API 密钥在提供商的控制台中是否激活
  - 确保你有足够的额度/配额

**问题**："无法连接到 API"错误
- **解决方案**：
  - 检查你的网络连接
  - 确认 API 提供商的服务正常运行
  - 尝试不同的提供商以隔离问题

### 开发环境

如果在开发中遇到 API 密钥错误：
1. 检查所有必需的 API 密钥是否在 `.env.local` 中设置
2. 确认 API 密钥有效且有足够的配额
3. 更改环境变量后重启开发服务器
4. 检查浏览器控制台和终端的具体错误消息

### 常见问题

- **配置无法保存**：检查 electron-store 权限
- **API 认证错误**：确认 API 密钥正确且有适当权限
- **模型不可用**：某些提供商可能有地区限制
- **速率限制**：你可能超过了 API 提供商的速率限制
