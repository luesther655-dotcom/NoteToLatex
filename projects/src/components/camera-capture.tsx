"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check, FlipHorizontal2 } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Camera error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "无法访问摄像头，请确保已授予摄像头权限"
      );
      setIsLoading(false);
    }
  }, [facingMode, stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame
    context.drawImage(video, 0, 0);

    // Get the image as data URL
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    // Convert data URL to File
    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-capture-${Date.now()}.png`, {
          type: "image/png",
        });
        onCapture(file);
      },
      "image/png",
      0.95
    );
  }, [capturedImage, onCapture]);

  const handleFlip = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  // Flip camera when facingMode changes
  useEffect(() => {
    if (facingMode) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-card rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">拍照输入</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="relative aspect-video bg-black">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Camera className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={startCamera}>
                重试
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "scale-x-[-1]" : ""
                }`}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        {!error && (
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/30">
            {capturedImage ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleRetake}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  重拍
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="gap-2 bg-[#B8956A] hover:bg-[#A07D5A] text-white"
                >
                  <Check className="h-4 w-4" />
                  使用照片
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFlip}
                  className="h-10 w-10"
                >
                  <FlipHorizontal2 className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleCapture}
                  className="h-14 w-14 rounded-full bg-[#B8956A] hover:bg-[#A07D5A] text-white p-0"
                >
                  <Camera className="h-6 w-6" />
                </Button>
                <div className="w-10" /> {/* Spacer for centering */}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
