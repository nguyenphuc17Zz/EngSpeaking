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
    primary: "bg-[#FF5500]",
    emerald: "bg-[#00FF66]",
    amber: "bg-[#CCFF00]",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 h-10 px-3 py-1.5 rounded-none bg-[#121210] border-2 border-border shadow-[3px_3px_0px_var(--industrial-shadow-color)]",
        className
      )}
      aria-hidden
    >
      <span className="text-[9px] font-mono font-black text-[#CCFF00] mr-1.5 tracking-wider">
        dB
      </span>
      {Array.from({ length: bars }).map((_, i) => {
        const baseHeight = 8 + (Math.sin(i * 0.5) + 1) * 8;
        return (
          <span
            key={i}
            className={cn(
              "w-1.5 rounded-none transition-all duration-150 animate-pulse",
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
