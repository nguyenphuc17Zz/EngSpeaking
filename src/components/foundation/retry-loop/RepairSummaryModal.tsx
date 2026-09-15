"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Sparkles,
  Zap,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { RepairSessionSummary } from "@/types/retry-loop";
import { triggerConfetti } from "@/components/ui/confetti";
import { soundEffects } from "@/lib/audio/audio-chimes";

interface RepairSummaryModalProps {
  isOpen: boolean;
  summary: RepairSessionSummary | null;
  onRestart: () => void;
}

export function RepairSummaryModal({
  isOpen,
  summary,
  onRestart,
}: RepairSummaryModalProps) {
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
          <div className="size-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
            <Trophy className="size-8" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Hoàn thành phiên Sửa lỗi Khẩu ngữ! 🎉
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground max-w-sm">
            Bạn đã rèn luyện phản xạ phát hiện và đính chính lỗi trực tiếp ngay khi nói, chuyển hóa nhận thức ngữ pháp thành khẩu ngữ tự nhiên.
          </DialogDescription>
        </div>

        {/* 4 Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block flex items-center justify-center gap-1">
              <ShieldCheck className="size-3 text-emerald-500" />
              Tỉ lệ phục hồi
            </span>
            <span className="font-mono text-base font-bold text-emerald-500">
              {summary.recoveryRate}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block flex items-center justify-center gap-1">
              <Zap className="size-3 text-indigo-500" />
              Chuẩn lần 1
            </span>
            <span className="font-mono text-base font-bold text-indigo-500">
              {summary.firstAttemptAccuracy}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block flex items-center justify-center gap-1">
              <Sparkles className="size-3 text-amber-500" />
              Tự sửa lỗi
            </span>
            <span className="font-mono text-base font-bold text-amber-500">
              {summary.selfCorrectionCount}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block flex items-center justify-center gap-1">
              <CheckCircle2 className="size-3 text-amber-500" />
              Đã khắc phục
            </span>
            <span className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">
              {summary.resolvedCount}/{summary.totalChallenges}
            </span>
          </div>
        </div>

        {/* History Breakdown */}
        {summary.history.length > 0 && (
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2.5 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>Lịch sử các câu đã luyện ({summary.history.length})</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {summary.resolvedCount} câu sửa đạt chuẩn
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {summary.history.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-card border border-border/60 space-y-1 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground truncate max-w-[240px]">
                      {item.challengeTitle}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.isResolved ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono"
                        >
                          Đã sửa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono"
                        >
                          Chưa xong
                        </Badge>
                      )}
                      {item.isSelfCorrection && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono"
                        >
                          Tự sửa
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="line-through text-rose-500/80">{item.originalSentence}</span>
                    <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground font-medium">{item.betterSentence}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            onClick={onRestart}
            className="w-full sm:flex-1 h-11 rounded-2xl font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 btn-spring"
          >
            <RotateCcw className="size-4" />
            <span>Luyện tiếp tục</span>
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl font-semibold gap-2 border-border/80 hover:bg-muted"
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
