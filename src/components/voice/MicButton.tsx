"use client";

import { Mic, Square, Loader2 } from "lucide-react";
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
    <div className="flex flex-col items-center gap-2.5 select-none">
      <div className="relative flex items-center justify-center">
        {/* Industrial Pulsing Frame for Recording */}
        {isRecording && (
          <span
            className="absolute -inset-2.5 border-2 border-primary animate-pulse pointer-events-none"
            aria-hidden
          />
        )}

        <button
          type="button"
          aria-label={isRecording ? "Dừng ghi âm" : "Bắt đầu nói"}
          aria-pressed={isRecording}
          disabled={disabled || isProcessing}
          onClick={isRecording ? onStop : onStart}
          className={cn(
            "relative inline-flex items-center justify-center rounded-none border-2 border-border shadow-[4px_4px_0px_var(--industrial-shadow-color)] transition-all duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
            sizeClasses,
            isRecording
              ? "bg-primary text-primary-foreground scale-105"
              : isProcessing
              ? "bg-secondary text-muted-foreground"
              : "bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground hover:-translate-x-[1px] hover:-translate-y-[1px]"
          )}
        >
          {/* Top-left hardware index tag */}
          <span className="absolute top-1 left-1.5 text-[8px] font-mono font-extrabold uppercase tracking-tighter">
            {isRecording ? "REC" : isProcessing ? "BSY" : "MIC"}
          </span>

          {/* Top-right LED indicator */}
          <span
            className={cn(
              "absolute top-1.5 right-1.5 size-2 border border-border",
              isRecording
                ? "bg-[#D2FF00] animate-ping"
                : isProcessing
                ? "bg-amber-400 animate-pulse"
                : "bg-[#00E676]"
            )}
          />

          {isProcessing ? (
            <Loader2 className={cn(iconSizes, "animate-spin stroke-[2.5]")} />
          ) : isRecording ? (
            <Square className={cn(iconSizes, "fill-current")} />
          ) : (
            <Mic className={cn(iconSizes, "stroke-[2.5]")} />
          )}
        </button>
      </div>

      {/* Label and LED Timer */}
      <div className="flex flex-col items-center text-center gap-1">
        <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground">
          {label ||
            (isRecording
              ? "ĐANG THU ÂM [SPACE ĐỂ DỪNG]"
              : isProcessing
              ? "ĐANG XỬ LÝ TÍN HIỆU..."
              : "NHẤN MIC HOẶC [SPACE] ĐỂ NÓI")}
        </span>
        {isRecording && durationMs !== undefined && (
          <span className="px-2 py-0.5 bg-foreground text-accent border border-border text-xs font-mono font-extrabold tracking-widest">
            ● {formatTime(durationMs)}
          </span>
        )}
      </div>
    </div>
  );
}
