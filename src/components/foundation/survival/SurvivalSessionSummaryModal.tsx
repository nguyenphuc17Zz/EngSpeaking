"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import type { SurvivalSessionSummary } from "@/types/survival-speaking";
import { triggerConfetti } from "@/components/ui/confetti";
import { soundEffects } from "@/lib/audio/audio-chimes";

interface SurvivalSessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SurvivalSessionSummary;
  onRestart: () => void;
}

export function SurvivalSessionSummaryModal({
  isOpen,
  onClose,
  summary,
  onRestart,
}: SurvivalSessionSummaryModalProps) {
  useEffect(() => {
    if (isOpen && summary) {
      soundEffects.playSuccessFanfare();
      triggerConfetti();
    }
  }, [isOpen, summary]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 md:p-8 bg-card border border-border/80 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="size-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 animate-bounce">
            <Trophy className="size-8" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Hoàn thành phiên Survival Speaking! 🎉
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bạn đã hoàn thành {summary.completedTasks ?? summary.totalAttempts} thử thách ứng biến
            ({summary.kind === "scenarios" ? "Real-Life Scenarios" : "Circumlocution Gym"}).
          </DialogDescription>
        </div>

        {/* 4 Core Metrics Grid (SB/VN-EN aligned) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Phục hồi</span>
            <span className="font-mono text-base font-bold text-emerald-500">{summary.recoveryRate}%</span>
          </div>
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Đúng lần đầu</span>
            <span className="font-mono text-base font-bold text-indigo-500">
              {summary.firstAttemptAccuracy ?? summary.recoveryRate}%
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Độ trễ TB</span>
            <span className="font-mono text-base font-bold text-amber-500">
              {(summary.averageLatencyMs / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-1">
            <span className="text-[10px] text-primary font-semibold block">Mastery +</span>
            <span className="font-mono text-base font-bold text-primary">+{summary.masteryDelta ?? 3}</span>
          </div>
        </div>

        {/* Skills + weakness */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <TrendingUp className="size-3.5 text-primary" />
            <span>Đã luyện: {(summary.practicedSkills || [summary.strongestSkill]).join(" · ")}</span>
          </div>
          <div className="text-muted-foreground">
            Điểm TB: {summary.averageOverallScore ?? summary.recoveryRate}/100 · Tự lập:{" "}
            {summary.averageIndependence ?? 100}%
          </div>
        </div>

        {(summary.topWeaknessIdentified || summary.needsWorkSkill) && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-3.5" />
              <span>Tiêu điểm: {summary.topWeaknessIdentified || summary.needsWorkSkill}</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {summary.recommendedNextAction || "Luyện thêm với hint T3 rồi giảm dần về T0."}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onRestart}
            className="flex-1 rounded-2xl text-xs font-bold h-11 border-border/80"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Luyện lại
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 rounded-2xl text-xs font-bold h-11 bg-primary shadow-md shadow-primary/25 btn-spring"
          >
            <span>Tiếp tục học</span>
            <ArrowRight className="size-3.5 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
