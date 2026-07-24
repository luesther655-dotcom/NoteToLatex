"use client";

import { useCallback, useState, type DragEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { X, FileImage, FileText, Upload, Camera, PenTool } from "lucide-react";
import { CameraCapture } from "@/components/camera-capture";
import { WritingPad } from "@/components/writing-pad";
import { getPdfPageCount } from "@/lib/pdf-utils";
import { toast } from "sonner";

const MAX_TOTAL_SIZE_MB = 30;
const MAX_TOTAL_PAGES = 200;

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  onStartConvert: () => void;
  isProcessing: boolean;
  uploadedFiles: File[];
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
}

const VALID_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
];

export function FileUpload({
  onFilesSelect,
  onStartConvert,
  isProcessing,
  uploadedFiles,
  onRemoveFile,
  onClearFiles,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showWritingPad, setShowWritingPad] = useState(false);

  const validateAndAddFiles = useCallback(
    async (files: FileList | File[]) => {
      const newFiles = Array.from(files);

      // Check total size
      const existingSize = uploadedFiles.reduce((s, f) => s + f.size, 0);
      const newSize = newFiles.reduce((s, f) => s + f.size, 0);
      const totalSizeMB = (existingSize + newSize) / (1024 * 1024);
      if (totalSizeMB > MAX_TOTAL_SIZE_MB) {
        toast.error(`文件总大小超过限制（最大 ${MAX_TOTAL_SIZE_MB}MB），当前约 ${totalSizeMB.toFixed(1)}MB`);
        return;
      }

      // Filter valid types
      const validFiles = newFiles.filter((f) =>
        VALID_TYPES.includes(f.type)
      );
      if (validFiles.length === 0) {
        toast.error("不支持的文件格式，请上传 PNG、JPG、WebP 或 PDF 文件");
        return;
      }

      // Count pages: images = 1 page each, PDFs = parse actual pages
      let existingPages = 0;
      for (const f of uploadedFiles) {
        if (f.type === "application/pdf") {
          existingPages += await getPdfPageCount(f).catch(() => 1);
        } else {
          existingPages += 1;
        }
      }

      let newPages = 0;
      for (const f of validFiles) {
        if (f.type === "application/pdf") {
          newPages += await getPdfPageCount(f).catch(() => 1);
        } else {
          newPages += 1;
        }
      }

      const totalPages = existingPages + newPages;
      if (totalPages > MAX_TOTAL_PAGES) {
        toast.error(`总页数超过限制（最大 ${MAX_TOTAL_PAGES} 页），当前约 ${totalPages} 页`);
        return;
      }

      if (validFiles.length > 0) {
        onFilesSelect(validFiles);
      }
    },
    [onFilesSelect, uploadedFiles]
  );

  const handleCameraCapture = useCallback(
    (file: File) => {
      onFilesSelect([file]);
      setShowCamera(false);
    },
    [onFilesSelect]
  );

  const handleWritingPadSubmit = useCallback(
    (file: File) => {
      onFilesSelect([file]);
      setShowWritingPad(false);
    },
    [onFilesSelect]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isProcessing) setIsDragging(true);
    },
    [isProcessing]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isProcessing) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        validateAndAddFiles(files);
      }
    },
    [isProcessing, validateAndAddFiles]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (isProcessing) return;
      const files = e.target.files;
      if (files && files.length > 0) {
        validateAndAddFiles(files);
      }
      e.target.value = "";
    },
    [isProcessing, validateAndAddFiles]
  );

  const hasFiles = uploadedFiles.length > 0;

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {/* 上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed
          transition-all duration-200 ease-out
          ${
            isDragging
              ? "border-[#B8956A] bg-[#B8956A]/5 scale-[1.01]"
              : "border-border hover:border-muted-foreground/50"
          }
          ${isProcessing ? "opacity-50 pointer-events-none" : "cursor-pointer"}
          min-h-[200px] p-8
        `}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
            <Upload className="h-7 w-7 text-muted-foreground" />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "松开即可上传" : "上传手写笔记"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              拖拽文件到此处或点击选择
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              支持 PNG、JPG、WebP、PDF 格式，可同时上传多个文件
            </p>
          </div>
        </div>
      </div>

      {/* 其他输入方式 */}
      {!hasFiles && !isProcessing && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">或</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {!hasFiles && !isProcessing && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => setShowCamera(true)}
            className="h-20 flex flex-col gap-2 border-dashed hover:border-[#B8956A] hover:bg-[#B8956A]/5"
          >
            <Camera className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">拍照输入</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowWritingPad(true)}
            className="h-20 flex flex-col gap-2 border-dashed hover:border-[#B8956A] hover:bg-[#B8956A]/5"
          >
            <PenTool className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">手写板输入</span>
          </Button>
        </div>
      )}

      {/* 已选文件列表 */}
      {hasFiles && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground">
              已选择 {uploadedFiles.length} 个文件
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFiles}
              disabled={isProcessing}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              清空全部
            </Button>
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-md bg-muted/50 p-2"
              >
                {file.type === "application/pdf" ? (
                  <FileText className="h-5 w-5 text-red-500 shrink-0" />
                ) : (
                  <FileImage className="h-5 w-5 text-blue-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onRemoveFile(index)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 开始转换按钮 */}
      {hasFiles && (
        <Button
          onClick={onStartConvert}
          disabled={isProcessing}
          className="w-full h-12 text-base font-medium bg-[#B8956A] hover:bg-[#A07D5A] text-white"
        >
          {isProcessing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              转换中...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              开始转换
            </>
          )}
        </Button>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Writing Pad Modal */}
      {showWritingPad && (
        <WritingPad
          onSubmit={handleWritingPadSubmit}
          onClose={() => setShowWritingPad(false)}
        />
      )}
    </div>
  );
}
