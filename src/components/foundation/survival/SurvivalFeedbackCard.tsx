"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Ban,
  RotateCcw,
} from "lucide-react";
import type { SurvivalEvaluationResult } from "@/types/survival-speaking";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface SurvivalFeedbackCardProps {
  evaluation: SurvivalEvaluationResult;
  onContinue: () => void;
  onRetry?: () => void;
}

export function SurvivalFeedbackCard({
  evaluation,
  onContinue,
  onRetry,
}: SurvivalFeedbackCardProps) {
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  return (
    <Card className="rounded-3xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-full animate-in fade-in-0 duration-200">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <Badge
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full gap-1 ${
                evaluation.isSuccessful ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}
            >
              {evaluation.isSuccessful ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <AlertCircle className="size-3.5" />
              )}
              <span>
                {evaluation.isSuccessful
                  ? `Phục hồi thành công: ${evaluation.overallScore}/100`
                  : `Cần cải thiện: ${evaluation.overallScore}/100`}
              </span>
            </Badge>

            {evaluation.targetWordAvoided !== undefined && (
              <Badge
                variant="outline"
                className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                  evaluation.targetWordAvoided
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "border-red-500 text-red-500 bg-red-500/10"
                }`}
              >
                {evaluation.targetWordAvoided ? (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    Không lộ từ cấm
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Ban className="size-3" />
                    Lỡ miệng nói từ cấm
                  </span>
                )}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Clock className="size-3.5 text-primary" />
            <span>Phản xạ: {(evaluation.repairInitiationLatencyMs / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Scrollable Evaluation Body */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
          {/* User Spoken vs Ideal Model */}
          <div className="grid md:grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Lời ứng biến của bạn:
                </span>
                {evaluation.userTranscript && (
                  <button
                    onClick={() => handlePlayAudio(evaluation.userTranscript)}
                    className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                    title="Nghe lại câu bạn nói"
                  >
                    <Volume2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="font-mono text-xs md:text-sm font-semibold text-foreground leading-relaxed">
                "{evaluation.userTranscript || "(Không ghi nhận được âm thanh)"}"
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Mẫu giải thích / ứng biến chuẩn:
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(evaluation.idealRepairVersion)}
                  className="size-6 p-0 rounded-full text-primary hover:bg-primary/20"
                  title="Nghe câu mẫu"
                >
                  <Volume2 className="size-3.5" />
                </Button>
              </div>
              <p className="font-mono text-xs md:text-sm font-bold text-foreground leading-relaxed">
                "{evaluation.idealRepairVersion}"
              </p>
            </div>
          </div>

          {/* Coach Advice */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/5 via-card to-background border border-border/60 text-xs space-y-1">
            <span className="font-bold text-foreground">Lời khuyên của AI Coach:</span>
            <p className="text-muted-foreground leading-relaxed">{evaluation.coachFeedbackVi}</p>
          </div>

          {/* Alternative Strategies */}
          {evaluation.alternativeStrategies && evaluation.alternativeStrategies.length > 0 && (
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-xs space-y-1.5">
              <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                Các chiến lược ứng biến thay thế khác:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.alternativeStrategies.map((strat, i) => (
                  <Badge key={i} variant="outline" className="text-[11px] font-medium bg-card px-2 py-0.5">
                    {strat}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 shrink-0">
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="rounded-xl h-9 px-3 gap-1.5 text-xs font-semibold"
            >
              <RotateCcw className="size-3.5" />
              <span>Nói lại</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 bg-muted rounded">Space</kbd>
            </Button>
          ) : (
            <div />
          )}

          <Button
            size="sm"
            onClick={onContinue}
            className="rounded-xl h-9 px-4 gap-1.5 text-xs font-bold shadow-xs btn-spring"
          >
            <span>Tiếp tục</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 bg-primary-foreground/20 rounded">Enter</kbd>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

