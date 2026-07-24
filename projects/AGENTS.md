# AGENTS.md

## 项目概览
NoteToLaTeX - 手写笔记转 LaTeX 应用。上传 PDF/图片形式的手写笔记，通过 AI OCR 识别、LLM 校验、LaTeX 转换，输出可编译的 LaTeX 代码。支持用户登录和历史记录保存。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19 + TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **AI**: coze-coding-dev-sdk (doubao-seed-2-0-pro-260215 多模态模型)
- **渲染**: react-markdown + remark-math + rehype-katex
- **数据库**: Supabase (PostgreSQL + Auth)
- **ORM**: Drizzle ORM

## 目录结构
```
src/
├── app/
│   ├── api/
│   │   ├── ocr/route.ts           # OCR 识别 API (多模态模型, SSE 流式)
│   │   ├── validate/route.ts      # LLM 校验修正 API (SSE 流式)
│   │   ├── latex/route.ts         # Markdown→LaTeX 转换 API (SSE 流式)
│   │   ├── reverse-latex/route.ts # LaTeX→Markdown 反向转换 API
│   │   ├── auth/                  # 认证 API (login/register/me)
│   │   ├── history/route.ts       # 历史记录 CRUD API
│   │   └── config/supabase/route.ts # Supabase 配置 API (运行时凭证)
│   ├── globals.css                # 全局样式 + 学术主题色
│   ├── layout.tsx                 # 根布局 (ThemeProvider + AuthProvider)
│   └── page.tsx                   # 主页面 (上传→处理→结果)
├── components/
│   ├── theme-provider.tsx         # 深浅主题 Context
│   ├── theme-toggle.tsx           # 主题切换按钮
│   ├── file-upload.tsx            # 拖拽上传组件 (含拍照/手写板入口)
│   ├── camera-capture.tsx         # 拍照输入组件 (摄像头调用)
│   ├── writing-pad.tsx            # 手写板输入组件 (Canvas 画板)
│   ├── processing-pipeline.tsx    # 处理流水线可视化
│   ├── results-panel.tsx          # 结果面板 (Preview/LaTeX/Editor)
│   ├── auth-form.tsx              # 登录/注册表单
│   └── history-sidebar.tsx        # 历史记录侧边栏
├── lib/
│   ├── utils.ts                   # 通用工具
│   ├── pdf-utils.ts               # PDF→图片转换 (pdfjs-dist)
│   ├── supabase-client.ts         # Supabase 客户端 (服务端)
│   ├── auth-context.tsx           # 认证 Context (客户端)
│   └── conversion-history.ts      # 历史记录 CRUD 操作
├── storage/database/shared/
│   └── schema.ts                  # Drizzle 表定义
```

## 核心流程
1. 用户登录/注册（Supabase Auth）
2. 用户上传笔记（三种方式）：
   - **文件上传**: 拖拽或点击选择 PDF/图片文件
   - **拍照输入**: 调用设备摄像头拍照（支持前后摄像头切换）
   - **手写板输入**: 在 Canvas 画板上手写（支持颜色/粗细调节、撤销、清空）
3. PDF 文件先通过 pdfjs-dist 转为图片
4. 图片发送到 `/api/ocr` → 多模态模型 OCR → 流式返回 Markdown
5. Markdown 发送到 `/api/validate` → LLM 校验修正 → 流式返回
6. 修正后 Markdown 发送到 `/api/latex` → LLM 转换为 LaTeX → 流式返回
7. 结果自动保存到历史记录
8. 结果展示: Markdown 预览 (KaTeX 渲染) / LaTeX 代码 / 在线编辑 / .tex 下载 / PDF 导出 / .md 下载

## 双向同步与验证
- **编辑器 → LaTeX**: 编辑 Markdown 后，1.5s 防抖触发 `/api/latex` 转换
- **LaTeX → 编辑器**: 编辑 LaTeX 后，1.5s 防抖触发 `/api/reverse-latex` 反向转换
- **LLM 一致性保证**: 两个转换 API 的系统提示词均强调"确保转换后内容与原始内容完全一致"
  - `/api/latex`: "ensure the LaTeX content is COMPLETELY CONSISTENT with the original Markdown"
  - `/api/reverse-latex`: "ensure the Markdown content is COMPLETELY CONSISTENT with the original LaTeX"

## 用户认证与历史记录
- **认证**: Supabase Auth (邮箱/密码)
- **历史记录表**: `conversion_history`
  - `id`: 主键 (UUID)
  - `user_id`: 用户 ID (关联 auth.users)
  - `title`: 记录标题
  - `source_image_url`: 源图片 URL
  - `markdown_content`: Markdown 内容
  - `latex_content`: LaTeX 内容
  - `created_at` / `updated_at`: 时间戳
- **RLS 策略**: 场景 D（用户私有数据），用户只能访问自己的记录
- **自动保存**: 转换完成后自动保存，编辑内容时 2s 防抖自动更新
- **历史保存降级**: 历史记录保存是非关键操作，失败时静默警告（`console.warn`）不阻塞主流程。未登录用户跳过保存。Token 过期或无效时 API 返回 401，前端静默跳过。

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

## Coze 配置

### 项目结构
- **工作区根目录**: `/workspace/projects`
- **技术项目根目录**: `/workspace/projects/projects`
- **根 `.coze`**: `/workspace/projects/.coze`（平台读取的最终生效配置）
- **子项目 `.coze`**: `/workspace/projects/projects/.coze`

### 预览链路
- **判定依据**: 项目是 Next.js Web 应用，核心结果需要通过浏览器交互验证
- **预览入口**: `pnpm tsx watch src/server.ts`（自定义 Next.js 服务器）
- **预览脚本**:
  - `scripts/coze-preview-build.sh` - 安装依赖
  - `scripts/coze-preview-run.sh` - 启动预览服务（绑定 0.0.0.0:5000）
- **根 `.coze` 映射**: `[dev].build/run` 指向 `projects/scripts/coze-preview-*.sh`

### 部署配置
- **部署类型**: `service` (Web)
- **部署脚本**:
  - `scripts/build.sh` - 安装依赖 + Next.js 构建 + tsup 打包服务端
  - `scripts/start.sh` - 启动 `node dist/server.js`（端口 5000）
- **根 `.coze` 映射**: `[deploy].build/run` 指向 `projects/scripts/build.sh` 和 `start.sh`
- **脚本工作目录**: 所有脚本均基于 `SCRIPT_DIR` 推导 `PROJECT_DIR`，不依赖调用时 `pwd`

### 长期注意事项
- 预览服务必须绑定 `0.0.0.0:5000`，不能是 `127.0.0.1` 或 `[::1]`
- 部署脚本使用 `DEPLOY_RUN_PORT` 环境变量支持端口覆盖，默认 5000
- 禁止使用 `9000` 端口（系统保留）
- Node.js 项目只允许使用 `pnpm`，禁止 `npm` 或 `yarn`
- **Supabase 配置缺失降级**: 当 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 未配置时，`auth-context.tsx` 会降级处理（返回 null），页面可正常显示但认证功能不可用。需在平台配置 Supabase 环境变量后才能使用登录/注册/历史记录功能。
  - ⚠️ 平台环境变量名必须使用 `NEXT_PUBLIC_` 前缀，禁止使用 `COZE_` 前缀
  - **运行时回退**: 若构建时 `NEXT_PUBLIC_` 环境变量未设置，`auth-context.tsx` 会调用 `/api/config/supabase` 端点从服务端运行时获取凭证。该端点通过 `supabase-client.ts` 的 `loadEnv()` 加载环境变量（支持 dotenv / Python SDK）。
- **LLM API 环境变量**: 默认 LLM 配置通过环境变量管理，优先级：用户前端传入 > 环境变量 > SDK 默认值
  - `DEFAULT_LLM_API_KEY` - 默认 API Key
  - `DEFAULT_LLM_BASE_URL` - 默认 Base URL
  - `DEFAULT_LLM_MODEL` - 默认模型名称（默认 `doubao-seed-2-0-pro-260215`）
  - 配置模块: `src/lib/llm-config.ts`，所有 API 路由统一使用 `createLLMClient()` 创建客户端
