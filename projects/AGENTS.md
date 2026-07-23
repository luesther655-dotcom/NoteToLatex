# AGENTS.md

## 项目概览
NoteToLaTeX - 手写笔记转 LaTeX 应用。上传 PDF/图片形式的手写笔记，通过 AI OCR 识别、LLM 校验、LaTeX 转换，输出可编译的 LaTeX 代码。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19 + TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **AI**: coze-coding-dev-sdk (doubao-seed-2-0-pro-260215 多模态模型)
- **渲染**: react-markdown + remark-math + rehype-katex

## 目录结构
```
src/
├── app/
│   ├── api/
│   │   ├── ocr/route.ts        # OCR 识别 API (多模态模型, SSE 流式)
│   │   ├── validate/route.ts   # LLM 校验修正 API (SSE 流式)
│   │   └── latex/route.ts      # Markdown→LaTeX 转换 API (SSE 流式)
│   ├── globals.css              # 全局样式 + 学术主题色
│   ├── layout.tsx               # 根布局 (ThemeProvider)
│   └── page.tsx                 # 主页面 (上传→处理→结果)
├── components/
│   ├── theme-provider.tsx       # 深浅主题 Context
│   ├── theme-toggle.tsx         # 主题切换按钮
│   ├── file-upload.tsx          # 拖拽上传组件
│   ├── processing-pipeline.tsx  # 处理流水线可视化
│   └── results-panel.tsx        # 结果面板 (Preview/LaTeX/Editor)
├── lib/
│   ├── utils.ts                 # 通用工具
│   └── pdf-utils.ts             # PDF→图片转换 (pdfjs-dist)
```

## 核心流程
1. 用户上传 PDF/图片 → 前端拖拽上传
2. PDF 文件先通过 pdfjs-dist 转为图片
3. 图片发送到 `/api/ocr` → 多模态模型 OCR → 流式返回 Markdown
4. Markdown 发送到 `/api/validate` → LLM 校验修正 → 流式返回
5. 修正后 Markdown 发送到 `/api/latex` → LLM 转换为 LaTeX → 流式返回
6. 结果展示: Markdown 预览 (KaTeX 渲染) / LaTeX 代码 / 在线编辑 / .tex 下载 / PDF 导出 / .md 下载

## 开发命令
- `pnpm dev` - 开发环境
- `pnpm build` - 构建
- `pnpm ts-check` - TypeScript 检查
- `pnpm lint` - ESLint 检查

## 设计规范
- 学术数学风格，参考 DESIGN.md
- 浅色: 象牙白背景 #FAFAF8 + 学术蓝 #2563EB
- 深色: 深墨色 #0F1117 + 亮蓝 #60A5FA
- 标题衬线体 (Noto Serif SC), 正文无衬线 (Inter), 代码等宽 (JetBrains Mono)
