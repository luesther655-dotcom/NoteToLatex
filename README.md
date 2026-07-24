# NoteToLaTeX

> 手写笔记转 LaTeX — 将手写数学笔记自动转换为出版级 LaTeX 代码

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![License](https://img.shields.io/badge/License-MIT-green)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)

---

## 📖 简介

**NoteToLaTeX** 是一款基于 AI 的全栈 Web 应用，利用大语言模型的 OCR 识别与 LaTeX 编排能力，将手写数学笔记（图片或 PDF）自动转换为可编译的 LaTeX 代码，大幅降低从手写到出版文档的人工成本。

适用场景：学术研究、教育教学、论文写作、数学竞赛、知识管理。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🖼️ **手写 OCR 识别** | 支持中文/英文/混合手写，对数学符号和公式专项优化 |
| ✅ **智能校验** | 自动检测并修正公式错误和 LaTeX 语法问题 |
| 🔄 **LaTeX 转换** | 将识别结果转换为标准 LaTeX 代码，可直接编译 |
| 🔁 **双向编辑同步** | 编辑 Markdown 自动重新生成 LaTeX，反之亦然 |
| 📤 **多格式导出** | 导出 PDF / .tex / .md / 复制到剪贴板 |
| 📜 **转换历史** | 登录后自动保存，支持浏览/重命名/删除 |
| 🔧 **自定义 API** | 可独立配置 OCR 和校验模型的 API Key |
| 🌙 **多主题** | 亮色/暗色模式，针对数学公式阅读优化 |

---

## 🖥 在线体验

- **应用地址：** 访问平台提供的部署 URL
- **帮助文档：** 点击应用顶栏「帮助」按钮或访问 `/help`

---

## 🚀 快速开始

### 环境要求

- Node.js 24+
- pnpm 9+
- 浏览器：Chrome 90+ / Edge 90+ / Firefox 90+

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/luesther655-dotcom/NoteToLatex.git
cd NoteToLatex/projects

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 凭据

# 启动开发服务器
pnpm dev

# 访问 http://localhost:5000
```

### 构建生产版本

```bash
pnpm build
pnpm start
```

---

## 🏗 技术栈

| 层次 | 技术选型 |
|------|----------|
| 前端框架 | Next.js 16 (App Router) + React 19 |
| UI 组件 | shadcn/ui (Radix UI) |
| 样式方案 | Tailwind CSS v4 |
| 数学渲染 | KaTeX（rehype-katex） |
| 认证系统 | Supabase Auth（邮箱/密码） |
| 数据库 | Supabase PostgreSQL（Drizzle ORM） |
| AI 引擎 | coze-coding-dev-sdk（豆包模型） |
| 包管理器 | pnpm 9+ |
| 语言 | TypeScript 5.x |

### AI 处理流程

```
用户上传图片/PDF
       │
       ▼
   PDF → 图片分页 (pdf.js)
       │
       ▼
   OCR 识别 (LLM) ───→ Markdown
       │
       ▼
   校验修正 (LLM) ───→ 纠正公式/语法错误
       │
       ▼
   LaTeX 转换 (LLM) ──→ LaTeX 代码
       │
       ▼
   结果展示 / 导出
```

---

## 📁 项目结构

```
projects/
├── public/                    # 静态资源
├── src/
│   ├── app/
│   │   ├── api/              # API 路由（OCR/校验/LaTeX/历史/认证）
│   │   ├── help/             # 帮助文档页面
│   │   ├── globals.css       # 全局样式与主题变量
│   │   ├── layout.tsx        # 根布局
│   │   └── page.tsx          # 主页面（单页应用）
│   ├── components/
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   ├── file-upload.tsx   # 文件上传组件
│   │   ├── processing-pipeline.tsx  # 处理流程可视化
│   │   ├── results-panel.tsx        # 结果面板（三标签）
│   │   ├── history-sidebar.tsx      # 历史记录侧边栏
│   │   ├── auth-form.tsx            # 登录/注册表单
│   │   ├── user-menu.tsx            # 用户菜单
│   │   ├── api-config-dialog.tsx    # API 配置弹窗
│   │   └── profile-settings-dialog.tsx  # 个人设置弹窗
│   ├── lib/                  # 工具库（auth/pdf/utils）
│   └── hooks/                # 自定义 hooks
├── scripts/                  # 构建/启动脚本
├── .env.local                # 环境变量（已 gitignore）
└── package.json
```

---

## 📋 环境变量

创建 `projects/.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> 注册 Supabase：https://supabase.com → 创建项目 → 在 Settings → API 中获取 URL 和 anon key

---

## 🤝 参与贡献

欢迎提交 Issue 和 PR！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个 Pull Request

---

## 📄 项目文档

- [📖 帮助文档](projects/src/app/help/page.tsx) — 完整使用指南
- [📘 作品使用手册 (PDF)](public/evaluation-guide.pdf) — 评审专用手册
- [🎨 设计规范](projects/DESIGN.md) — 视觉与品牌设计文档

---

## 📜 许可证

本项目基于 MIT 许可证开源。

---

<div align="center">
  <sub>Built with ❤️ for the competition</sub>
</div>
