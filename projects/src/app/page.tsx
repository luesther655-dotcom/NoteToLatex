"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileUpload } from "@/components/file-upload";
import { ProcessingPipeline } from "@/components/processing-pipeline";
import { ResultsPanel } from "@/components/results-panel";
import { pdfToImages } from "@/lib/pdf-utils";

type PipelineStep = "idle" | "uploading" | "ocr" | "validating" | "converting" | "done" | "error";

async function readSSEStream(
  response: Response,
  onChunk: (text: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("无响应内容");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            fullText += parsed.text;
            onChunk(parsed.text);
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }

  return fullText;
}

export default function Home() {
  const [step, setStep] = useState<PipelineStep>("idle");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrMarkdown, setOcrMarkdown] = useState("");
  const [validatedMarkdown, setValidatedMarkdown] = useState("");
  const [latexCode, setLatexCode] = useState("");
  const [ocrProgress, setOcrProgress] = useState("");
  const [validateProgress, setValidateProgress] = useState("");
  const [latexProgress, setLatexProgress] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isReverseConverting, setIsReverseConverting] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    setStep("idle");
    setUploadedFile(null);
    setPreviewUrl(null);
    setOcrMarkdown("");
    setValidatedMarkdown("");
    setLatexCode("");
    setOcrProgress("");
    setValidateProgress("");
    setLatexProgress("");
    setErrorMsg("");
    setIsRegenerating(false);
    setIsReverseConverting(false);
    // Clear debounce timers
    if (editorDebounceRef.current) {
      clearTimeout(editorDebounceRef.current);
      editorDebounceRef.current = null;
    }
    if (latexDebounceRef.current) {
      clearTimeout(latexDebounceRef.current);
      latexDebounceRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    resetState();
    setUploadedFile(file);
    setErrorMsg("");

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Step 1: Upload & OCR
      setStep("uploading");
      await new Promise((r) => setTimeout(r, 300));

      setStep("ocr");
      setOcrProgress("");

      // Handle PDF files by converting to images first
      let filesToProcess: File[] = [file];
      if (file.type === "application/pdf") {
        setOcrProgress("正在将 PDF 转为图片...");
        filesToProcess = await pdfToImages(file);
        if (filesToProcess.length === 0) {
          throw new Error("PDF 图片提取失败");
        }
        // Use first page for preview
        const url = URL.createObjectURL(filesToProcess[0]);
        setPreviewUrl(url);
      }

      // Process all files (for multi-page PDFs)
      let combinedOcrText = "";
      for (let i = 0; i < filesToProcess.length; i++) {
        const currentFile = filesToProcess[i];
        if (filesToProcess.length > 1) {
          setOcrProgress(`正在处理第 ${i + 1}/${filesToProcess.length} 页...`);
        }

        const formData = new FormData();
        formData.append("file", currentFile);

        const ocrResponse = await fetch("/api/ocr", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        if (!ocrResponse.ok) {
          const errData = await ocrResponse.json();
          throw new Error(errData.error || "OCR 识别失败");
        }

        let pageText = "";
        pageText = await readSSEStream(ocrResponse, (chunk) => {
          setOcrProgress((prev) => {
            // Only show streaming text for single-page content
            if (filesToProcess.length === 1) return prev + chunk;
            return prev;
          });
        });
        combinedOcrText += pageText;
        if (i < filesToProcess.length - 1) {
          combinedOcrText += "\n\n";
        }
      }
      setOcrMarkdown(combinedOcrText);

      // Step 2: Validate
      setStep("validating");
      setValidateProgress("");

      const validateResponse = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: combinedOcrText }),
        signal: controller.signal,
      });

      if (!validateResponse.ok) {
        const errData = await validateResponse.json();
        throw new Error(errData.error || "校验请求失败");
      }

      let validatedText = "";
      validatedText = await readSSEStream(validateResponse, (chunk) => {
        setValidateProgress((prev) => prev + chunk);
      });
      setValidatedMarkdown(validatedText);

      // Step 3: Convert to LaTeX
      setStep("converting");
      setLatexProgress("");

      const latexResponse = await fetch("/api/latex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: validatedText }),
        signal: controller.signal,
      });

      if (!latexResponse.ok) {
        const errData = await latexResponse.json();
        throw new Error(errData.error || "LaTeX 转换失败");
      }

      let latexText = "";
      latexText = await readSSEStream(latexResponse, (chunk) => {
        setLatexProgress((prev) => prev + chunk);
      });
      setLatexCode(latexText);

      setStep("done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "处理失败";
      setErrorMsg(message);
      setStep("error");
    }
  }, [resetState]);

  // Shared refs for regeneration logic
  const editorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latexDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPipelineRunningRef = useRef(false);
  const latestMarkdownRef = useRef(validatedMarkdown);
  const latestLatexRef = useRef(latexCode);
  const isRegeneratingRef = useRef(false);
  const isReverseConvertingRef = useRef(false);
  const pendingRegenerationRef = useRef(false); // tracks edits that happen during an active regeneration
  const pendingReverseConversionRef = useRef(false); // tracks latex edits during active reverse conversion

  // Keep refs in sync with state
  useEffect(() => {
    latestMarkdownRef.current = validatedMarkdown;
  }, [validatedMarkdown]);

  useEffect(() => {
    latestLatexRef.current = latexCode;
  }, [latexCode]);

  // Track when pipeline is running to avoid triggering auto-regenerate
  useEffect(() => {
    isPipelineRunningRef.current = step !== 'idle' && step !== 'done' && step !== 'error';
  }, [step]);

  // Normalize text for comparison: remove extra whitespace, normalize line endings
  const normalizeForComparison = useCallback((text: string): string => {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+$/gm, '')
      .trim();
  }, []);

  // Check if two texts are semantically similar enough
  const isSimilarEnough = useCallback((original: string, converted: string): boolean => {
    const normOriginal = normalizeForComparison(original);
    const normConverted = normalizeForComparison(converted);
    
    // Exact match after normalization
    if (normOriginal === normConverted) return true;
    
    // Check if key content is preserved (math expressions, headings, etc.)
    // Extract math expressions
    const mathRegex = /\$\$?[^$]+\$\$?/g;
    const originalMath = normOriginal.match(mathRegex) || [];
    
    // If math expressions differ significantly, not similar enough
    if (originalMath.length > 0) {
      const mathMatchRate = originalMath.filter(m => normConverted.includes(m)).length / originalMath.length;
      if (mathMatchRate < 0.8) return false;
    }
    
    // Check headings preservation
    const headingRegex = /^#+\s.+$/gm;
    const originalHeadings = normOriginal.match(headingRegex) || [];
    const convertedHeadings = normConverted.match(headingRegex) || [];
    
    if (originalHeadings.length > 0 && convertedHeadings.length === 0) return false;
    
    // Simple length check - if converted is way shorter, something went wrong
    const lengthRatio = normConverted.length / Math.max(normOriginal.length, 1);
    if (lengthRatio < 0.5 || lengthRatio > 2.5) return false;
    
    return true;
  }, [normalizeForComparison]);

  // Shared regeneration logic — calls /api/latex with the latest markdown.
  // After completion, verifies by reverse-converting and comparing.
  const regenerateLatex = useCallback(async () => {
    if (isRegeneratingRef.current) {
      pendingRegenerationRef.current = true;
      return;
    }

    isRegeneratingRef.current = true;
    setIsRegenerating(true);
    setLatexProgress('');
    setLatexCode('');

    const maxIterations = 2;
    let currentMarkdown = latestMarkdownRef.current;

    try {
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const controller = new AbortController();

        // Step 1: Convert Markdown → LaTeX
        const latexResponse = await fetch('/api/latex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown: currentMarkdown }),
          signal: controller.signal,
        });

        if (!latexResponse.ok) throw new Error('LaTeX 转换失败');

        let latexText = '';
        latexText = await readSSEStream(latexResponse, (chunk) => {
          setLatexProgress((prev) => prev + chunk);
        });

        setLatexCode(latexText);
        latestLatexRef.current = latexText;

        // Step 2: Verify by reverse-converting LaTeX → Markdown
        if (iteration < maxIterations - 1) {
          const verifyResponse = await fetch('/api/reverse-latex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latex: latexText }),
            signal: controller.signal,
          });

          if (!verifyResponse.ok) break;

          let verifiedMarkdown = '';
          verifiedMarkdown = await readSSEStream(verifyResponse, () => {});

          // Step 3: Compare and decide if another iteration is needed
          if (isSimilarEnough(currentMarkdown, verifiedMarkdown)) {
            // Good enough, stop iterating
            break;
          }

          // Not similar enough, use the verified markdown for next iteration
          currentMarkdown = verifiedMarkdown;
          setValidatedMarkdown(verifiedMarkdown);
          latestMarkdownRef.current = verifiedMarkdown;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : '重新生成失败';
      setErrorMsg(message);
    } finally {
      setIsRegenerating(false);
      isRegeneratingRef.current = false;

      if (pendingRegenerationRef.current) {
        pendingRegenerationRef.current = false;
        regenerateLatex();
      }
    }
  }, [isSimilarEnough]);

  // Reverse conversion: LaTeX → Markdown with verification
  const reverseConvertMarkdown = useCallback(async () => {
    if (isReverseConvertingRef.current) {
      pendingReverseConversionRef.current = true;
      return;
    }

    isReverseConvertingRef.current = true;
    setIsReverseConverting(true);

    const maxIterations = 2;
    let currentLatex = latestLatexRef.current;

    try {
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const controller = new AbortController();

        // Step 1: Convert LaTeX → Markdown
        const response = await fetch('/api/reverse-latex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latex: currentLatex }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Markdown 转换失败');

        let markdownText = '';
        markdownText = await readSSEStream(response, () => {});

        setValidatedMarkdown(markdownText);
        latestMarkdownRef.current = markdownText;

        // Step 2: Verify by forward-converting Markdown → LaTeX
        if (iteration < maxIterations - 1) {
          const verifyResponse = await fetch('/api/latex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markdown: markdownText }),
            signal: controller.signal,
          });

          if (!verifyResponse.ok) break;

          let verifiedLatex = '';
          verifiedLatex = await readSSEStream(verifyResponse, () => {});

          // Step 3: Compare and decide if another iteration is needed
          if (isSimilarEnough(currentLatex, verifiedLatex)) {
            break;
          }

          // Not similar enough, use the verified latex for next iteration
          currentLatex = verifiedLatex;
          setLatexCode(verifiedLatex);
          latestLatexRef.current = verifiedLatex;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : '反向转换失败';
      setErrorMsg(message);
    } finally {
      setIsReverseConverting(false);
      isReverseConvertingRef.current = false;

      if (pendingReverseConversionRef.current) {
        pendingReverseConversionRef.current = false;
        reverseConvertMarkdown();
      }
    }
  }, [isSimilarEnough]);

  const handleMarkdownEdit = useCallback((value: string) => {
    setValidatedMarkdown(value);
    latestMarkdownRef.current = value;

    // Clear any pending LaTeX debounce to avoid conflicts
    if (latexDebounceRef.current) {
      clearTimeout(latexDebounceRef.current);
      latexDebounceRef.current = null;
    }

    // Debounce auto-regeneration — only when pipeline is settled
    if (editorDebounceRef.current) {
      clearTimeout(editorDebounceRef.current);
    }
    if (step !== 'done' && step !== 'error') return;

    editorDebounceRef.current = setTimeout(() => {
      regenerateLatex();
    }, 1500);
  }, [step, regenerateLatex]);

  const handleLatexEdit = useCallback((value: string) => {
    setLatexCode(value);
    latestLatexRef.current = value;

    // Clear any pending editor debounce to avoid conflicts
    if (editorDebounceRef.current) {
      clearTimeout(editorDebounceRef.current);
      editorDebounceRef.current = null;
    }

    // Debounce reverse conversion — only when pipeline is settled
    if (latexDebounceRef.current) {
      clearTimeout(latexDebounceRef.current);
    }
    if (step !== 'done' && step !== 'error') return;

    latexDebounceRef.current = setTimeout(() => {
      reverseConvertMarkdown();
    }, 1500);
  }, [step, reverseConvertMarkdown]);

  const handleRegenerateLatex = useCallback(async () => {
    // Cancel any pending debounced auto-regeneration
    if (editorDebounceRef.current) {
      clearTimeout(editorDebounceRef.current);
      editorDebounceRef.current = null;
    }
    await regenerateLatex();
  }, [regenerateLatex]);

  const isProcessing = step !== "idle" && step !== "done" && step !== "error";
  const hasResults = step === "done" || (step === "error" && validatedMarkdown.length > 0);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#B8956A]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight font-serif">
                NoteToLaTeX
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none">
                手写笔记转换器
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step !== "idle" && (
              <button
                onClick={resetState}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                重新开始
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {step === "idle" ? (
          /* Upload State */
          <div className="mx-auto max-w-xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-serif font-bold tracking-tight">
                手写笔记转 LaTeX
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                上传您的手写笔记（图片或 PDF 格式）。
                <br />
                AI 将识别、校验并转换为可出版的 LaTeX 代码。
              </p>
            </div>

            <FileUpload onFileSelect={processFile} isProcessing={false} />

            {/* Decorative math symbols */}
            <div className="mt-8 flex items-center justify-center gap-6 text-muted-foreground/30 text-xs font-mono select-none">
              <span>&int; f(x)dx</span>
              <span>&sum; a_n x^n</span>
              <span>&nabla;&times;F</span>
              <span>&part;u/&part;t</span>
            </div>
          </div>
        ) : (
          /* Processing / Results State */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left panel: Upload preview + Pipeline */}
            <div className="lg:col-span-4 space-y-4">
              {/* File preview */}
              {uploadedFile && (
                <div className="border border-border rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">
                      Source
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {uploadedFile.name}
                    </span>
                  </div>
                  {previewUrl ? (
                    <div className="p-3">
                      <img
                        src={previewUrl}
                        alt="已上传笔记"
                        className="w-full rounded border border-border object-contain max-h-[300px]"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        PDF 文档
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pipeline */}
              <div className="border border-border rounded-lg bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  处理流程
                </h3>
                <ProcessingPipeline
                  currentStep={step}
                  ocrProgress={ocrProgress}
                  validateProgress={validateProgress}
                  latexProgress={latexProgress}
                />
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                    错误：{errorMsg}
                  </p>
                  <button
                    onClick={resetState}
                    className="mt-2 text-xs text-red-600 dark:text-red-400 underline hover:no-underline"
                  >
                    重试
                  </button>
                </div>
              )}
            </div>

            {/* Right panel: Results */}
            <div className="lg:col-span-8 min-h-[calc(100vh-8rem)]">
              {hasResults ? (
                <ResultsPanel
                  markdown={validatedMarkdown}
                  latex={latexCode}
                  onMarkdownEdit={handleMarkdownEdit}
                  onLatexEdit={handleLatexEdit}
                  onRegenerateLatex={handleRegenerateLatex}
                  isRegenerating={isRegenerating}
                  isReverseConverting={isReverseConverting}
                />
              ) : (
                <div className="flex h-full min-h-[400px] items-center justify-center border border-border rounded-lg bg-card">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {isProcessing ? (
                        <svg className="animate-spin text-[#B8956A]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <line x1="10" y1="9" x2="8" y2="9" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isProcessing ? "正在处理您的笔记..." : "结果将在此处显示"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
