<div align="center">
  <br />
  <div>
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" rx="16" fill="#B8956A"/>
      <path d="M20 30V24h40v6" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M38 56h4" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M40 24v32" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="40" y="68" text-anchor="middle" fill="white" font-size="8" font-family="serif" font-weight="bold">NL</text>
    </svg>
  </div>
  <h1 align="center">NoteToLaTeX</h1>
  <p align="center">
    Convert handwritten math notes to publication-ready LaTeX code using AI-powered OCR
  </p>

  <p align="center">
    <a href="#features">Features</a> ·
    <a href="#demo">Demo</a> ·
    <a href="#tech-stack">Tech Stack</a> ·
    <a href="#getting-started">Getting Started</a> ·
    <a href="#project-structure">Structure</a> ·
    <a href="#api-routes">API</a> ·
    <a href="#deployment">Deployment</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16.1.1-black?style=flat-square&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/shadcn/ui-000?style=flat-square&logo=shadcnui" alt="shadcn/ui" />
    <img src="https://img.shields.io/badge/pnpm-9.0-F69220?style=flat-square&logo=pnpm" alt="pnpm" />
  </p>
</div>

---

## Overview

**NoteToLaTeX** is a full-stack web application that leverages AI to convert handwritten mathematical notes from images or PDFs into professional LaTeX code. It provides an intuitive three-stage pipeline—OCR recognition, validation, and LaTeX conversion—along with bidirectional editing, conversion history, and multiple export options.

Built with Next.js 16 (App Router), shadcn/ui, Tailwind CSS v4, Supabase (auth + database), and the Coze AI SDK.

## Features

### Core Pipeline
- **📄 Multi-format Input** — Upload PNG, JPG, WebP, or PDF files (supports drag & drop, camera capture, and an on-screen writing pad)
- **🤖 AI OCR** — Transcribes handwritten content (including complex mathematical formulas) into Markdown
- **✅ Smart Validation** — Automatically detects and fixes OCR errors, ensuring formula accuracy and structural integrity
- **📝 LaTeX Conversion** — Generates complete, compilable LaTeX documents with proper preamble, sectioning, and math environments
- **📊 Streaming Progress** — Real-time SSE streaming shows progress across all pipeline stages

### Editing & Export
- **🔄 Bidirectional Sync** — Edit Markdown to auto-regenerate LaTeX, or edit LaTeX to reverse-convert to Markdown
- **📥 Multiple Export Formats** — Export as PDF (print), .tex file, .md file, or copy to clipboard
- **✏️ Smart Chunking** — Long documents are intelligently split at paragraph/environment boundaries for reliable AI processing

### User System
- **🔐 Supabase Auth** — Email/password registration and login
- **📚 Conversion History** — Save, browse, rename, and reload past conversions
- **👤 Profile Settings** — Custom username and avatar

### Customization
- **⚙️ API Configuration** — Customize AI provider, model, API key, and base URL (stored locally, never sent to server)
- **🌓 Theme Toggle** — Light/dark mode with automatic preference saving

### Alternative Input Methods
- **📸 Camera Capture** — Take a photo of handwritten notes directly in the browser
- **✍️ Writing Pad** — On-screen canvas for handwriting with color/width controls, undo, and eraser

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) |
| **Database** | [Supabase PostgreSQL](https://supabase.com/database) |
| **AI Engine** | [Coze SDK](https://www.coze.com/) / OpenAI-compatible LLM APIs |
| **Math Rendering** | [KaTeX](https://katex.org/) via rehype-katex |
| **Language** | TypeScript 5.x |
| **Package Manager** | pnpm 9+ |

## Demo

| | |
|---|---|
| **Upload handwritten notes** → | Drag & drop images or PDFs |
| **AI processes automatically** → | OCR → Validate → Convert to LaTeX |
| **Review & edit** → | Toggle between rendered preview / LaTeX / Markdown |
| **Export** → | PDF, .tex, .md, or clipboard |

> **No login required** for basic conversion. Create an account to save and manage your conversion history.

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9.0

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create `projects/.env.local`:

```env
# Supabase (Auth + Database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Default LLM Configuration (optional — user can override in-app)
DEFAULT_LLM_API_KEY=your-api-key
DEFAULT_LLM_BASE_URL=https://api.coze.cn/v3
DEFAULT_LLM_MODEL=doubao-seed-2-0-pro-260215
```

### 3. Run Development Server

```bash
coze dev
# or directly:
bash ./scripts/dev.sh
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

### 4. Build for Production

```bash
coze build
coze start
```

## Project Structure

```
projects/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/               # Auth endpoints (register, login, me)
│   │   │   ├── config/supabase/    # Supabase runtime config
│   │   │   ├── history/            # Conversion history CRUD
│   │   │   ├── latex/              # Markdown → LaTeX conversion
│   │   │   ├── ocr/                # OCR image recognition
│   │   │   ├── reverse-latex/      # LaTeX → Markdown conversion
│   │   │   └── validate/           # OCR result validation
│   │   ├── help/                   # Help/documentation page
│   │   ├── layout.tsx              # Root layout (ThemeProvider, AuthProvider)
│   │   ├── page.tsx                # Main application page
│   │   └── globals.css             # Global styles & theme tokens
│   ├── components/
│   │   ├── ui/                     # shadcn/ui base components
│   │   ├── auth-form.tsx           # Login/register form
│   │   ├── api-config-dialog.tsx   # Custom API configuration dialog
│   │   ├── camera-capture.tsx      # Browser camera capture
│   │   ├── file-upload.tsx         # Drag & drop file upload area
│   │   ├── history-sidebar.tsx     # Conversion history sidebar
│   │   ├── processing-pipeline.tsx # Pipeline step indicator
│   │   ├── profile-settings-dialog.tsx  # User profile settings
│   │   ├── results-panel.tsx       # Three-tab result viewer/editor
│   │   ├── theme-provider.tsx      # Theme provider (next-themes)
│   │   ├── theme-toggle.tsx        # Theme toggle button
│   │   ├── user-menu.tsx           # User dropdown menu
│   │   └── writing-pad.tsx         # On-screen handwriting canvas
│   ├── lib/
│   │   ├── auth-context.tsx        # React context for authentication
│   │   ├── conversion-history.ts   # History data types
│   │   ├── llm-config.ts          # LLM client factory (Coze SDK)
│   │   ├── pdf-utils.ts           # PDF-to-image conversion
│   │   ├── supabase-client.ts     # Supabase server client
│   │   └── utils.ts               # Utility functions (cn, etc.)
│   └── hooks/
│       └── use-mobile.ts          # Mobile detection hook
├── server/                         # Custom server (optional)
├── scripts/                        # Build & deployment scripts
├── public/                         # Static assets
├── AGENTS.md                       # AI agent configuration
├── DESIGN.md                       # Design system notes
├── package.json
└── .env.local                      # Environment variables (gitignored)
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ocr` | POST | OCR image recognition — accepts base64-encoded images, returns SSE stream |
| `/api/validate` | POST | Validates and corrects OCR output — returns SSE stream |
| `/api/latex` | POST | Converts Markdown to complete LaTeX document — returns SSE stream |
| `/api/reverse-latex` | POST | Converts LaTeX back to Markdown — returns SSE stream |
| `/api/auth/register` | POST | User registration (email, password, username) |
| `/api/auth/login` | POST | User login |
| `/api/auth/me` | GET | Get current authenticated user |
| `/api/history` | GET | List conversion history (authenticated) |
| `/api/history` | POST | Save new conversion record (authenticated) |
| `/api/history` | PUT | Update conversion record (authenticated, `?id=`) |
| `/api/history` | DELETE | Delete conversion record (authenticated, `?id=`) |
| `/api/config/supabase` | GET | Get Supabase runtime configuration |

All AI endpoints use **Server-Sent Events (SSE)** streaming:

```
data: {"text": "streamed content chunk..."}
data: {"text": "more content..."}
data: [DONE]
```

## Key Design Decisions

### Smart Chunk Splitting
Long documents are processed in chunks using `splitTextSmartly()` which respects LaTeX environment boundaries (`\begin{}...\end{}`) and display math delimiters (`$$...$$`), avoiding broken output.

### Bidirectional Editing
The Markdown editor and LaTeX editor are kept in sync via debounced auto-conversion. Editing Markdown triggers LaTeX regeneration (and vice versa), with a 1.5-second debounce to prevent excessive API calls.

### API Config Flexibility
Users can configure separate AI providers/models for the OCR and validation stages. Configuration is stored in browser localStorage and never sent to the server, preserving API key privacy.

### Unauthenticated Access
The core conversion pipeline works without login. Authentication is only required for history persistence and profile management.

## Deployment

### Using Coze CLI

```bash
coze build    # Build production bundle
coze start    # Start production server
```

### Manual Deployment

1. Build: `pnpm build` (or `bash ./scripts/build.sh`)
2. Start: `pnpm start` (or `bash ./scripts/start.sh`)

### Environment Variables

Required for production:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `DEFAULT_LLM_API_KEY` — Default LLM API key (server-side only)
- `DEFAULT_LLM_BASE_URL` — Default LLM base URL
- `DEFAULT_LLM_MODEL` — Default LLM model name

## Development

```bash
# Lint & type check
pnpm lint
pnpm ts-check

# Validate all (lint + types + style)
pnpm validate

# Use shadcn to add new UI components
pnpm dlx shadcn add button
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for the mathematical writing community</sub>
</div>
