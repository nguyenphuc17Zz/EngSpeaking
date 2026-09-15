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
  Layers,
  RotateCcw,
  Home,
  Trophy,
  Zap,
  CheckCircle2,
  BarChart3,
  GitFork,
  Clock,
} from "lucide-react";
import type { ChunkSessionSummary } from "@/types/chunk-automaticity";
import { triggerConfetti } from "@/components/ui/confetti";
import { soundEffects } from "@/lib/audio/audio-chimes";

interface ChunkSummaryModalProps {
  isOpen: boolean;
  summary: ChunkSessionSummary | null;
  onRestart: () => void;
  onDismiss: () => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  opinion_defense: "Lập trường & Biện minh",
  concession_counter: "Nhượng bộ & Phản biện",
  problem_solution: "Chẩn đoán & Giải pháp",
  hypothetical_projection: "Giả định & Hệ quả",
  cause_effect_chain: "Chuỗi nhân quả",
};

const STRATEGY_COLORS: Record<string, string> = {
  opinion_defense: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  concession_counter: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  problem_solution: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  hypothetical_projection: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  cause_effect_chain: "bg-rose-500/15 text-rose-600 border-rose-500/30",
};

export function ChunkSummaryModal({
  isOpen,
  summary,
  onRestart,
  onDismiss,
}: ChunkSummaryModalProps) {
  useEffect(() => {
    if (isOpen && summary && summary.totalTasks > 0) {
      soundEffects.playSuccessFanfare();
      triggerConfetti();
    }
  }, [isOpen, summary]);

  if (!summary) return null;

  const avgScoreColor =
    summary.averageScore >= 80
      ? "text-emerald-500"
      : summary.averageScore >= 60
      ? "text-amber-500"
      : "text-rose-500";

  const avgLatencySec = (summary.averageLatencyMs / 1000).toFixed(2);
  const strategyEntries = Object.entries(summary.strategyDistribution).sort(
    ([, a], [, b]) => b - a
  );
  const totalStrategyTasks = strategyEntries.reduce((s, [, c]) => s + c, 0);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 md:p-8 bg-card border border-border/80 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="size-16 rounded-3xl bg-gradient-to-tr from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 animate-bounce">
            <Layers className="size-8" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Tổng kết Chunk Automaticity! 🧩
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground max-w-sm">
            Bạn đã lắp ráp{" "}
            <span className="font-bold text-foreground">{summary.totalTasks}</span> chuỗi
            khối câu. Kỹ năng lắp ráp ngôn ngữ tự động đang được tôi luyện!
          </DialogDescription>
        </div>

        {/* 4 Core Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">
              Điểm TB
            </span>
            <span className={`font-mono text-base font-bold ${avgScoreColor}`}>
              {summary.averageScore}
              <span className="text-xs">/100</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">
              Tổng chuỗi
            </span>
            <span className="font-mono text-base font-bold text-primary">
              {summary.totalTasks}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">
              Độ trễ TB
            </span>
            <span className="font-mono text-base font-bold text-amber-500">
              {avgLatencySec}s
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">
              Phản xạ nhanh
            </span>
            <span className="font-mono text-base font-bold text-emerald-500">
              {summary.fastRecallCount}
            </span>
          </div>
        </div>

        {/* Blocks Used */}
        {summary.blocksUsedTotal > 0 && (
          <div className="p-3.5 rounded-2xl bg-violet-500/8 border border-violet-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-violet-500/15 text-violet-600 flex items-center justify-center">
                <GitFork className="size-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Tổng khối đã lắp ráp</p>
                <p className="text-[11px] text-muted-foreground">
                  Trung bình {summary.totalTasks > 0 ? (summary.blocksUsedTotal / summary.totalTasks).toFixed(1) : 0} khối/chuỗi
                </p>
              </div>
            </div>
            <span className="font-mono text-lg font-bold text-violet-600">
              {summary.blocksUsedTotal}
            </span>
          </div>
        )}

        {/* Strategy Distribution */}
        {strategyEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="size-3.5" /> Phân bổ chiến lược
            </p>
            <div className="space-y-1.5">
              {strategyEntries.map(([strategy, count]) => {
                const pct = totalStrategyTasks > 0 ? Math.round((count / totalStrategyTasks) * 100) : 0;
                return (
                  <div key={strategy} className="flex items-center gap-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${STRATEGY_COLORS[strategy] || "bg-muted/40"}`}
                    >
                      {STRATEGY_LABELS[strategy] || strategy}
                    </Badge>
                    <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0 w-8 text-right">
                      {count}x
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance Badge */}
        <div className="flex items-center justify-center">
          {summary.averageScore >= 80 ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-sm font-bold">
              <Trophy className="size-4" />
              <span>Xuất sắc! Khối câu thuần thục cao!</span>
            </div>
          ) : summary.averageScore >= 60 ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-sm font-bold">
              <Zap className="size-4" />
              <span>Khá tốt! Tiếp tục luyện tập mỗi ngày!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/8 border border-primary/20 text-primary text-sm font-bold">
              <CheckCircle2 className="size-4" />
              <span>Cố lên! Lắp ráp nhiều hơn để nhuần nhuyễn!</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <Button
            className="flex-1 rounded-2xl font-bold h-11 gap-2 btn-spring bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25"
            onClick={onRestart}
          >
            <RotateCcw className="size-4" />
            Luyện tiếp ngay
          </Button>
          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full rounded-2xl font-semibold h-11 gap-2 border-border/80"
              onClick={onDismiss}
            >
              <Home className="size-4" />
              Về trang chủ
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
