"use client";

import { useCallback, useState, type DragEvent, type ChangeEvent } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export function FileUpload({ onFileSelect, isProcessing }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

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
        const file = files[0];
        const validTypes = [
          "image/png",
          "image/jpeg",
          "image/jpg",
          "image/webp",
          "application/pdf",
        ];
        if (validTypes.includes(file.type)) {
          onFileSelect(file);
        }
      }
    },
    [isProcessing, onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (isProcessing) return;
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
      e.target.value = "";
    },
    [isProcessing, onFileSelect]
  );

  return (
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
        min-h-[240px] p-8
      `}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        onChange={handleFileChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
        disabled={isProcessing}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "松开即可上传" : "上传手写笔记"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            拖拽文件到此处或点击选择
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            支持 PNG、JPG、WebP、PDF 格式
          </p>
        </div>
      </div>
    </div>
  );
}
