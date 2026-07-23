"use client";

type PipelineStep = "idle" | "uploading" | "ocr" | "validating" | "converting" | "done" | "error";

interface ProcessingPipelineProps {
  currentStep: PipelineStep;
  ocrProgress: string;
  validateProgress: string;
  latexProgress: string;
}

const steps: { key: PipelineStep; label: string; description: string }[] = [
  { key: "uploading", label: "上传文件", description: "正在发送文件..." },
  { key: "ocr", label: "OCR 识别", description: "正在读取手写内容..." },
  { key: "validating", label: "校验修正", description: "正在检查准确性..." },
  { key: "converting", label: "LaTeX 转换", description: "正在生成 LaTeX 代码..." },
];

const stepOrder: PipelineStep[] = ["uploading", "ocr", "validating", "converting", "done"];

export function ProcessingPipeline({
  currentStep,
  ocrProgress,
  validateProgress,
  latexProgress,
}: ProcessingPipelineProps) {
  const currentIndex = stepOrder.indexOf(currentStep);
  const isError = currentStep === "error";

  const getProgress = (stepKey: PipelineStep): string => {
    switch (stepKey) {
      case "ocr":
        return ocrProgress;
      case "validating":
        return validateProgress;
      case "converting":
        return latexProgress;
      default:
        return "";
    }
  };

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const stepIndex = stepOrder.indexOf(step.key);
        const isActive = currentStep === step.key;
        const isCompleted = currentIndex > stepIndex || currentStep === "done";
        const progress = getProgress(step.key);

        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300
                  ${isCompleted ? "border-[#B8956A] bg-[#B8956A] text-white" : ""}
                  ${isActive && !isError ? "border-[#B8956A] bg-[#B8956A]/10 text-[#B8956A]" : ""}
                  ${!isActive && !isCompleted && !isError ? "border-border text-muted-foreground" : ""}
                  ${isError && isActive ? "border-red-500 bg-red-500/10 text-red-500" : ""}
                `}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive && isError ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : isActive ? (
                  <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`
                    h-6 w-0.5 mt-1 transition-colors duration-300
                    ${isCompleted ? "bg-[#B8956A]" : "bg-border"}
                  `}
                />
              )}
            </div>

            <div className="flex-1 pt-0.5">
              <p
                className={`text-sm font-medium transition-colors ${
                  isCompleted
                    ? "text-foreground"
                    : isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {isActive && progress && (
                <p className="mt-0.5 text-xs text-muted-foreground font-mono leading-relaxed line-clamp-3">
                  {progress}
                </p>
              )}
              {isActive && !progress && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
