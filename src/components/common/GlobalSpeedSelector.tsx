"use client";

import { useState, useRef, useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";
import { Gauge, Check, Turtle, Rabbit, Zap, Volume2 } from "lucide-react";

interface SpeedOption {
  value: number;
  label: string;
  subLabel: string;
  icon: typeof Turtle;
}

export const SPEED_OPTIONS: SpeedOption[] = [
  {
    value: 0.6,
    label: "0.6x",
    subLabel: "Rất chậm",
    icon: Turtle,
  },
  {
    value: 0.75,
    label: "0.75x",
    subLabel: "Chậm",
    icon: Turtle,
  },
  {
    value: 0.9,
    label: "0.9x",
    subLabel: "Hơi chậm",
    icon: Volume2,
  },
  {
    value: 1.0,
    label: "1.0x",
    subLabel: "Chuẩn bản xứ",
    icon: Zap,
  },
  {
    value: 1.25,
    label: "1.25x",
    subLabel: "Nhanh",
    icon: Rabbit,
  },
];

export function stepTtsSpeed(currentSpeed: number, direction: "up" | "down"): SpeedOption {
  let currentIndex = SPEED_OPTIONS.findIndex((opt) => opt.value === currentSpeed);
  if (currentIndex === -1) {
    let closestIdx = 0;
    let minDiff = Infinity;
    SPEED_OPTIONS.forEach((opt, idx) => {
      const diff = Math.abs(opt.value - currentSpeed);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    currentIndex = closestIdx;
  }

  if (direction === "up") {
    const nextIdx = Math.min(currentIndex + 1, SPEED_OPTIONS.length - 1);
    return SPEED_OPTIONS[nextIdx];
  } else {
    const nextIdx = Math.max(currentIndex - 1, 0);
    return SPEED_OPTIONS[nextIdx];
  }
}

interface Props {
  className?: string;
}

export function GlobalSpeedSelector({ className = "" }: Props) {
  const ttsSpeed = useSettingsStore((s) => s.ttsSpeed ?? 1.0);
  const setTtsSpeed = useSettingsStore((s) => s.setTtsSpeed);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcuts: + / = to speed up, - / _ to slow down
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Avoid conflict with browser zoom (Ctrl + / Ctrl -)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const isPlus = e.key === "+" || e.key === "=" || e.code === "NumpadAdd";
      const isMinus = e.key === "-" || e.key === "_" || e.code === "NumpadSubtract";

      if (!isPlus && !isMinus) return;

      e.preventDefault();

      const current = useSettingsStore.getState().ttsSpeed ?? 1.0;
      if (isPlus) {
        const nextOption = stepTtsSpeed(current, "up");
        if (nextOption.value !== current) {
          setTtsSpeed(nextOption.value);
        }
      } else if (isMinus) {
        const nextOption = stepTtsSpeed(current, "down");
        if (nextOption.value !== current) {
          setTtsSpeed(nextOption.value);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [setTtsSpeed]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelectSpeed = (speed: number) => {
    setTtsSpeed(speed);
    setOpen(false);
  };

  const isNonDefault = ttsSpeed !== 1.0;

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`rounded-full h-9 px-3 gap-1.5 font-medium transition-all shadow-2xs btn-spring cursor-pointer ${
          isNonDefault
            ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            : "border-border/70 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
        } ${className}`}
        title={`Tốc độ phát âm toàn hệ thống: ${ttsSpeed}x (Phím tắt: + tăng tốc / - giảm tốc)`}
        aria-label={`Tốc độ phát âm toàn hệ thống: ${ttsSpeed}x`}
        aria-expanded={open}
      >
        <Gauge className={`size-3.5 ${isNonDefault ? "text-amber-500" : "text-primary"}`} />
        <span className="font-mono text-xs font-bold">{ttsSpeed}x</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-xl p-1.5 z-50 animate-in fade-in-0 zoom-in-95 origin-top-right">
          {/* Header Row */}
          <div className="px-2 py-1 flex items-center justify-between border-b border-border/50 pb-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Gauge className="size-3 text-primary" />
              <span>Tốc độ phát âm</span>
            </span>
            <span className="text-[10px] font-mono text-primary font-bold">
              {ttsSpeed}x
            </span>
          </div>

          {/* Options List */}
          <div className="space-y-0.5">
            {SPEED_OPTIONS.map((opt) => {
              const isSelected = ttsSpeed === opt.value;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectSpeed(opt.value)}
                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer text-left ${
                    isSelected
                      ? "bg-primary/15 text-primary font-bold"
                      : "hover:bg-muted/70 text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`size-3.5 shrink-0 ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="font-mono font-bold text-xs">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      · {opt.subLabel}
                    </span>
                  </div>

                  {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Shortcut Quick Tip Footer */}
          <div className="mt-1.5 px-2.5 py-1 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Phím tắt nhanh</span>
            <div className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[9px] font-bold text-foreground">
                +
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/60 text-[9px] font-bold text-foreground">
                -
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
