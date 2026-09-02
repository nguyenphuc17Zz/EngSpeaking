"use client";

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
  ShieldCheck,
  Trophy,
  Zap,
  RotateCcw,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { SurvivalSessionSummary } from "@/types/survival-speaking";

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 md:p-8 bg-card border border-border/80 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="size-14 rounded-3xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <Trophy className="size-7" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Tổng kết buổi luyện Survival Speaking
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bạn đã hoàn thành các thử thách xử lý sự cố và ứng biến giao tiếp.
          </DialogDescription>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Phục hồi
            </span>
            <p className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.recoveryRate}%
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Số câu
            </span>
            <p className="text-xl font-mono font-extrabold text-foreground">
              {summary.successfulAttempts}/{summary.totalAttempts}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">
              Độ trễ TB
            </span>
            <p className="text-xl font-mono font-extrabold text-primary">
              {(summary.averageLatencyMs / 1000).toFixed(1)}s
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onRestart}
            className="flex-1 rounded-2xl text-xs font-bold h-10 border-border/80"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Luyện lại
          </Button>

          <Button
            onClick={onClose}
            className="flex-1 rounded-2xl text-xs font-bold h-10 bg-primary shadow-md shadow-primary/25 btn-spring"
          >
            <span>Tiếp tục học</span>
            <ArrowRight className="size-3.5 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
