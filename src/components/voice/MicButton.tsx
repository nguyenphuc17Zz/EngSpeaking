"use client";

import { Mic, Square, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  status: "idle" | "requesting" | "recording" | "paused" | "processing";
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  durationMs?: number;
  label?: string;
  size?: "md" | "lg";
}

export function MicButton({
  status,
  onStart,
  onStop,
  disabled,
  durationMs,
  label,
  size = "lg",
}: MicButtonProps) {
  const isRecording = status === "recording";
  const isProcessing = status === "processing" || status === "requesting";

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const sizeClasses = size === "lg" ? "size-20" : "size-16";
  const iconSizes = size === "lg" ? "size-8" : "size-6";

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative flex items-center justify-center">
        {/* Animated Ripple for Recording */}
        {isRecording && (
          <>
            <span
              className="absolute inset-0 rounded-full border-2 border-emerald-500/60 animate-ping"
              style={{ animationDuration: "2s" }}
              aria-hidden
            />
            <span
              className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse"
              style={{ margin: "-8px" }}
              aria-hidden
            />
          </>
        )}

        <button
          type="button"
          aria-label={isRecording ? "Dừng ghi âm" : "Bắt đầu nói"}
          aria-pressed={isRecording}
          disabled={disabled || isProcessing}
          onClick={isRecording ? onStop : onStart}
          className={cn(
            "relative inline-flex items-center justify-center rounded-full shadow-lg transition-all duration-300 transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed",
            sizeClasses,
            isRecording
              ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/40 shadow-xl"
              : isProcessing
              ? "bg-muted text-muted-foreground"
              : "bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-primary/30 hover:scale-105 hover:shadow-primary/50"
          )}
        >
          {isProcessing ? (
            <Loader2 className={cn(iconSizes, "animate-spin")} />
          ) : isRecording ? (
            <Square className={cn(iconSizes, "fill-white text-white")} />
          ) : (
            <Mic className={cn(iconSizes, "text-white")} />
          )}
        </button>
      </div>

      {/* Label and Timer */}
      <div className="flex flex-col items-center text-center">
        <span className="text-xs font-semibold tracking-wide text-foreground">
          {label ||
            (isRecording
              ? "Đang ghi âm (Nhấn để dừng)"
              : isProcessing
              ? "Đang xử lý..."
              : "Nhấn để nói tiếng Anh")}
        </span>
        {isRecording && durationMs !== undefined && (
          <span className="text-xs font-mono font-bold text-emerald-500 mt-0.5">
            {formatTime(durationMs)}
          </span>
        )}
      </div>
    </div>
  );
}
