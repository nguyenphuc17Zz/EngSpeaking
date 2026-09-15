"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Clock,
  RotateCcw,
  ArrowRight,
  TrendingDown,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Target,
} from "lucide-react";
import type { LatencySessionSummary } from "@/types/latency-training";
import { triggerConfetti } from "@/components/ui/confetti";
import { soundEffects } from "@/lib/audio/audio-chimes";

interface LatencySummaryModalProps {
  isOpen: boolean;
  summary: LatencySessionSummary | null;
  onRestart: () => void;
}

export function LatencySummaryModal({
  isOpen,
  summary,
  onRestart,
}: LatencySummaryModalProps) {
  useEffect(() => {
    if (isOpen && summary) {
      soundEffects.playSuccessFanfare();
      triggerConfetti();
    }
  }, [isOpen, summary]);

  if (!summary) return null;

  const q = summary.quadrantDistribution;
  const total = Math.max(1, summary.totalPrompts);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 md:p-8 bg-card border border-border/80 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="size-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
            <Zap className="size-8 fill-white" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Tổng kết phản xạ tốc độ! ⚡
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground max-w-sm">
            Bạn đã hoàn thành {summary.totalPrompts} câu rèn luyện phản xạ và tốc độ truy xuất khẩu ngữ.
          </DialogDescription>
        </div>

        {/* 4 Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Độ trễ trung vị (Median)</span>
            <span className="font-mono text-base font-bold text-amber-500">
              {(summary.medianLatencyMs / 1000).toFixed(2)}s
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Nhanh nhất (Best)</span>
            <span className="font-mono text-base font-bold text-emerald-500">
              {(summary.fastestResponseMs / 1000).toFixed(2)}s
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Độ chuẩn xác</span>
            <span className="font-mono text-base font-bold text-primary">
              {summary.accuracyRate}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Top 25% Nhanh</span>
            <span className="font-mono text-base font-bold text-indigo-500">
              {(summary.p25LatencyMs / 1000).toFixed(2)}s
            </span>
          </div>
        </div>

        {/* 4-Quadrant Distribution Breakdown */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Target className="size-3.5 text-primary" />
            <span>Phân bố Ma trận Phản xạ (4-Quadrant Latency Matrix):</span>
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">🔥 Fast + Correct:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {q.fastCorrectCount} ({Math.round((q.fastCorrectCount / total) * 100)}%)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <span className="text-amber-700 dark:text-amber-300 font-medium text-[11px]">⚡ Slow + Correct:</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {q.slowCorrectCount} ({Math.round((q.slowCorrectCount / total) * 100)}%)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
              <span className="text-orange-700 dark:text-orange-300 font-medium text-[11px]">⚠️ Fast + Incorrect:</span>
              <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                {q.fastIncorrectCount} ({Math.round((q.fastIncorrectCount / total) * 100)}%)
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
              <span className="text-indigo-700 dark:text-indigo-300 font-medium text-[11px]">🧩 Slow + Incorrect:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {q.slowIncorrectCount} ({Math.round((q.slowIncorrectCount / total) * 100)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Next Recommendation */}
        {summary.recommendedDrill && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
              <Zap className="size-3.5" />
              <span>Đề xuất tiếp theo:</span>
            </div>
            <p className="text-muted-foreground text-[11px]">{summary.recommendedDrill}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={onRestart}
            className="w-full sm:w-1/2 h-11 rounded-2xl font-semibold gap-2 border-border/80"
          >
            <RotateCcw className="size-4" />
            <span>Luyện tiếp</span>
          </Button>

          <Link href="/" className="w-full sm:w-1/2">
            <Button
              size="lg"
              className="w-full h-11 rounded-2xl font-bold gap-2 shadow-md shadow-primary/20"
            >
              <span>Về Trang chủ</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
