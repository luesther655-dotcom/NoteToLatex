# NoteToLaTeX - 手写笔记转 LaTeX

将手写笔记、图片、PDF 转换为 LaTeX 格式的在线工具。支持拍照输入、手写板输入、文件上传三种方式。

## 功能

- **OCR 识别**：识别手写/印刷内容（Coze OCR）
- **LaTeX 转换**：将 OCR 结果转换为 LaTeX 数学公式（DeepSeek）
- **校验 LLM**：校验 LaTeX 结果是否正确（DeepSeek）
- **反向 LaTeX**：将 LaTeX 渲染回文本（DeepSeek）
- **拍照输入**：调用摄像头拍照识别
- **手写板输入**：Canvas 手写板，支持画笔/橡皮擦
- **历史记录**：已登录用户自动保存转换记录
- **用户认证**：Supabase 邮箱登录/注册

## 技术栈

- **框架**: Next.js 16.1.1 (App Router) + Turbopack
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS v4
- **认证/存储**: Supabase
- **LLM**: DeepSeek (校验/LaTeX) + Coze (OCR)
- **包管理器**: pnpm 9+
- **TypeScript**: 5.x

## 快速开始

### 环境变量

创建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名Key
```

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

浏览器打开 `http://localhost:5000`。

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务器

```bash
pnpm start
```

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/me/          # 用户信息 API
│   │   ├── config/supabase/  # Supabase 配置 API
│   │   ├── history/          # 历史记录 CRUD
│   │   ├── latex/            # LaTeX 转换 API
│   │   ├── reverse-latex/    # 反向 LaTeX API
│   │   ├── ocr/              # OCR 识别 API
│   │   └── validate/         # 校验 LLM API
│   ├── help/                 # 帮助文档页面
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 主页面
├── components/
│   ├── ui/                   # shadcn/ui 基础组件
│   ├── api-config-dialog.tsx # API 配置弹窗
│   ├── auth-form.tsx         # 登录/注册表单
│   ├── camera-capture.tsx    # 拍照输入组件
│   ├── file-upload.tsx       # 文件上传组件
│   └── writing-pad.tsx       # 手写板组件
├── lib/
│   ├── auth-context.tsx      # 认证上下文
│   ├── llm-config.ts         # LLM 配置
│   ├── pdf-utils.ts          # PDF 工具函数
│   └── supabase-client.ts    # Supabase 客户端
└── server.ts                 # 自定义 Next.js 服务器
```

## 部署

平台部署时需配置环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 上传限制

- 单次最大 200 页
- 单次最大 30MB
- 支持格式：图片（PNG/JPG/WebP）、PDF

## LLM 配置

| 模块 | 默认服务商 | 默认模型 |
|---|---|---|
| OCR 识别 | Coze | doubao-seed-2-0-pro-260215 |
| LaTeX 转换 | DeepSeek | deepseek-chat |
| 校验 LLM | DeepSeek | deepseek-chat |
| 反向 LaTeX | DeepSeek | deepseek-chat |

可在设置弹窗中自定义 API Key 和模型。