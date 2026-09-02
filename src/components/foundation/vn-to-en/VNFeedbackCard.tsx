"use client";

import { useState } from "react";
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
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import type { VNToENEvaluation } from "@/types/vn-to-en";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

interface VNFeedbackCardProps {
  evaluation: VNToENEvaluation;
  onRetry: () => void;
  onContinue: () => void;
  onSayItBetter: () => void;
}

export function VNFeedbackCard({
  evaluation,
  onRetry,
  onContinue,
  onSayItBetter,
}: VNFeedbackCardProps) {
  const tts = useBrowserTTS();
  const [showExpressions, setShowExpressions] = useState(false);

  const handlePlayTTS = (text: string) => {
    tts.speak(text);
  };

  const getGapBadge = (gap: string) => {
    switch (gap) {
      case "retrieval_gap":
        return {
          label: "⚡ Retrieval Gap (Biết từ nhưng phản xạ chậm)",
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "knowledge_gap":
        return {
          label: "📚 Knowledge Gap (Cần củng cố từ/cấu trúc)",
          color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
        };
      case "production_gap":
        return {
          label: "🧩 Production Gap (Khẩu ngữ chưa trơn tru)",
          color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        };
      default:
        return {
          label: "✨ Phản xạ mượt mà",
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
    }
  };

  const gapInfo = getGapBadge(evaluation.gapType);

  return (
    <Card className="rounded-3xl border border-border/80 bg-card shadow-md overflow-hidden animate-in fade-in-0 slide-in-from-bottom-3 duration-300">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                evaluation.meaningScore >= 75
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              <CheckCircle2 className="size-3 mr-1" />
              Ý nghĩa (Meaning): {evaluation.meaningScore}%
            </Badge>

            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                evaluation.grammarScore >= 75
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              {evaluation.grammarScore >= 75 ? (
                <CheckCircle2 className="size-3 mr-1" />
              ) : (
                <AlertTriangle className="size-3 mr-1" />
              )}
              Ngữ pháp: {evaluation.grammarScore}%
            </Badge>

            <Badge
              variant="outline"
              className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
            >
              <Sparkles className="size-3 mr-1" />
              Tự nhiên: {evaluation.naturalnessScore}%
            </Badge>

            <Badge variant="outline" className="text-xs font-mono px-2.5 py-1 rounded-full border bg-muted/60">
              <Clock className="size-3 mr-1 text-primary" />
              {(evaluation.responseLatencyMs / 1000).toFixed(1)}s
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Điểm câu:</span>
            <span
              className={`font-mono font-bold text-lg ${
                evaluation.isSuccessful ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {evaluation.overallScore}/100
            </span>
          </div>
        </div>

        {/* Gap Diagnosis Pill */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs font-semibold rounded-full border ${gapInfo.color}`}>
              {gapInfo.label}
            </Badge>
            <span className="text-muted-foreground hidden sm:inline">{evaluation.gapExplanation}</span>
          </div>
        </div>

        {/* User Said vs Native Model */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* User Transcript */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Bạn đã nói:
            </span>
            <p className="font-mono text-sm font-semibold text-foreground">
              "{evaluation.userTranscript}"
            </p>
          </div>

          {/* Better Native Version */}
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Sparkles className="size-3" />
                Câu bản xứ chuẩn xác:
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlayTTS(evaluation.betterVersion)}
                className="size-7 p-0 rounded-full text-primary hover:bg-primary/20"
                title="Nghe mẫu phát âm"
              >
                <Volume2 className="size-3.5" />
              </Button>
            </div>
            <p className="font-mono text-sm font-bold text-foreground">
              "{evaluation.betterVersion}"
            </p>
          </div>
        </div>

        {/* Actionable Errors (if any) */}
        {evaluation.errors && evaluation.errors.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              Điểm cần lưu ý chỉnh sửa:
            </span>
            <div className="space-y-1.5">
              {evaluation.errors.map((err, i) => (
                <div key={i} className="text-xs text-foreground flex flex-col sm:flex-row sm:items-center gap-1.5">
                  <span className="line-through text-red-500 font-mono font-semibold">"{err.userText}"</span>
                  <span className="text-muted-foreground hidden sm:inline">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">"{err.correction}"</span>
                  <span className="text-muted-foreground text-[11px]">({err.explanation})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* "One Meaning -> Many Expressions" Drawer */}
        {evaluation.naturalAlternatives && evaluation.naturalAlternatives.length > 0 && (
          <div className="rounded-2xl border border-border/80 bg-muted/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExpressions(!showExpressions)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="size-3.5 text-primary" />
                <span>Nhiều cách diễn đạt tự nhiên khác (One Meaning → Many Expressions)</span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {evaluation.naturalAlternatives.length}
                </Badge>
              </div>
              {showExpressions ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showExpressions && (
              <div className="p-4 pt-1 space-y-2.5 border-t border-border/40 bg-card">
                {evaluation.naturalAlternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-mono font-semibold text-foreground">"{alt.expression}"</p>
                      <span className="text-[11px] text-muted-foreground">{alt.explanationVi || alt.tone}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlayTTS(alt.expression)}
                      className="size-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <Volume2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Say It Better / Say Again & Continue */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-border/40">
          {evaluation.isSayItBetterNeeded ? (
            <Button
              variant="default"
              size="lg"
              onClick={onSayItBetter}
              className="w-full sm:w-auto h-11 px-5 rounded-2xl font-bold gap-2 bg-gradient-to-r from-indigo-600 to-primary text-white shadow-md btn-spring"
            >
              <Sparkles className="size-4" />
              <span>Nói tự nhiên hơn (Say It Better)</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={onRetry}
              className="w-full sm:w-auto h-11 rounded-2xl font-semibold gap-2 border-border/80"
            >
              <RotateCcw className="size-4" />
              <span>Nói lại câu này (Say Again)</span>
            </Button>
          )}

          <Button
            size="lg"
            onClick={onContinue}
            className="w-full sm:w-auto h-11 px-6 rounded-2xl font-bold gap-2 shadow-md shadow-primary/25 btn-spring"
          >
            <span>Câu tiếp theo (Continue)</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
