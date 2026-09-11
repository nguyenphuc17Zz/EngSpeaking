"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Zap,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Clock,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import type { LatencyEvaluation } from "@/types/latency-training";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface LatencyFeedbackCardProps {
  evaluation: LatencyEvaluation;
  onContinue: () => void;
  onRetry?: () => void;
}

export function LatencyFeedbackCard({
  evaluation,
  onContinue,
  onRetry,
}: LatencyFeedbackCardProps) {
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  const getQuadrantInfo = (quadrant: string) => {
    switch (quadrant) {
      case "fast_correct":
        return {
          label: "🔥 Fast + Correct (Phản xạ tự động)",
          color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          desc: "Đạt chuẩn kép: Bật câu tức thì và ngữ pháp chuẩn xác.",
        };
      case "slow_correct":
        return {
          label: "⚡ Slow + Correct (Kiến thức tốt, cần tăng tốc)",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          desc: "Bạn nói rất đúng! Cần luyện thêm để rút ngắn thời gian suy nghĩ.",
        };
      case "fast_incorrect":
        return {
          label: "⚠️ Fast + Incorrect (Tốc độ tốt, cần chính xác)",
          color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
          desc: "Phản xạ nhanh nhưng câu bị sai một số cấu trúc ngữ pháp.",
        };
      default:
        return {
          label: "🧩 Slow + Incorrect (Cần giảm độ phức tạp)",
          color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
          desc: "Có dấu hiệu quá tải nhận thức. Hãy thử dùng câu ngắn hơn.",
        };
    }
  };

  const quadInfo = getQuadrantInfo(evaluation.quadrant);
  const isFaster = evaluation.responseLatencyMs <= evaluation.targetLatencyMs;

  return (
    <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden flex flex-col h-full animate-in fade-in-0 duration-300">
      <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full space-y-4">
        {/* Top Badges & Latency Metric */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${quadInfo.color}`}
            >
              {quadInfo.label}
            </Badge>

            {evaluation.isFastPass && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 gap-1 shadow-2xs"
              >
                <Zap className="size-3 text-sky-500 fill-sky-500" />
                <span>Fast-Pass (&lt;30ms)</span>
              </Badge>
            )}

            {evaluation.bufferUsed && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1"
              >
                <span>🎯 Cụm đệm: "{evaluation.bufferUsed}"</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
              <Clock className="size-4 text-primary" />
              <span className={isFaster ? "text-emerald-500" : "text-amber-500"}>
                {(evaluation.responseLatencyMs / 1000).toFixed(2)}s
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                / {(evaluation.targetLatencyMs / 1000).toFixed(1)}s target
              </span>
              {evaluation.speechOnsetMs !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground border-l border-border/60 pl-2">
                  Bật âm: {(evaluation.speechOnsetMs / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quadrant Explanation & Hesitation Callout */}
        <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground font-medium">{quadInfo.desc}</span>

          {evaluation.hesitation.fillerCount > 0 && (
            <Badge variant="secondary" className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
              Phát hiện {evaluation.hesitation.fillerCount} từ đệm ({evaluation.hesitation.fillersDetected.join(", ")})
            </Badge>
          )}
        </div>

        {/* User Said vs Ideal Native Response */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {/* AI Coach Feedback */}
          {evaluation.coachFeedbackVi && (
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" />
                <span>Nhận xét từ AI Coach:</span>
              </div>
              <p className="text-xs md:text-sm text-foreground leading-relaxed font-medium">
                {evaluation.coachFeedbackVi}
              </p>
            </div>
          )}

          {/* User Spoken vs Better Response */}
          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 rounded-xl bg-background border border-border/80 space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Câu bạn vừa nói:
              </span>
              <p className="text-sm font-semibold text-foreground">
                "{evaluation.cleanTranscript || evaluation.userTranscript || "(Không nhận diện được giọng nói)"}"
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Câu phản xạ chuẩn bản ngữ:
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(evaluation.betterResponse)}
                  className="h-6 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 gap-1 rounded-lg"
                >
                  <Volume2 className="size-3" />
                  <span>Nghe câu chuẩn</span>
                </Button>
              </div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                "{evaluation.betterResponse}"
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions Dock */}
        <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-3">
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:bg-muted btn-spring shadow-2xs"
            >
              <RotateCcw className="size-3.5" />
              <span>Nói lại câu này (Space)</span>
            </Button>
          ) : (
            <div />
          )}

          <Button
            type="button"
            onClick={onContinue}
            className="h-10 px-5 rounded-xl text-xs font-bold gap-2 btn-spring shadow-xs"
          >
            <span>Câu tiếp theo (Enter)</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
