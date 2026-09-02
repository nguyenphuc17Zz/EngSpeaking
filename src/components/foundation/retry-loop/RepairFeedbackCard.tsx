"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Volume2,
  RotateCcw,
  ArrowRight,
  Sparkles,
  Zap,
  Award,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type { RepairEvaluationResult, RetrySession } from "@/types/retry-loop";

interface Props {
  session: RetrySession;
  result: RepairEvaluationResult;
  onRetry: () => void;
  onContinue: () => void;
}

export function RepairFeedbackCard({ session, result, onRetry, onContinue }: Props) {
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  const isHigh = result.overallRepairScore >= 80;
  const isMedium = result.overallRepairScore >= 60 && result.overallRepairScore < 80;

  return (
    <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden flex flex-col h-full animate-in fade-in-0 duration-300">
      <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full space-y-4">
        {/* Score Header & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`size-14 rounded-2xl flex items-center justify-center font-mono text-2xl font-bold border shadow-xs ${
                isHigh
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : isMedium
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
              }`}
            >
              {result.overallRepairScore}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Điểm sửa sai khẩu ngữ:
                </span>
                {result.isTargetErrorResolved ? (
                  <Badge className="bg-emerald-500 text-white font-mono text-[10px] font-bold gap-1 shadow-xs">
                    <CheckCircle2 className="size-3" />
                    <span>Lỗi đã được giải quyết</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="font-mono text-[10px] font-bold gap-1 shadow-xs">
                    <XCircle className="size-3" />
                    <span>Chưa sửa đúng</span>
                  </Badge>
                )}
              </div>

              {result.selfCorrectionDetected && (
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 animate-pulse">
                  <Award className="size-3.5" />
                  <span>🎉 Tự sửa lỗi (Self-Correction Bonus) — Phản xạ cực tốt!</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs font-mono">
              Lần thử #{session.currentAttemptNumber}
            </Badge>
          </div>
        </div>

        {/* Detailed Comparison: Before -> User Spoken -> Target Model */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {/* AI Vietnamese Feedback Message */}
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" />
              <span>Đánh giá từ AI Coach:</span>
            </div>
            <p className="text-xs md:text-sm text-foreground leading-relaxed font-medium">
              {result.feedbackMessage}
            </p>
          </div>

          {/* Contrast Grid */}
          <div className="space-y-2 text-xs font-mono">
            {/* 1. What was wrong initially */}
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">
                1. Câu nói có lỗi ban đầu:
              </span>
              <p className="line-through text-muted-foreground">
                "{session.originalTranscript}"
              </p>
            </div>

            {/* 2. User retry attempt */}
            <div className="p-3 rounded-xl bg-background border border-border/80 space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">
                  2. Bạn vừa sửa lại:
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {result.repairedText ? `"${result.repairedText}"` : "Không nhận diện được giọng nói"}
                </span>
              </div>
            </div>

            {/* 3. Ideal Target Model */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  3. Câu chuẩn bản ngữ lý tưởng:
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(session.targetCorrection.betterSentence)}
                  className="h-6 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 gap-1 rounded-lg"
                >
                  <Volume2 className="size-3" />
                  <span>Nghe câu chuẩn</span>
                </Button>
              </div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                "{session.targetCorrection.betterSentence}"
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions Dock */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:bg-muted btn-spring shadow-2xs"
          >
            <RotateCcw className="size-3.5" />
            <span>Thử sửa lại (Space)</span>
          </Button>

          <Button
            type="button"
            onClick={onContinue}
            className="h-10 px-5 rounded-xl text-xs font-bold gap-2 btn-spring shadow-xs"
          >
            <span>Thử thách tiếp theo (Enter)</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
