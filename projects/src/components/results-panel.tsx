"use client";

import { useState, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";

interface ResultsPanelProps {
  markdown: string;
  latex: string;
  onMarkdownEdit: (value: string) => void;
  onLatexEdit: (value: string) => void;
  onRegenerateLatex: () => void;
  isRegenerating: boolean;
  isReverseConverting?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
}

type Tab = "preview" | "latex" | "editor";

export function ResultsPanel({
  markdown,
  latex,
  onMarkdownEdit,
  onLatexEdit,
  onRegenerateLatex,
  isRegenerating,
  isReverseConverting = false,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
}: ResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, []);

  const handleDownloadTex = useCallback(() => {
    const blob = new Blob([latex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.tex";
    a.click();
    URL.revokeObjectURL(url);
  }, [latex]);

  const handleDownloadPdf = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const katexCss = document.querySelector('link[href*="katex"]')?.outerHTML || "";
    const fontsCss = `
      <link rel="stylesheet" href="https://fonts.googleapis.cn/css2?family=Noto+Serif+SC:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
    `;

    const content = previewRef.current?.innerHTML || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NoteToLaTeX - Export</title>
        ${katexCss}
        ${fontsCss}
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', 'Noto Sans SC', sans-serif;
            color: #1A1A1A;
            background: #FFFFFF;
            padding: 48px;
            line-height: 1.7;
            font-size: 14px;
          }
          h1 { font-family: 'Noto Serif SC', serif; font-size: 22px; font-weight: 700; border-bottom: 1px solid #E8E6E1; padding-bottom: 8px; margin: 24px 0 16px; }
          h2 { font-family: 'Noto Serif SC', serif; font-size: 18px; font-weight: 600; margin: 20px 0 12px; }
          h3 { font-family: 'Noto Serif SC', serif; font-size: 16px; font-weight: 600; margin: 16px 0 8px; }
          p { margin-bottom: 12px; }
          ul, ol { margin: 12px 0; padding-left: 24px; }
          li { margin-bottom: 4px; }
          code { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: #F5F3EE; padding: 2px 6px; border-radius: 3px; }
          pre { background: #F5F3EE; border: 1px solid #E8E6E1; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 16px 0; }
          pre code { background: transparent; padding: 0; }
          blockquote { border-left: 2px solid #E8E6E1; padding-left: 16px; font-style: italic; color: #6B6B6B; margin: 16px 0; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #E8E6E1; padding: 8px 12px; text-align: left; }
          th { background: #F5F3EE; font-weight: 600; }
          hr { border: none; border-top: 1px solid #E8E6E1; margin: 24px 0; }
          .katex-display { margin: 16px 0; overflow-x: auto; }
          a { color: #B8956A; text-decoration: underline; }
          @media print {
            body { padding: 24px; }
            @page { margin: 2cm; }
          }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();

    // Wait for KaTeX to render, then trigger print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  }, []);

  const handleDownloadMarkdown = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "preview", label: "预览" },
    { key: "latex", label: "LaTeX" },
    { key: "editor", label: "编辑器" },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] border border-border rounded-lg bg-card overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border bg-muted/30">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2.5 text-sm font-medium transition-colors relative
                ${
                  activeTab === tab.key
                    ? "text-foreground bg-card"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B8956A]" />
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5 px-3">
          {activeTab === "preview" && (
            <>
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M12 18v-6" />
                  <path d="M9 15l3 3 3-3" />
                </svg>
                PDF
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                .md
              </button>
            </>
          )}
          {activeTab === "latex" && (
            <>
              <button
                onClick={() => handleCopy(latex)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    已复制
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    复制
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadTex}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                .tex
              </button>
            </>
          )}
          {activeTab === "editor" && (
            <button
              onClick={onRegenerateLatex}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#B8956A] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#B8956A]/90 disabled:opacity-50"
            >
              {isRegenerating ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  转换中...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                  </svg>
                  重新生成 LaTeX
                </>
              )}
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                hasUnsavedChanges
                  ? "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  保存中...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  {hasUnsavedChanges ? "保存修改" : "已保存"}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "preview" && (
          <div
            ref={previewRef}
            className="flex-1 overflow-auto p-6 max-w-none text-foreground
              [&_h1]:text-xl [&_h1]:font-bold [&_h1]:font-serif [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2 [&_h1]:mb-4 [&_h1]:tracking-tight
              [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:font-serif [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:tracking-tight
              [&_h3]:text-base [&_h3]:font-semibold [&_h3]:font-serif [&_h3]:mt-4 [&_h3]:mb-2
              [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-foreground
              [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1
              [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1
              [&_strong]:font-semibold [&_em]:italic
              [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-foreground
              [&_pre]:bg-muted [&_pre]:border [&_pre]:border-border [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4
              [&_pre_code]:bg-transparent [&_pre_code]:p-0
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
              [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:bg-muted
              [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
              [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4
              [&_hr]:border-border [&_hr]:my-6
              [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto
              [&_.katex]:text-[0.95em]
              [&_a]:text-[#B8956A] [&_a]:underline hover:[&_a]:no-underline
              dark:[&_a]:text-[#D4B896]
            "
          >
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        )}

        {activeTab === "latex" && (
          isRegenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#F5F3EE] dark:bg-[#141620]">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#B8956A] border-t-transparent" />
                <span className="text-sm text-muted-foreground font-medium">LaTeX 更新中...</span>
              </div>
            </div>
          ) : (
            <textarea
              value={latex}
              onChange={(e) => onLatexEdit(e.target.value)}
              className="flex-1 w-full resize-none bg-[#F5F3EE] dark:bg-[#141620] p-6 font-mono text-xs leading-relaxed text-foreground focus:outline-none placeholder:text-muted-foreground"
              placeholder="LaTeX 代码将在此处显示..."
              spellCheck={false}
            />
          )
        )}

        {activeTab === "editor" && (
          isReverseConverting ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-transparent">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#B8956A] border-t-transparent" />
                <span className="text-sm text-muted-foreground font-medium">Markdown 更新中...</span>
              </div>
            </div>
          ) : (
            <textarea
              value={markdown}
              onChange={(e) => onMarkdownEdit(e.target.value)}
              className="flex-1 w-full resize-none bg-transparent p-6 font-mono text-xs leading-relaxed text-foreground focus:outline-none placeholder:text-muted-foreground"
              placeholder="在此编辑 Markdown 内容..."
              spellCheck={false}
            />
          )
        )}
      </div>
    </div>
  );
}
