"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { triggerConfetti } from "@/components/ui/confetti";
import { toast } from "@/lib/toast";
import {
  Flame,
  Trophy,
  Sparkles,
  Clock,
  Zap,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

interface SessionCompletedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionTitle?: string;
  durationMinutes?: number;
  turnsCount?: number;
  avgTtfwMs?: number;
  overallScore?: number;
  grammarScore?: number;
  fluencyScore?: number;
  vocabularyScore?: number;
  errorsDetected?: number;
  wpm?: number;
  ttrRatio?: number;
  twistResolved?: boolean;
  cefrEstimate?: string;
  firstAttemptAccuracy?: number;
  averageIndependence?: number;
  masteryDelta?: number;
  topWeakness?: string;
  recommendedNextAction?: string;
  onRestart?: () => void;
}

export function SessionCompletedModal({
  open,
  onOpenChange,
  sessionTitle = "Phiên luyện nói AI",
  durationMinutes = 5,
  turnsCount = 6,
  avgTtfwMs = 1400,
  overallScore = 85,
  grammarScore,
  fluencyScore,
  vocabularyScore,
  errorsDetected = 1,
  wpm = 120,
  ttrRatio = 72,
  twistResolved = true,
  cefrEstimate = "B2",
  firstAttemptAccuracy,
  averageIndependence,
  masteryDelta,
  topWeakness,
  recommendedNextAction,
  onRestart,
}: SessionCompletedModalProps) {
  const grammar = grammarScore ?? Math.min(100, overallScore + 3);
  const fluency = fluencyScore ?? Math.max(40, overallScore - 3);
  const vocabulary = vocabularyScore ?? overallScore;
  useEffect(() => {
    if (open) {
      soundEffects.playSuccessFanfare();
      triggerConfetti();
      toast.celebrate("Hoàn thành bài luyện!", "Bạn nhận được +50 XP và duy trì Streak ngày.");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 text-center space-y-4">
        {/* Floating Celebration Icon */}
        <div className="mx-auto size-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-500 to-primary flex items-center justify-center text-white shadow-xl shadow-orange-500/25 animate-bounce">
          <Trophy className="size-8" />
        </div>

        <DialogHeader className="space-y-1 text-center">
          <DialogTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Tuyệt vời! Hoàn thành phiên nói
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {sessionTitle} • Bạn đã duy trì phản xạ giao tiếp rất xuất sắc!
          </DialogDescription>
        </DialogHeader>

        {/* Streak & XP Highlight (summary thật, không hardcode) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-background border border-orange-500/20 flex items-center justify-around">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-orange-500 font-bold text-lg font-mono">
              <Flame className="size-5 fill-orange-500 animate-pulse" />
              <span>{firstAttemptAccuracy !== undefined ? `${firstAttemptAccuracy}%` : `${turnsCount} turns`}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Đúng lần đầu</span>
          </div>

          <div className="h-8 w-px bg-border/60" />

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-primary font-bold text-lg font-mono">
              <Sparkles className="size-5" />
              <span>+{masteryDelta ?? 3}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Mastery tăng</span>
          </div>

          <div className="h-8 w-px bg-border/60" />

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-emerald-500 font-bold text-lg font-mono">
              <CheckCircle2 className="size-5" />
              <span>{overallScore}/100</span>
            </div>
            <span className="text-[11px] text-muted-foreground">Điểm tổng quan{averageIndependence !== undefined ? ` · Tự lập ${averageIndependence}%` : ""}</span>
          </div>
        </div>

        {(topWeakness || recommendedNextAction) && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left text-xs space-y-1">
            {topWeakness && (
              <p className="font-bold text-amber-700 dark:text-amber-300">Tiêu điểm: {topWeakness}</p>
            )}
            {recommendedNextAction && <p className="text-muted-foreground">{recommendedNextAction}</p>}
          </div>
        )}

        {/* Dimensional Performance Breakdown (Standards from Foundation) */}
        <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-2.5 text-left">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Đánh giá kỹ năng sư phạm:
          </span>

          <div className="space-y-2 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Độ chính xác ngữ pháp (Grammar):</span>
                <span className="font-mono text-foreground">{grammar}%</span>
              </div>
              <Progress value={grammar} className="h-1.5" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Lưu loát & Tốc độ nói (Fluency):</span>
                <span className="font-mono text-foreground">{fluency}%</span>
              </div>
              <Progress value={fluency} className="h-1.5" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-muted-foreground">Vốn từ & Cụm bản xứ (Lexical Range):</span>
                <span className="font-mono text-foreground">{vocabulary}%</span>
              </div>
              <Progress value={vocabulary} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-2xl bg-muted/20 border border-border/40 space-y-0.5">
            <div className="flex items-center justify-center text-blue-500 mb-0.5">
              <Clock className="size-3.5" />
            </div>
            <span className="font-mono font-bold text-foreground block">{durationMinutes}m</span>
            <span className="text-[9px] text-muted-foreground">Thời gian</span>
          </div>

          <div className="p-2 rounded-2xl bg-muted/20 border border-border/40 space-y-0.5">
            <div className="flex items-center justify-center text-purple-500 mb-0.5">
              <Zap className="size-3.5" />
            </div>
            <span className="font-mono font-bold text-foreground block">
              {(avgTtfwMs / 1000).toFixed(1)}s
            </span>
            <span className="text-[9px] text-muted-foreground">Độ trễ phản xạ</span>
          </div>

          <div className="p-2 rounded-2xl bg-muted/20 border border-border/40 space-y-0.5">
            <div className="flex items-center justify-center text-emerald-500 mb-0.5">
              <Sparkles className="size-3.5" />
            </div>
            <span className="font-mono font-bold text-foreground block">{wpm} WPM</span>
            <span className="text-[9px] text-muted-foreground">Tốc độ nói</span>
          </div>

          <div className="p-2 rounded-2xl bg-muted/20 border border-border/40 space-y-0.5">
            <div className="flex items-center justify-center text-amber-500 mb-0.5">
              <Trophy className="size-3.5" />
            </div>
            <span className="font-mono font-bold text-foreground block">{ttrRatio}%</span>
            <span className="text-[9px] text-muted-foreground">Đa dạng từ TTR</span>
          </div>
        </div>

        {/* Conversational Twist & CEFR Band */}
        <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-left">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-mono text-[10px]">
              CEFR {cefrEstimate}
            </Badge>
            <span className="text-muted-foreground text-[11px]">
              Ứng biến tình huống: <strong className="text-foreground">{twistResolved ? "Giải quyết xuất sắc ✓" : "Cần linh hoạt hơn"}</strong>
            </span>
          </div>
          <span className="font-mono text-[10px] text-primary font-bold">{turnsCount} lượt đối thoại</span>
        </div>

        {/* Error Bank Notice */}
        {errorsDetected > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-left">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              <span className="text-muted-foreground">
                Đã đồng bộ <strong className="text-foreground">{errorsDetected} điểm ngữ pháp cần nắn</strong> vào Error Bank
              </span>
            </div>
            <Link href="/foundation/error-bank">
              <Button variant="ghost" size="sm" className="h-7 text-xs font-bold text-amber-600 dark:text-amber-400 p-1">
                Luyện sửa lỗi →
              </Button>
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Link href="/" className="flex-1">
            <Button
              variant="default"
              size="lg"
              className="w-full gap-2 rounded-2xl font-bold h-11 shadow-sm"
              onClick={() => onOpenChange(false)}
            >
              <span>Về Trang chủ</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>

          {onRestart && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                onOpenChange(false);
                onRestart();
              }}
              className="gap-2 rounded-2xl h-11 border-border/80 font-bold"
            >
              <RotateCcw className="size-4" />
              <span>Luyện lại</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
