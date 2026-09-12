"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Zap,
  Target,
  Flame,
  Volume2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Brain,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type { LatencyTask } from "@/types/latency-training";
import { toast } from "@/lib/toast";

interface LatencyPromptCardProps {
  task: LatencyTask;
  currentTaskIndex: number;
  totalTasks: number;
  isRecording: boolean;
  elapsedMs: number;
  rapidStreak?: number;
  staircaseTargetMs?: number;
  onNextTask?: () => void;
  isGeneratingNext?: boolean;
}

export function LatencyPromptCard({
  task,
  currentTaskIndex,
  totalTasks,
  isRecording,
  elapsedMs,
  rapidStreak = 0,
  staircaseTargetMs,
  onNextTask,
  isGeneratingNext = false,
}: LatencyPromptCardProps) {
  const tts = useBrowserTTS();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const targetMs = staircaseTargetMs ?? task.staircaseTargetMs ?? task.targetLatencyMs ?? 3000;
  const progressPercent = Math.min(100, Math.round((elapsedMs / targetMs) * 100));

  // Dynamic Stopwatch Color Thresholds
  const isSafeGreen = elapsedMs <= targetMs * 0.75;
  const isWarningAmber = elapsedMs > targetMs * 0.75 && elapsedMs <= targetMs;
  const isOverRed = elapsedMs > targetMs;

  const stopwatchColor = isOverRed
    ? "text-red-500"
    : isWarningAmber
    ? "text-amber-500"
    : "text-emerald-500";

  const progressColorClass = isOverRed
    ? "[&>div]:bg-red-500"
    : isWarningAmber
    ? "[&>div]:bg-amber-500"
    : "[&>div]:bg-emerald-500";

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Đã sao chép vào clipboard", text);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {
      toast.error("Không thể sao chép", "Vui lòng bôi đen chuột và nhấn phím Ctrl+C.");
    }
  }, []);

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Top Meta Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              1. Đề bài & Tốc độ
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono px-1.5 py-0 border border-amber-500/30 text-amber-600 dark:text-amber-400 gap-1"
            >
              <Zap className="size-2.5 text-amber-500 fill-amber-500" />
              <span>{(targetMs / 1000).toFixed(1)}s</span>
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {task.category.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {rapidStreak > 0 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-mono text-[9px] font-bold gap-0.5 shadow-2xs py-0 px-1.5">
                <Flame className="size-2.5 fill-white" />
                <span>{rapidStreak}</span>
              </Badge>
            )}
            {onNextTask && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNextTask}
                disabled={isGeneratingNext}
                className="h-6 px-2 rounded-lg text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary gap-1 shrink-0 cursor-pointer shadow-2xs btn-spring"
                title="Đổi sang câu hỏi tiếp theo [R]"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="size-2.5" />
              </Button>
            )}
            <span className="text-[10px] font-mono text-muted-foreground">
              #{currentTaskIndex + 1}/{totalTasks}
            </span>
          </div>
        </div>

        {/* Live Millisecond Stopwatch Gauge */}
        <div className="p-2.5 rounded-2xl bg-card border border-border/80 space-y-1.5 shadow-2xs shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock
                className={`size-3.5 ${
                  isRecording ? "text-amber-500 animate-spin" : "text-muted-foreground"
                }`}
              />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Độ trễ phản xạ thời gian thực:
              </span>
            </div>

            <div className="font-mono text-sm sm:text-base font-bold flex items-baseline gap-1">
              <span className={stopwatchColor}>{(elapsedMs / 1000).toFixed(2)}s</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                / {(targetMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          <Progress
            value={progressPercent}
            className={`h-1.5 rounded-full transition-all ${progressColorClass}`}
          />
        </div>

        {/* Scrollable Container with Zero-scroll ergonomics */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {/* Prompt Section */}
          <div className="p-3 rounded-2xl bg-muted/25 border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Brain className="size-3 text-primary" />
                <span>Tình huống phản xạ tức thì:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(task.promptText, "latency-prompt")}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                  title="Sao chép tình huống"
                >
                  {copiedId === "latency-prompt" ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(task.promptText)}
                  className="h-6 px-1.5 text-[10px] gap-1 rounded-lg text-primary hover:bg-primary/10 transition-all cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="size-3" />
                  <span className="hidden sm:inline">Nghe</span>
                </Button>
              </div>
            </div>

            <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug select-text cursor-text">
              "{task.promptText}"
            </h2>
          </div>

          {/* Target Intent Explanation */}
          {task.targetIntent && (
            <div className="p-2.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Sparkles className="size-3" />
                Mục tiêu phản xạ cần đạt:
              </span>
              <p className="font-medium text-foreground leading-snug select-text cursor-text">
                {task.targetIntent}
              </p>
            </div>
          )}

          {/* Expected Keywords Chips with Audio */}
          {task.expectedKeywords && task.expectedKeywords.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Zap className="size-3 text-amber-500" />
                  Từ khoá trọng tâm:
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">
                  Bấm nghe phát âm
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {task.expectedKeywords.map((kw, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayAudio(kw)}
                    className="group inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-card border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 transition-all text-xs font-semibold text-foreground shadow-2xs cursor-pointer btn-spring"
                    title={`Nghe phát âm "${kw}"`}
                  >
                    <Volume2 className="size-3 text-amber-500 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span>{kw}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Pacing Guide */}
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono">
          <span>Target: &lt;{(targetMs / 1000).toFixed(1)}s</span>
          <span>Phản xạ tự nhiên • Không đóng băng</span>
        </div>
      </CardContent>
    </Card>
  );
}
