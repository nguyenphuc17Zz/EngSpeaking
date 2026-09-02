"use client";

import { Gauge, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LiveFeedbackBadgeProps {
  ttfwMs?: number;
  wpm?: number;
  fillersCount?: number;
  className?: string;
}

export function LiveFeedbackBadge({
  ttfwMs,
  wpm,
  fillersCount,
  className,
}: LiveFeedbackBadgeProps) {
  if (ttfwMs === undefined && wpm === undefined && fillersCount === undefined) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 p-2 rounded-xl bg-card/80 border border-border/60 shadow-xs backdrop-blur-sm text-xs",
        className
      )}
    >
      {/* Response Speed / TTFW */}
      {ttfwMs !== undefined && (
        <Badge
          variant="secondary"
          className={cn(
            "gap-1 font-mono text-[11px]",
            ttfwMs < 2000
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : ttfwMs < 3500
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
          )}
        >
          <Zap className="size-3" />
          <span>Phản xạ: {(ttfwMs / 1000).toFixed(1)}s</span>
        </Badge>
      )}

      {/* Speaking Speed / WPM */}
      {wpm !== undefined && wpm > 0 && (
        <Badge
          variant="secondary"
          className={cn(
            "gap-1 font-mono text-[11px]",
            wpm >= 110 && wpm <= 160
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
          )}
        >
          <Gauge className="size-3" />
          <span>Tốc độ: {Math.round(wpm)} wpm</span>
        </Badge>
      )}

      {/* Fillers detection */}
      {fillersCount !== undefined && (
        <Badge
          variant="secondary"
          className={cn(
            "gap-1 font-mono text-[11px]",
            fillersCount === 0
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          )}
        >
          {fillersCount === 0 ? (
            <>
              <CheckCircle2 className="size-3" />
              <span>0 từ chêm (ừm, à)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="size-3" />
              <span>{fillersCount} từ chêm</span>
            </>
          )}
        </Badge>
      )}
    </div>
  );
}
