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
  Trophy,
  Sparkles,
  Zap,
  Clock,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Layers,
  CheckCircle2,
} from "lucide-react";
import type { VNToENSessionSummary } from "@/types/vn-to-en";
import { triggerConfetti } from "@/components/ui/confetti";
import { soundEffects } from "@/lib/audio/audio-chimes";

interface VNSummaryModalProps {
  isOpen: boolean;
  summary: VNToENSessionSummary | null;
  onRestart: () => void;
}

export function VNSummaryModal({
  isOpen,
  summary,
  onRestart,
}: VNSummaryModalProps) {
  useEffect(() => {
    if (isOpen && summary) {
      soundEffects.playSuccessFanfare();
      triggerConfetti();
    }
  }, [isOpen, summary]);

  if (!summary) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 md:p-8 bg-card border border-border/80 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="size-16 rounded-3xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 animate-bounce">
            <Trophy className="size-8" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Hoàn thành phiên truy xuất khẩu ngữ! 🎉
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground max-w-sm">
            Bạn đã hoàn thành {summary.completedTasks} câu truy xuất trực tiếp từ ý niệm tiếng Việt sang tiếng Anh.
          </DialogDescription>
        </div>

        {/* 4 Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Đúng lần đầu</span>
            <span className="font-mono text-base font-bold text-emerald-500">
              {summary.firstAttemptAccuracy}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Độ trễ trung bình</span>
            <span className="font-mono text-base font-bold text-indigo-500">
              {(summary.averageResponseLatencyMs / 1000).toFixed(1)}s
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Truy xuất tự thân</span>
            <span className="font-mono text-base font-bold text-amber-500">
              {summary.independentSuccessRate}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-1">
            <span className="text-[10px] text-primary font-semibold block">Mastery tăng</span>
            <span className="font-mono text-base font-bold text-primary">
              +{summary.masteryDelta}
            </span>
          </div>
        </div>

        {/* Gap Distribution Breakdown */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-primary" />
              Chẩn đoán khoảng cách ngôn ngữ (Spoken Gap Diagnosis):
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-card border border-border/40 flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">✨ Phản xạ chuẩn:</span>
              <span className="font-mono font-bold text-emerald-500">{summary.gapDistribution.noneCount} câu</span>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/40 flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">⚡ Retrieval Gap:</span>
              <span className="font-mono font-bold text-amber-500">{summary.gapDistribution.retrievalGapCount} câu</span>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/40 flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">📚 Knowledge Gap:</span>
              <span className="font-mono font-bold text-red-500">{summary.gapDistribution.knowledgeGapCount} câu</span>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/40 flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">🧩 Production Gap:</span>
              <span className="font-mono font-bold text-indigo-500">{summary.gapDistribution.productionGapCount} câu</span>
            </div>
          </div>
        </div>

        {/* Top Weakness & Next Action */}
        {summary.topWeaknessIdentified && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-3.5" />
              <span>Tiêu điểm: {summary.topWeaknessIdentified}</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {summary.recommendedNextAction || "Luyện thêm 1 phiên Timed Retrieval để giảm độ trễ."}
            </p>
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

          <Link href="/foundation" className="w-full sm:w-1/2">
            <Button
              size="lg"
              className="w-full h-11 rounded-2xl font-bold gap-2 shadow-md shadow-primary/20"
            >
              <span>Về Foundation Hub</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
