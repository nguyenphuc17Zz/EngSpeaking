"use client";

import { cn } from "@/lib/utils";

interface WaveformProps {
  active: boolean;
  bars?: number;
  className?: string;
  variant?: "emerald" | "primary" | "amber";
}

export function Waveform({ active, bars = 16, className, variant = "primary" }: WaveformProps) {
  if (!active) return null;

  const colorClasses = {
    primary: "bg-primary",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 h-10 px-4 py-2 rounded-full bg-card/70 border border-border/60 backdrop-blur-md shadow-xs",
        className
      )}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => {
        const baseHeight = 8 + (Math.sin(i * 0.5) + 1) * 8;
        return (
          <span
            key={i}
            className={cn(
              "w-1 rounded-full transition-all duration-150 animate-pulse",
              colorClasses[variant]
            )}
            style={{
              height: `${baseHeight}px`,
              animationDelay: `${(i % 5) * 120}ms`,
              animationDuration: `${400 + ((i * 70) % 500)}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
