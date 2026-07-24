"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Eraser, Pen, Undo2, Check, Trash2 } from "lucide-react";

interface WritingPadProps {
  onSubmit: (file: File) => void;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export function WritingPad({ onSubmit, onClose }: WritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [penColor, setPenColor] = useState("#000000");
  const [penWidth, setPenWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

  // Pen cursor SVG as data URL
  const penCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 2 22, auto`;
  const eraserCursor = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 10 10, auto`;

  // Resize canvas to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: Math.floor(rect.width),
          height: Math.floor(Math.min(rect.width * 0.6, 500)),
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Redraw canvas when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with white background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      if (stroke.color === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
      }
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    };

    strokes.forEach(drawStroke);

    // Draw current stroke
    if (currentStroke.length >= 2) {
      ctx.beginPath();
      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = penColor;
      }
      ctx.lineWidth = penWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }
    // Reset composite operation
    ctx.globalCompositeOperation = "source-over";
  }, [strokes, currentStroke, penColor, penWidth, canvasSize, isEraser]);

  const getPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      const point = getPoint(e);
      setCurrentStroke([point]);
    },
    [getPoint]
  );

  const handleMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const point = getPoint(e);
      setCurrentStroke((prev) => [...prev, point]);
    },
    [isDrawing, getPoint]
  );

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke.length >= 2) {
      setStrokes((prev) => [
        ...prev,
        { points: currentStroke, color: isEraser ? "eraser" : penColor, width: penWidth },
      ]);
    }
    setCurrentStroke([]);
  }, [isDrawing, currentStroke, penColor, penWidth, isEraser]);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
  }, []);

  const handleSubmit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `writing-pad-${Date.now()}.png`, {
          type: "image/png",
        });
        onSubmit(file);
      },
      "image/png",
      0.95
    );
  }, [onSubmit]);

  const hasContent = strokes.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-card rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">手写板输入</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative bg-white border-b border-border"
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full touch-none"
            style={{ cursor: isEraser ? eraserCursor : penCursor }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
          {!hasContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-muted-foreground/50">
                在此处书写内容
              </p>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 bg-muted/30 gap-4 flex-wrap">
          {/* Pen settings */}
          <div className="flex items-center gap-3">
            {/* Pen/Eraser toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={isEraser ? "ghost" : "secondary"}
                size="sm"
                onClick={() => setIsEraser(false)}
                className="h-8 px-3 gap-1.5"
              >
                <Pen className="h-4 w-4" />
                画笔
              </Button>
              <Button
                variant={isEraser ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setIsEraser(true)}
                className="h-8 px-3 gap-1.5"
              >
                <Eraser className="h-4 w-4" />
                橡皮擦
              </Button>
            </div>
            {/* Color picker - disabled when eraser is active */}
            <div className="flex items-center gap-2 opacity-100 transition-opacity" style={{ opacity: isEraser ? 0.4 : 1 }}>
              <input
                type="color"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                disabled={isEraser}
                className="h-8 w-8 rounded cursor-pointer border border-border disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">粗细</span>
              <input
                type="range"
                min="1"
                max="20"
                value={penWidth}
                onChange={(e) => setPenWidth(Number(e.target.value))}
                className="w-20 h-2 accent-[#B8956A]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={!hasContent}
              className="gap-1.5"
            >
              <Undo2 className="h-4 w-4" />
              撤销
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!hasContent}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              清空
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!hasContent}
              className="gap-1.5 bg-[#B8956A] hover:bg-[#A07D5A] text-white"
            >
              <Check className="h-4 w-4" />
              提交
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
