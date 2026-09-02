"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Volume2,
  Layers,
  Zap,
  RotateCcw,
  Repeat,
  AlertTriangle,
} from "lucide-react";
import type {
  ChunkChainEvaluationResult,
  ChunkEvaluationResult,
} from "@/types/chunk-automaticity";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface ChunkFeedbackCardProps {
  chainEvaluation?: ChunkChainEvaluationResult | null;
  singleEvaluation?: ChunkEvaluationResult | null;
  onRetry?: () => void;
  onContinue: () => void;
}

export function ChunkFeedbackCard({
  chainEvaluation,
  singleEvaluation,
  onRetry,
  onContinue,
}: ChunkFeedbackCardProps) {
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  if (chainEvaluation) {
    const isGood = chainEvaluation.overallScore >= 75;

    return (
      <Card className="h-full rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col justify-between overflow-hidden animate-in fade-in-0 duration-300">
        <CardContent className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Badge
                className={`font-mono text-xs font-bold px-3 py-1 rounded-full gap-1 ${
                  isGood ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                }`}
              >
                <CheckCircle2 className="size-3.5" />
                <span>Hoàn tất chuỗi: {chainEvaluation.overallScore}/100</span>
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                Khối đã ghép: {chainEvaluation.blocksUsedCount}/{chainEvaluation.totalBlocks}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              <span>Độ trễ: {(chainEvaluation.responseLatencyMs / 1000).toFixed(1)}s</span>
            </div>
          </div>

          {/* User Spoken vs Ideal Model */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Câu bạn vừa nói:
              </span>
              <p className="font-mono text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                "{chainEvaluation.userTranscript}"
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Mẫu ghép nối chuẩn bản ngữ:
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(chainEvaluation.idealCombinedSpeech)}
                  className="size-7 p-0 rounded-full text-primary hover:bg-primary/20"
                  title="Nghe mẫu chuẩn"
                >
                  <Volume2 className="size-3.5" />
                </Button>
              </div>
              <p className="font-mono text-xs sm:text-sm font-bold text-foreground leading-relaxed">
                "{chainEvaluation.idealCombinedSpeech}"
              </p>
            </div>
          </div>

          {/* Block Connection Analysis */}
          {chainEvaluation.detectedBlocks && chainEvaluation.detectedBlocks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Độ chính xác từng khối:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {chainEvaluation.detectedBlocks.map((b, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                      b.isAppropriate
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    <span className="capitalize font-bold">{b.blockType}:</span>
                    <span className="truncate ml-1">{b.usedChunk || "Chưa phát hiện"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coach Advice */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/5 via-card to-background border border-border/60 text-xs space-y-1">
            <span className="font-bold text-foreground">💡 Nhận xét từ AI Coach:</span>
            <p className="text-muted-foreground leading-relaxed text-xs">
              {chainEvaluation.coachFeedbackVi}
            </p>
          </div>
        </CardContent>

        {/* Action Buttons */}
        <div className="p-4 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-3">
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onRetry}
              className="rounded-2xl text-xs font-bold gap-1.5 h-11 px-4 border-border/80 hover:bg-muted"
            >
              <RotateCcw className="size-4" />
              <span>Nói lại</span>
              <kbd className="hidden sm:inline px-1 py-0.5 text-[10px] bg-muted-foreground/15 rounded">
                Space
              </kbd>
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            onClick={onContinue}
            className="flex-1 sm:flex-initial h-11 px-6 rounded-2xl font-bold gap-2 shadow-md shadow-primary/25 btn-spring bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <span>Chuỗi tiếp theo</span>
            <ArrowRight className="size-4" />
            <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-white/20 rounded">
              Enter
            </kbd>
          </Button>
        </div>
      </Card>
    );
  }

  if (singleEvaluation) {
    const isGood = singleEvaluation.overallScore >= 75;

    return (
      <Card className="h-full rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col justify-between overflow-hidden animate-in fade-in-0 duration-300">
        <CardContent className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <Badge
              className={`font-mono text-xs font-bold px-3 py-1 rounded-full gap-1 ${
                isGood ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              <span>Điểm khẩu ngữ: {singleEvaluation.overallScore}/100</span>
            </Badge>

            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              <span>Độ trễ: {(singleEvaluation.retrievalLatencyMs / 1000).toFixed(1)}s</span>
            </div>
          </div>

          {/* User Spoken vs Better Version */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Câu bạn vừa nói:
              </span>
              <p className="font-mono text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                "{singleEvaluation.userTranscript}"
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Mẫu diễn đạt tối ưu:
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(singleEvaluation.betterVersion)}
                  className="size-7 p-0 rounded-full text-primary hover:bg-primary/20"
                  title="Nghe mẫu chuẩn"
                >
                  <Volume2 className="size-3.5" />
                </Button>
              </div>
              <p className="font-mono text-xs sm:text-sm font-bold text-foreground leading-relaxed">
                "{singleEvaluation.betterVersion}"
              </p>
            </div>
          </div>

          {/* Family Variants */}
          {singleEvaluation.alternativeVariants && singleEvaluation.alternativeVariants.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Repeat className="size-3.5" />
                <span>Các biến thể linh hoạt trong cùng Chunk Family:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {singleEvaluation.alternativeVariants.map((v, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="font-mono text-xs bg-card border-amber-500/40 text-foreground px-2 py-0.5"
                  >
                    "{v}"
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Coach Feedback */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 text-xs space-y-1">
            <span className="font-bold text-foreground">💡 Nhận xét:</span>
            <p className="text-muted-foreground leading-relaxed text-xs">
              {singleEvaluation.coachFeedbackVi}
            </p>
          </div>
        </CardContent>

        {/* Action Buttons */}
        <div className="p-4 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-3">
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onRetry}
              className="rounded-2xl text-xs font-bold gap-1.5 h-11 px-4 border-border/80 hover:bg-muted"
            >
              <RotateCcw className="size-4" />
              <span>Luyện lại cụm</span>
              <kbd className="hidden sm:inline px-1 py-0.5 text-[10px] bg-muted-foreground/15 rounded">
                Space
              </kbd>
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            onClick={onContinue}
            className="flex-1 sm:flex-initial h-11 px-6 rounded-2xl font-bold gap-2 btn-spring shadow-md shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <span>Cụm tiếp theo</span>
            <ArrowRight className="size-4" />
            <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-white/20 rounded">
              Enter
            </kbd>
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
