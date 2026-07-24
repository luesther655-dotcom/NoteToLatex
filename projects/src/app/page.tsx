"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileUpload } from "@/components/file-upload";
import { ProcessingPipeline } from "@/components/processing-pipeline";
import { ResultsPanel } from "@/components/results-panel";
import { AuthForm } from "@/components/auth-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HistorySidebar, type ConversionHistoryItem } from "@/components/history-sidebar";
import { UserMenu } from "@/components/user-menu";
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog";
import { ApiConfigDialog } from "@/components/api-config-dialog";
import { useAuth } from "@/lib/auth-context";
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

// Clean markdown code block markers from LLM output
function cleanMarkdownOutput(text: string): string {
  let cleaned = text.trim();
  
  // Remove leading ```markdown or ```
  if (cleaned.startsWith("```markdown")) {
    cleaned = cleaned.slice(11);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  
  // Remove trailing ```
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  
  return cleaned.trim();
}

// Convert File to base64
async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type || "image/png" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get API config from localStorage
function getApiConfig() {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem("apiConfig");
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

// Smart chunk splitting that avoids breaking LaTeX environments
function splitTextSmartly(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChunkSize) {
      chunks.push(remaining);
      break;
    }

    // Find a good break point
    let breakPoint = -1;
    
    // First, try to find paragraph boundary
    breakPoint = remaining.lastIndexOf("\n\n", maxChunkSize);
    
    // If no paragraph boundary found in the last half, try single newline
    if (breakPoint === -1 || breakPoint < maxChunkSize / 2) {
      breakPoint = remaining.lastIndexOf("\n", maxChunkSize);
    }
    
    // If still no good break point, force split at max size
    if (breakPoint === -1 || breakPoint < maxChunkSize / 2) {
      breakPoint = maxChunkSize;
    }

    // Check if we're in the middle of a LaTeX environment
    const chunk = remaining.slice(0, breakPoint);
    
    // Count unclosed LaTeX environments
    const beginMatches = chunk.match(/\\begin\{([^}]+)\}/g) || [];
    const endMatches = chunk.match(/\\end\{([^}]+)\}/g) || [];
    
    // Track environment types
    const envStack: string[] = [];
    for (const match of beginMatches) {
      const envName = match.match(/\\begin\{([^}]+)\}/)?.[1];
      if (envName) envStack.push(envName);
    }
    for (const match of endMatches) {
      const envName = match.match(/\\end\{([^}]+)\}/)?.[1];
      if (envName && envStack.length > 0 && envStack[envStack.length - 1] === envName) {
        envStack.pop();
      }
    }
    
    // If there are unclosed environments, try to find a better break point
    if (envStack.length > 0) {
      // Look for the closing of the last unclosed environment
      const lastEnv = envStack[envStack.length - 1];
      const endPattern = new RegExp(`\\\\end\\{${lastEnv}\\}`);
      const endMatch = remaining.slice(breakPoint).match(endPattern);
      
      if (endMatch && endMatch.index !== undefined) {
        // Extend break point to include the closing tag
        breakPoint = breakPoint + endMatch.index + endMatch[0].length;
      }
    }

    // Check for unclosed display math ($$...$$)
    const displayMathCount = (chunk.match(/\$\$/g) || []).length;
    if (displayMathCount % 2 !== 0) {
      // Unclosed display math, try to find the closing $$
      const closingMatch = remaining.slice(breakPoint).match(/\$\$/);
      if (closingMatch && closingMatch.index !== undefined) {
        breakPoint = breakPoint + closingMatch.index + closingMatch[0].length;
      }
    }

    chunks.push(remaining.slice(0, breakPoint));
    remaining = remaining.slice(breakPoint).trimStart();
  }

  return chunks;
}

export default function Home() {
  const { user, username, loading: authLoading, signOut, getToken } = useAuth();
  // Use refs to store latest user and getToken for async operations
  const userRef = useRef(user);
  const getTokenRef = useRef(getToken);
  userRef.current = user;
  getTokenRef.current = getToken;
  const [step, setStep] = useState<PipelineStep>("idle");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrMarkdown, setOcrMarkdown] = useState("");
  const [validatedMarkdown, setValidatedMarkdown] = useState("");
  const [latexCode, setLatexCode] = useState("");
  const [ocrProgress, setOcrProgress] = useState("");
  const [validateProgress, setValidateProgress] = useState("");
  const [latexProgress, setLatexProgress] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isReverseConverting, setIsReverseConverting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [historySaved, setHistorySaved] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [errorMsg, setErrorMsg] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const lastSavedContentRef = useRef<{ markdown: string; latex: string } | null>(null);

  const resetState = useCallback(() => {
    setStep("idle");
    setUploadedFiles([]);
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
    setCurrentHistoryId(null);
    setHistorySaved(false);
    setHasUnsavedChanges(false);
    setIsSaving(false);
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

  const handleAbort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsProcessing(false);
    setIsRegenerating(false);
    setIsReverseConverting(false);
    setStep("idle");
    setOcrProgress("");
    setValidateProgress("");
    setLatexProgress("");
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    resetState();
    setUploadedFiles(files);
    setErrorMsg("");
    setIsProcessing(true);

    // Create preview for first image
    if (files[0].type.startsWith("image/")) {
      const url = URL.createObjectURL(files[0]);
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

      // Collect all files to process (expand PDFs to images)
      let allFilesToProcess: File[] = [];
      for (const file of files) {
        if (file.type === "application/pdf") {
          setOcrProgress(`正在将 ${file.name} 转为图片...`);
          const pdfImages = await pdfToImages(file);
          if (pdfImages.length === 0) {
            throw new Error(`${file.name} PDF 图片提取失败`);
          }
          allFilesToProcess.push(...pdfImages);
          // Use first page for preview if no preview yet
          if (!previewUrl) {
            const url = URL.createObjectURL(pdfImages[0]);
            setPreviewUrl(url);
          }
        } else {
          allFilesToProcess.push(file);
        }
      }

      // Process files - send all at once for single image, or in batches for multiple
      let ocrText = "";
      const apiConfig = getApiConfig();
      const ocrApiConfig = apiConfig?.ocr || null;
      
      if (allFilesToProcess.length === 1) {
        // Single image - send directly
        const fileData = await fileToBase64(allFilesToProcess[0]);

        const ocrResponse = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: [fileData],
            apiConfig: ocrApiConfig,
          }),
          signal: controller.signal,
        });

        if (!ocrResponse.ok) {
          const contentType = ocrResponse.headers.get("content-type") || "";
          let errorMessage = "OCR 识别失败";
          if (contentType.includes("application/json")) {
            const errData = await ocrResponse.json();
            errorMessage = errData.error || errorMessage;
          } else {
            errorMessage = `服务器错误 (${ocrResponse.status})`;
          }
          throw new Error(errorMessage);
        }

        ocrText = await readSSEStream(ocrResponse, (chunk) => {
          setOcrProgress((prev) => prev + chunk);
        });
      } else {
        // Multiple files - process in batches to maintain context while avoiding size limits
        const BATCH_SIZE = 3;
        const pageTexts: string[] = [];
        const totalBatches = Math.ceil(allFilesToProcess.length / BATCH_SIZE);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startPage = batchIndex * BATCH_SIZE;
          const endPage = Math.min(startPage + BATCH_SIZE, allFilesToProcess.length);
          const batchFiles = allFilesToProcess.slice(startPage, endPage);
          
          setOcrProgress(`正在处理第 ${startPage + 1}-${endPage} 页 (共 ${allFilesToProcess.length} 页)...`);

          const batchFilesData = await Promise.all(batchFiles.map(f => fileToBase64(f)));

          const ocrResponse = await fetch("/api/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              files: batchFilesData,
              apiConfig: ocrApiConfig,
            }),
            signal: controller.signal,
          });

          if (!ocrResponse.ok) {
            const contentType = ocrResponse.headers.get("content-type") || "";
            let errorMessage = `第 ${startPage + 1}-${endPage} 页 OCR 识别失败`;
            if (contentType.includes("application/json")) {
              const errData = await ocrResponse.json();
              errorMessage = errData.error || errorMessage;
            } else {
              errorMessage = `服务器错误 (${ocrResponse.status})`;
            }
            throw new Error(errorMessage);
          }

          const batchText = await readSSEStream(ocrResponse, () => {});
          pageTexts.push(batchText);
        }
        ocrText = pageTexts.join("\n\n");
      }
      setOcrMarkdown(ocrText);

      // Step 2: Validate (in chunks for long text to avoid truncation)
      setStep("validating");
      setValidateProgress("");

      const CHUNK_SIZE = 3000; // characters per chunk
      let validatedText = "";
      const validateApiConfig = apiConfig?.validate || null;
      
      if (ocrText.length <= CHUNK_SIZE) {
        // Short text - process all at once
        const validateResponse = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            markdown: ocrText,
            apiConfig: validateApiConfig,
          }),
          signal: controller.signal,
        });

        if (!validateResponse.ok) {
          const errData = await validateResponse.json();
          throw new Error(errData.error || "校验请求失败");
        }

        validatedText = await readSSEStream(validateResponse, (chunk) => {
          setValidateProgress((prev) => prev + chunk);
        });
        validatedText = cleanMarkdownOutput(validatedText);
      } else {
        // Long text - process in chunks using smart splitting
        const chunks = splitTextSmartly(ocrText, CHUNK_SIZE);
        
        const totalChunks = chunks.length;
        for (let i = 0; i < totalChunks; i++) {
          setValidateProgress(`正在校验第 ${i + 1}/${totalChunks} 部分...`);
          const validateResponse = await fetch("/api/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              markdown: chunks[i],
              apiConfig: validateApiConfig,
            }),
            signal: controller.signal,
          });

          if (!validateResponse.ok) {
            const errData = await validateResponse.json();
            throw new Error(errData.error || `校验第 ${i + 1} 部分失败`);
          }

          const chunkText = await readSSEStream(validateResponse, () => {});
          validatedText += (validatedText ? "\n\n" : "") + cleanMarkdownOutput(chunkText);
        }
      }
      setValidatedMarkdown(validatedText);

      // Step 3: Convert to LaTeX (in chunks for long text to avoid truncation)
      setStep("converting");
      setLatexProgress("");

      let latexText = "";
      
      if (validatedText.length <= CHUNK_SIZE) {
        // Short text - process all at once
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

        latexText = await readSSEStream(latexResponse, (chunk) => {
          setLatexProgress((prev) => prev + chunk);
        });
      } else {
        // Long text - process in chunks using smart splitting
        const chunks = splitTextSmartly(validatedText, CHUNK_SIZE);
        
        const totalChunks = chunks.length;
        for (let i = 0; i < totalChunks; i++) {
          setLatexProgress(`正在转换第 ${i + 1}/${totalChunks} 部分...`);
          const latexResponse = await fetch("/api/latex", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markdown: chunks[i] }),
            signal: controller.signal,
          });

          if (!latexResponse.ok) {
            const errData = await latexResponse.json();
            throw new Error(errData.error || `LaTeX 转换第 ${i + 1} 部分失败`);
          }

          const chunkText = await readSSEStream(latexResponse, () => {});
          // Clean potential markdown code block markers from LLM output
          let cleanedChunk = chunkText.trim();
          if (cleanedChunk.startsWith("```latex") || cleanedChunk.startsWith("```tex")) {
            cleanedChunk = cleanedChunk.slice(cleanedChunk.indexOf("\n") + 1);
          } else if (cleanedChunk.startsWith("```")) {
            cleanedChunk = cleanedChunk.slice(3);
            if (cleanedChunk.startsWith("\n")) cleanedChunk = cleanedChunk.slice(1);
          }
          if (cleanedChunk.endsWith("```")) {
            cleanedChunk = cleanedChunk.slice(0, -3);
          }
          latexText += (latexText ? "\n\n" : "") + cleanedChunk.trim();
        }
      }
      setLatexCode(latexText);

      setStep("done");

      // Save to history if user is logged in
      // Use refs to get the latest user and getToken values
      const currentUser = userRef.current;
      const currentGetToken = getTokenRef.current;
      if (currentUser) {
        try {
          const token = await currentGetToken();
          if (!token) {
            console.warn("No auth token available, skipping history save");
            return;
          }
          const response = await fetch("/api/history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: files.length === 1 ? files[0].name : `${files.length} files`,
              source_image_url: previewUrl,
              markdown_content: validatedText,
              latex_content: latexText,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            setCurrentHistoryId(data.history?.id || null);
            setHistorySaved(true);
            setHistoryRefreshKey(prev => prev + 1); // Trigger sidebar refresh
            // Update last saved content to prevent unnecessary auto-save
            lastSavedContentRef.current = { markdown: validatedText, latex: latexText };
          } else {
            // History save is non-critical; warn and continue
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const errData = await response.json().catch(() => ({}));
              console.warn("History save skipped:", errData?.error || response.status);
            } else {
              console.warn("History save skipped:", response.status);
            }
          }
        } catch (e) {
          console.warn("History save skipped:", e instanceof Error ? e.message : e);
        }
      } else {
        console.log("User not logged in, skipping history save");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "处理失败";
      setErrorMsg(message);
      setStep("error");
    } finally {
      setIsProcessing(false);
    }
  }, [resetState, previewUrl]);

  // Handle file selection (add to list)
  const handleFilesSelect = useCallback((files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  // Handle remove file from list
  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle clear all files
  const handleClearFiles = useCallback(() => {
    setUploadedFiles([]);
    setPreviewUrl(null);
  }, []);

  // Handle start convert
  const handleStartConvert = useCallback(() => {
    if (uploadedFiles.length > 0) {
      processFiles(uploadedFiles);
    }
  }, [uploadedFiles, processFiles]);

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

  // Shared regeneration logic — calls /api/latex with the latest markdown.
  // LLM is instructed to ensure content consistency in the conversion.
  const regenerateLatex = useCallback(async () => {
    if (isRegeneratingRef.current) {
      pendingRegenerationRef.current = true;
      return;
    }

    isRegeneratingRef.current = true;
    setIsRegenerating(true);
    setLatexProgress('');
    setLatexCode('');

    try {
      const controller = new AbortController();

      const latexResponse = await fetch('/api/latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: latestMarkdownRef.current }),
        signal: controller.signal,
      });

      if (!latexResponse.ok) throw new Error('LaTeX 转换失败');

      let latexText = '';
      latexText = await readSSEStream(latexResponse, (chunk) => {
        setLatexProgress((prev) => prev + chunk);
      });

      setLatexCode(latexText);
      latestLatexRef.current = latexText;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : '重新生成失败';
      setErrorMsg(message);
    } finally {
      setIsRegenerating(false);
      isRegeneratingRef.current = false;
      setHasUnsavedChanges(true);

      if (pendingRegenerationRef.current) {
        pendingRegenerationRef.current = false;
        regenerateLatex();
      }
    }
  }, []);

  // Reverse conversion: LaTeX → Markdown
  // LLM is instructed to ensure content consistency in the conversion.
  const reverseConvertMarkdown = useCallback(async () => {
    if (isReverseConvertingRef.current) {
      pendingReverseConversionRef.current = true;
      return;
    }

    isReverseConvertingRef.current = true;
    setIsReverseConverting(true);

    try {
      const controller = new AbortController();

      const response = await fetch('/api/reverse-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex: latestLatexRef.current }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Markdown 转换失败');

      let markdownText = '';
      markdownText = await readSSEStream(response, () => {});

      setValidatedMarkdown(markdownText);
      latestMarkdownRef.current = markdownText;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : '反向转换失败';
      setErrorMsg(message);
    } finally {
      setIsReverseConverting(false);
      isReverseConvertingRef.current = false;
      setHasUnsavedChanges(true);

      if (pendingReverseConversionRef.current) {
        pendingReverseConversionRef.current = false;
        reverseConvertMarkdown();
      }
    }
  }, []);

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
    if (step !== 'done' && step !== 'error') {
      setHasUnsavedChanges(true);
      return;
    }

    // Immediately disable save button when debounce starts
    setIsRegenerating(true);
    isRegeneratingRef.current = true;

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
    if (step !== 'done' && step !== 'error') {
      setHasUnsavedChanges(true);
      return;
    }

    // Immediately disable save button when debounce starts
    setIsReverseConverting(true);
    isReverseConvertingRef.current = true;

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

  // Handle selecting a history item
  const handleSelectHistory = useCallback((item: ConversionHistoryItem) => {
    setStep("done");
    setValidatedMarkdown(item.markdown_content);
    setLatexCode(item.latex_content);
    setCurrentHistoryId(item.id);
    setHistorySaved(true);
    setErrorMsg("");
    setUploadedFiles([]);
    setPreviewUrl(null);
    setHasUnsavedChanges(false);
    // Update last saved content to prevent unnecessary auto-save
    lastSavedContentRef.current = { markdown: item.markdown_content, latex: item.latex_content };
  }, []);

  // Handle manual save to history
  const handleSave = useCallback(async () => {
    if (!user || !hasUnsavedChanges) return;

    const token = await getToken();
    if (!token) {
      console.error('[History] No auth token available');
      return;
    }

    setIsSaving(true);

    try {
      if (currentHistoryId) {
        // Update existing history
        const response = await fetch(`/api/history?id=${currentHistoryId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            markdown_content: validatedMarkdown,
            latex_content: latexCode,
          }),
        });

        if (response.ok) {
          setHasUnsavedChanges(false);
          setHistoryRefreshKey(prev => prev + 1);
          lastSavedContentRef.current = { markdown: validatedMarkdown, latex: latexCode };
        }
      } else {
        // Create new history
        const response = await fetch('/api/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: `转换记录 ${new Date().toLocaleString('zh-CN')}`,
            markdown_content: validatedMarkdown,
            latex_content: latexCode,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentHistoryId(data.history?.id || null);
          setHistorySaved(true);
          setHasUnsavedChanges(false);
          setHistoryRefreshKey(prev => prev + 1);
          lastSavedContentRef.current = { markdown: validatedMarkdown, latex: latexCode };
        }
      }
    } catch (error) {
      console.warn('[History] Save skipped:', error instanceof Error ? error.message : error);
    } finally {
      setIsSaving(false);
    }
  }, [user, hasUnsavedChanges, currentHistoryId, validatedMarkdown, latexCode, getToken]);

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
            {isProcessing && (
              <button
                onClick={handleAbort}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
                终止
              </button>
            )}
            {step !== "idle" && !isProcessing && (
              <button
                onClick={resetState}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新建转换任务
              </button>
            )}
            {user ? (
              <UserMenu
                onOpenSettings={() => setShowProfileSettings(true)}
                onOpenApiConfig={() => setShowApiConfig(true)}
              />
            ) : (
              <button
                onClick={() => setShowAuthDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#B8956A] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#A37D5A]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                登录
              </button>
            )}
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              帮助
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {authLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8956A]" />
          </div>
        ) : !user ? (
          /* Auth Required */
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-serif font-bold tracking-tight">
                手写笔记转 LaTeX
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                上传手写笔记（图片或 PDF 格式），AI 识别校验并转换为可出版的 LaTeX 代码。
              </p>
            </div>
            <div className="w-full max-w-sm">
              <AuthForm onSuccess={() => setShowAuthDialog(false)} />
            </div>
          </div>
        ) : step === "idle" ? (
          /* Upload State */
          <div className="flex gap-6">
            {user && (
              <HistorySidebar 
                onSelectHistory={handleSelectHistory}
                refreshKey={historyRefreshKey}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            )}
            <div className="flex-1 mx-auto max-w-xl">
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

              <FileUpload
                onFilesSelect={handleFilesSelect}
                onStartConvert={handleStartConvert}
                isProcessing={isProcessing}
                uploadedFiles={uploadedFiles}
                onRemoveFile={handleRemoveFile}
                onClearFiles={handleClearFiles}
              />

              {/* Decorative math symbols */}
              <div className="mt-8 flex items-center justify-center gap-6 text-muted-foreground/30 text-xs font-mono select-none">
                <span>&int; f(x)dx</span>
                <span>&sum; a_n x^n</span>
                <span>&nabla;&times;F</span>
                <span>&part;u/&part;t</span>
              </div>
            </div>
          </div>
        ) : (
          /* Processing / Results State */
          <div className="flex gap-6">
            <HistorySidebar 
              onSelectHistory={handleSelectHistory} 
              selectedId={currentHistoryId || undefined}
              refreshKey={historyRefreshKey}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left panel: Upload preview + Pipeline */}
              <div className="lg:col-span-4 space-y-4">
                {/* File preview */}
                {uploadedFiles.length > 0 && (
                  <div className="border border-border rounded-lg bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">
                        Source
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {uploadedFiles.length === 1 ? uploadedFiles[0].name : `${uploadedFiles.length} files`}
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
                    onSave={user ? handleSave : undefined}
                    isSaving={isSaving}
                    hasUnsavedChanges={hasUnsavedChanges}
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
          </div>
        )}
      </main>

      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
      />

      {/* API Config Dialog */}
      <ApiConfigDialog
        isOpen={showApiConfig}
        onClose={() => setShowApiConfig(false)}
      />

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>登录 NoteToLaTeX</DialogTitle>
            <DialogDescription>
              登录后可保存和查看历史转换记录
            </DialogDescription>
          </DialogHeader>
          <AuthForm onSuccess={() => setShowAuthDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
