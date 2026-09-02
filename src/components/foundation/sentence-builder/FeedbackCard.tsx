"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Volume2,
  RotateCcw,
  ArrowRight,
  ThumbsUp,
  Info,
} from "lucide-react";
import type { SentenceBuilderEvaluation } from "@/types/sentence-builder";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

interface FeedbackCardProps {
  evaluation: SentenceBuilderEvaluation;
  onRetry: () => void;
  onContinue: () => void;
}

export function FeedbackCard({ evaluation, onRetry, onContinue }: FeedbackCardProps) {
  const tts = useBrowserTTS();

  const handlePlayModelAudio = () => {
    if (evaluation.betterVersion) {
      tts.speak(evaluation.betterVersion);
    }
  };

  const isSuccess = evaluation.isSuccessful;

  return (
    <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full space-y-3">
        {/* Top Header: Overall Score & Mini Metric Badges */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3 gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                evaluation.meaningScore >= 75
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              <CheckCircle2 className="size-3 mr-1" />
              Ý: {evaluation.meaningScore}%
            </Badge>

            <Badge
              variant="outline"
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                evaluation.grammarScore >= 75
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              Ngữ pháp: {evaluation.grammarScore}%
            </Badge>

            <Badge
              variant="outline"
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
            >
              <Sparkles className="size-3 mr-1" />
              Tự nhiên: {evaluation.naturalnessScore}%
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-muted-foreground font-medium">Tổng:</span>
            <span
              className={`font-mono font-bold text-base md:text-lg ${
                isSuccess ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {evaluation.overallScore}/100
            </span>
          </div>
        </div>

        {/* Middle Section: User Speech vs Model Speech */}
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          {/* User Spoken */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Bạn đã nói:
            </span>
            <p className="font-mono text-xs md:text-sm font-semibold text-foreground">
              "{evaluation.userTranscript}"
            </p>
          </div>

          {/* Better Native Model */}
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 space-y-1 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Sparkles className="size-3" />
                Phiên bản bản xứ:
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePlayModelAudio}
                className="size-6 p-0 rounded-full text-primary hover:bg-primary/20"
                title="Nghe phát âm chuẩn"
              >
                <Volume2 className="size-3.5" />
              </Button>
            </div>
            <p className="font-mono text-xs md:text-sm font-bold text-foreground">
              "{evaluation.betterVersion}"
            </p>
          </div>

          {/* Actionable Error Correction (if any) */}
          {evaluation.errors && evaluation.errors.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                Cần sửa:
              </span>
              <div className="space-y-1">
                {evaluation.errors.slice(0, 2).map((err, i) => (
                  <div key={i} className="text-xs text-foreground flex flex-wrap items-center gap-1">
                    <span className="line-through text-red-500 font-mono font-semibold">"{err.userText}"</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">"{err.correction}"</span>
                    <span className="text-muted-foreground text-[11px]">({err.explanation})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simplified Version (if struggling) */}
          {evaluation.simplifiedVersion && (
            <div className="p-2 rounded-2xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary shrink-0" />
              <div>
                <span className="font-semibold text-foreground">Dễ nhớ: </span>
                <span className="font-mono text-foreground font-medium">"{evaluation.simplifiedVersion}"</span>
              </div>
            </div>
          )}

          {/* Praise Note */}
          {evaluation.praisePoints && evaluation.praisePoints.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-0.5">
              <ThumbsUp className="size-3 shrink-0" />
              <span>{evaluation.praisePoints[0]}</span>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-9 px-4 rounded-xl font-semibold gap-1.5 border-border/80 text-xs"
          >
            <RotateCcw className="size-3.5" />
            <span>Nói lại [Space]</span>
          </Button>

          <Button
            size="sm"
            onClick={onContinue}
            className="h-9 px-5 rounded-xl font-bold gap-1.5 shadow-sm shadow-primary/20 btn-spring text-xs"
          >
            <span>Câu tiếp theo [Enter]</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
