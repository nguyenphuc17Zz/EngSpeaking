"use client";

import { cn } from "@/lib/utils";
import { Mic, Volume2, Sparkles, AlertCircle, Loader2 } from "lucide-react";

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
    lg: "size-48",
  };

  const iconSizes = {
    sm: "size-6",
    md: "size-10",
    lg: "size-14",
  };

  const getStatusConfig = () => {
    switch (status) {
      case "listening":
      case "recording":
        return {
          glow: "from-emerald-500/80 via-teal-500/60 to-cyan-500/80 animate-orb-listening",
          shadow: "shadow-emerald-500/40",
          icon: Mic,
          text: "Đang lắng nghe...",
          textColor: "text-emerald-500 font-semibold",
          ringColor: "border-emerald-500/40 animate-ping",
        };
      case "thinking":
      case "transcribing":
      case "starting":
        return {
          glow: "from-amber-500/80 via-indigo-500/70 to-purple-600/80 animate-orb-thinking",
          shadow: "shadow-indigo-500/40",
          icon: Loader2,
          text: "AI đang suy nghĩ...",
          textColor: "text-amber-500 font-semibold",
          ringColor: "border-amber-500/30 animate-spin",
        };
      case "speaking":
        return {
          glow: "from-primary via-indigo-500/80 to-purple-500/80 animate-orb-glow",
          shadow: "shadow-primary/40",
          icon: Volume2,
          text: "AI đang nói...",
          textColor: "text-primary font-semibold",
          ringColor: "border-primary/40 animate-pulse",
        };
      case "error":
        return {
          glow: "from-rose-500/80 via-red-500/60 to-pink-500/80",
          shadow: "shadow-rose-500/40",
          icon: AlertCircle,
          text: "Có lỗi xảy ra",
          textColor: "text-destructive font-semibold",
          ringColor: "border-destructive/30",
        };
      default:
        return {
          glow: "from-primary/70 via-indigo-600/50 to-primary/80 animate-orb-glow",
          shadow: "shadow-primary/25",
          icon: Sparkles,
          text: "Nhấn để nói",
          textColor: "text-muted-foreground",
          ringColor: "border-primary/20",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className="relative flex items-center justify-center">
        {/* Outer Ripple Wave Effect */}
        {(status === "listening" || status === "recording" || status === "speaking") && (
          <div
            className={cn(
              "absolute inset-0 rounded-full border-2 opacity-50",
              config.ringColor
            )}
            style={{ margin: "-16px" }}
          />
        )}

        {/* Second Outer Pulse */}
        {(status === "listening" || status === "recording") && (
          <div
            className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-30"
            style={{ margin: "-32px", animationDuration: "2.5s" }}
          />
        )}

        {/* Main Glowing Orb */}
        <div
          onClick={onClick}
          className={cn(
            "relative flex items-center justify-center rounded-full bg-gradient-to-tr transition-all duration-500 shadow-2xl cursor-pointer select-none",
            sizeClasses[size],
            config.glow,
            config.shadow,
            onClick && "hover:scale-105 active:scale-95"
          )}
        >
          {/* Inner ambient light overlay */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/30 via-transparent to-black/30 backdrop-blur-xs" />

          {/* Center Icon */}
          <Icon
            className={cn(
              "relative z-10 text-white drop-shadow-md transition-transform",
              iconSizes[size],
              status === "thinking" || status === "transcribing" || status === "starting"
                ? "animate-spin"
                : ""
            )}
          />
        </div>
      </div>

      {/* Status Text / Helper */}
      <div className="flex flex-col items-center text-center gap-0.5">
        <span className={cn("text-sm transition-colors", config.textColor)}>
          {helperText || config.text}
        </span>
      </div>
    </div>
  );
}
