"use client";

import { useEffect, useState } from "react";
import { useToastStore, type ToastItem, type ToastType } from "@/lib/toast";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Sparkles,
  X,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
  celebrate: Flame,
};

const STYLES: Record<
  ToastType,
  {
    border: string;
    bg: string;
    iconColor: string;
    progressColor: string;
    glow: string;
  }
> = {
  success: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
    iconColor: "text-emerald-500",
    progressColor: "bg-emerald-500",
    glow: "shadow-emerald-500/10",
  },
  error: {
    border: "border-destructive/30",
    bg: "bg-destructive/10 dark:bg-rose-950/40",
    iconColor: "text-destructive",
    progressColor: "bg-destructive",
    glow: "shadow-destructive/10",
  },
  info: {
    border: "border-primary/30",
    bg: "bg-primary/10 dark:bg-indigo-950/40",
    iconColor: "text-primary",
    progressColor: "bg-primary",
    glow: "shadow-primary/10",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/10 dark:bg-amber-950/40",
    iconColor: "text-amber-500",
    progressColor: "bg-amber-500",
    glow: "shadow-amber-500/10",
  },
  celebrate: {
    border: "border-orange-500/40",
    bg: "bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-primary/15",
    iconColor: "text-orange-500 animate-pulse",
    progressColor: "bg-gradient-to-r from-orange-500 to-amber-500",
    glow: "shadow-orange-500/20",
  },
};

function ToastMessage({ toast }: { toast: ToastItem }) {
  const { removeToast } = useToastStore();
  const [progress, setProgress] = useState(100);
  const duration = toast.durationMs ?? 4000;
  const style = STYLES[toast.type];
  const Icon = ICONS[toast.type];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        removeToast(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.id, duration, removeToast]);

  return (
    <div
      className={cn(
        "relative overflow-hidden w-full max-w-sm rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5",
        style.border,
        style.bg,
        style.glow
      )}
    >
      <div className="p-3.5 flex items-start gap-3">
        <div
          className={cn(
            "size-8 rounded-xl flex items-center justify-center shrink-0 bg-background/80 border border-border/40 shadow-xs",
            style.iconColor
          )}
        >
          <Icon className="size-4" />
        </div>

        <div className="flex-1 space-y-0.5 min-w-0">
          <h4 className="text-xs font-bold text-foreground truncate">{toast.title}</h4>
          {toast.description && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {toast.description}
            </p>
          )}

          {toast.action && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                toast.action?.onClick();
                removeToast(toast.id);
              }}
              className="mt-1.5 h-6 px-2.5 text-[10px] rounded-lg font-semibold"
            >
              {toast.action.label}
            </Button>
          )}
        </div>

        <button
          onClick={() => removeToast(toast.id)}
          className="size-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-center shrink-0 transition-colors"
          aria-label="Đóng thông báo"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Progress countdown bar */}
      <div className="h-0.5 w-full bg-border/40">
        <div
          className={cn("h-full transition-all duration-75", style.progressColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-auto max-w-sm w-full select-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} />
      ))}
    </div>
  );
}
