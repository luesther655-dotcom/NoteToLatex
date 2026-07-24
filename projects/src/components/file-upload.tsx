"use client";

import { useCallback, useState, type DragEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { X, FileImage, FileText, Upload } from "lucide-react";

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

  const validateAndAddFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter((f) =>
        VALID_TYPES.includes(f.type)
      );
      if (validFiles.length > 0) {
        onFilesSelect(validFiles);
      }
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
    </div>
  );
}
