"use client";

import { cn } from "@/lib/utils";
import { Mic, Volume2, AlertCircle, Loader2, Compass } from "lucide-react";

export type VoiceOrbStatus =
  | "idle"
  | "ready"
  | "starting"
  | "listening"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "completed"
  | "error";

interface VoiceOrbProps {
  status: VoiceOrbStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  helperText?: string;
}

export function VoiceOrb({
  status,
  size = "md",
  className,
  onClick,
  helperText,
}: VoiceOrbProps) {
  const sizeClasses = {
    sm: "size-20",
    md: "size-36",
    lg: "size-44",
  };

  const iconSizes = {
    sm: "size-6",
    md: "size-9",
    lg: "size-12",
  };

  const getStatusConfig = () => {
    switch (status) {
      case "listening":
      case "recording":
        return {
          bg: "bg-card border-2 border-chart-2 text-chart-2",
          shadow: "paper-shadow",
          ring: "ring-6 ring-chart-2/15",
          waveColor: "border-chart-2/30",
          icon: Mic,
          title: "Đang lắng nghe...",
          subtitle: "Hãy tự tin nói tự nhiên theo ý bạn",
          statusColor: "text-chart-2",
        };
      case "thinking":
      case "transcribing":
      case "starting":
        return {
          bg: "bg-card border-2 border-amber-600/70 text-amber-700 dark:text-amber-400",
          shadow: "paper-shadow",
          ring: "ring-6 ring-amber-500/15",
          waveColor: "border-amber-500/30",
          icon: Loader2,
          title: "Gia sư đang lắng nghe & suy ngẫm...",
          subtitle: "Đang phân tích phản xạ và ý tứ câu nói",
          statusColor: "text-amber-700 dark:text-amber-400",
        };
      case "speaking":
        return {
          bg: "bg-primary border-2 border-primary text-primary-foreground",
          shadow: "shadow-md shadow-primary/25",
          ring: "ring-6 ring-primary/20",
          waveColor: "border-primary/40",
          icon: Volume2,
          title: "AI đang nói...",
          subtitle: "Lắng nghe ngữ điệu và nhịp ngắt câu",
          statusColor: "text-primary",
        };
      case "error":
        return {
          bg: "bg-card border-2 border-destructive text-destructive",
          shadow: "paper-shadow",
          ring: "ring-6 ring-destructive/15",
          waveColor: "border-destructive/30",
          icon: AlertCircle,
          title: "Đã xảy ra gián đoạn",
          subtitle: "Nhấn để thử kết nối lại micro",
          statusColor: "text-destructive",
        };
      default:
        return {
          bg: "bg-card border-2 border-border/90 text-foreground/80 hover:border-primary hover:text-primary",
          shadow: "paper-shadow-sm hover:paper-shadow",
          ring: "ring-4 ring-border/40",
          waveColor: "border-border/40",
          icon: Mic,
          title: "Sẵn sàng luyện nói",
          subtitle: "Nhấn vào micro để cất lời",
          statusColor: "text-muted-foreground",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const isInteracting = status === "listening" || status === "recording" || status === "speaking";

  return (
    <div className={cn("flex flex-col items-center justify-center gap-5", className)}>
      <div className="relative flex items-center justify-center">
        {/* Organic Acoustic Soundwave Ripple */}
        {isInteracting && (
          <>
            <div
              className={cn(
                "absolute inset-0 rounded-full border animate-acoustic-wave pointer-events-none",
                config.waveColor
              )}
              style={{ margin: "-18px" }}
            />
            <div
              className={cn(
                "absolute inset-0 rounded-full border animate-acoustic-wave pointer-events-none",
                config.waveColor
              )}
              style={{ margin: "-34px", animationDelay: "0.8s" }}
            />
          </>
        )}

        {/* Central Acoustic Breathing Circle */}
        <div
          onClick={onClick}
          className={cn(
            "relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer select-none",
            sizeClasses[size],
            config.bg,
            config.shadow,
            config.ring,
            isInteracting && "animate-acoustic-breathe",
            onClick && "btn-spring"
          )}
        >
          {/* Gentle tactile inner ring */}
          <div className="absolute inset-1.5 rounded-full border border-current/10 pointer-events-none" />

          {/* Center Icon */}
          <Icon
            className={cn(
              "relative z-10 transition-transform drop-shadow-2xs",
              iconSizes[size],
              (status === "thinking" || status === "transcribing" || status === "starting") &&
                "animate-spin"
            )}
          />
        </div>
      </div>

      {/* Living Audio Equalizer Bars */}
      {isInteracting && (
        <div className="flex items-center justify-center gap-1.5 h-6 -my-2" aria-label="Sóng âm thanh giọng nói">
          <span className={cn("w-1 rounded-full bg-current animate-eq-1", config.statusColor)} />
          <span className={cn("w-1.5 rounded-full bg-current animate-eq-2", config.statusColor)} />
          <span className={cn("w-1.5 rounded-full bg-current animate-eq-3", config.statusColor)} />
          <span className={cn("w-1.5 rounded-full bg-current animate-eq-4", config.statusColor)} />
          <span className={cn("w-1 rounded-full bg-current animate-eq-5", config.statusColor)} />
        </div>
      )}

      {/* Editorial Status & Helper Subtitle */}
      <div className="flex flex-col items-center text-center gap-1 max-w-sm px-4">
        <h3 className="text-base md:text-lg font-serif font-bold tracking-tight text-foreground transition-colors">
          {helperText || config.title}
        </h3>
        <p className="text-xs text-muted-foreground font-sans leading-relaxed">
          {config.subtitle}
        </p>
      </div>
    </div>
  );
}
