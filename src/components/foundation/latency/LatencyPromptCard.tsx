"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Zap,
  Target,
  Flame,
  Sparkles,
  Volume2,
  Lightbulb,
  X,
  Layers,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type { LatencyTask } from "@/types/latency-training";

interface LatencyPromptCardProps {
  task: LatencyTask;
  currentTaskIndex: number;
  totalTasks: number;
  isRecording: boolean;
  elapsedMs: number;
  rapidStreak?: number;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
}

export function LatencyPromptCard({
  task,
  currentTaskIndex,
  totalTasks,
  isRecording,
  elapsedMs,
  rapidStreak = 0,
  currentHintTier,
  onSelectHintTier,
}: LatencyPromptCardProps) {
  const tts = useBrowserTTS();
  const targetMs = task.targetLatencyMs || 3000;
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

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  // Build 4-Tier hints
  const hints = task.hints && task.hints.length > 0
    ? task.hints
    : [
        { tier: 0, title: "Không gợi ý", content: "Tự bật câu trả lời ngay lập tức." },
        {
          tier: 1,
          title: "Từ khoá cốt lõi",
          content: task.expectedKeywords?.join(" / ") || "Tập trung vào ý chính",
        },
        {
          tier: 2,
          title: "Cụm từ đệm mở đầu",
          content: task.bufferPhraseSuggestion || "Well, to be honest...",
        },
        {
          tier: 3,
          title: "Khung câu",
          content: `${task.bufferPhraseSuggestion || "Well,"} I usually ______ .`,
        },
        {
          tier: 4,
          title: "Câu mẫu hoàn chỉnh",
          content: task.sampleResponses?.[0] || "Sample response...",
        },
      ];

  const activeHint = currentHintTier > 0 ? hints.find((h) => h.tier === currentHintTier) : null;

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-muted font-mono font-bold text-xs text-foreground">
              Câu {currentTaskIndex + 1} / {totalTasks}
            </span>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-600 dark:text-amber-400"
            >
              Mục tiêu: {(targetMs / 1000).toFixed(1)}s
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {rapidStreak > 0 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-mono text-[10px] font-bold gap-1 shadow-xs animate-pulse py-0.5">
                <Flame className="size-3 fill-white" />
                <span>Streak: {rapidStreak}</span>
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {task.category.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        {/* Live Millisecond Stopwatch Gauge */}
        <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock
                className={`size-4 ${
                  isRecording ? "text-amber-500 animate-spin" : "text-muted-foreground"
                }`}
              />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Độ trễ phản xạ thời gian thực:
              </span>
            </div>

            <div className="font-mono text-base md:text-lg font-bold flex items-baseline gap-1">
              <span className={stopwatchColor}>{(elapsedMs / 1000).toFixed(2)}s</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                / {(targetMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          <Progress
            value={progressPercent}
            className={`h-2 rounded-full transition-all ${progressColorClass}`}
          />
        </div>

        {/* Prompt Heading & Intent Section */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Target className="size-3.5 text-primary" />
                <span>Hãy phản xạ và nói ngay bằng tiếng Anh:</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlayAudio(task.promptText)}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                title="Nghe câu hỏi"
              >
                <Volume2 className="size-3" />
                <span>Nghe câu hỏi</span>
              </Button>
            </div>

            <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug">
              "{task.promptText}"
            </h2>
            {task.targetIntent && (
              <p className="text-xs text-muted-foreground">{task.targetIntent}</p>
            )}
          </div>

          {/* Buffer Phrases & Reaction Vocabulary Chips Bar */}
          {task.suggestedVocabulary && task.suggestedVocabulary.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 mt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lightbulb className="size-3 text-amber-500" />
                  Cụm từ đệm mở đầu (Buffer Chunks):
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Bấm nghe phát âm</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {task.suggestedVocabulary.map((vocab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayAudio(vocab.term)}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-background border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 transition-all text-xs font-medium text-foreground shadow-2xs cursor-pointer btn-spring"
                    title={`Nghe: "${vocab.term}"`}
                  >
                    <Volume2 className="size-3 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold font-mono text-amber-600 dark:text-amber-400">
                      {vocab.term}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      ({vocab.meaningVi})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Inline Hint View (Revealed when tier > 0) */}
          {activeHint && (
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                  <Sparkles className="size-3.5" />
                  <span>{activeHint.title}</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono px-1 py-0 h-4 border-primary/40 text-primary"
                  >
                    Tầng {activeHint.tier}/4
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectHintTier(0)}
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                >
                  <X className="size-3" />
                  <span>Thu gọn (Esc)</span>
                </Button>
              </div>

              <div className="text-xs md:text-sm font-mono text-foreground leading-relaxed bg-background/80 p-2.5 rounded-xl border border-border/40">
                {activeHint.content}
              </div>

              {(activeHint.tier === 2 || activeHint.tier === 3 || activeHint.tier === 4) && (
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(activeHint.content)}
                    className="h-7 text-xs gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 btn-spring"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe phát âm chuẩn</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4-Tier Inline Stepper Buttons (Zero Popup) */}
        <div className="pt-2 border-t border-border/40 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span className="font-semibold flex items-center gap-1">
              <Layers className="size-3 text-primary" />
              <span>Gợi ý phản xạ nấc thang:</span>
            </span>
            <span className="font-mono text-[10px]">Phím 'H' để đổi tầng</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { tier: 1, label: "T1: Từ khoá", desc: "Cốt lõi" },
              { tier: 2, label: "T2: Cụm đệm", desc: "Mở đầu" },
              { tier: 3, label: "T3: Khung câu", desc: "Điền chỗ" },
              { tier: 4, label: "T4: Câu mẫu", desc: "Hoàn chỉnh" },
            ].map((btn) => {
              const isActive = currentHintTier === btn.tier;
              return (
                <Button
                  key={btn.tier}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelectHintTier(isActive ? 0 : btn.tier)}
                  className={`h-9 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0 transition-all btn-spring shadow-2xs ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                      : "border-border/80 hover:border-primary/40 hover:bg-primary/5 text-foreground"
                  }`}
                  title={`${btn.label} - ${btn.desc}`}
                >
                  <span className="font-bold text-[11px] leading-tight">{btn.label}</span>
                  <span className="text-[9px] font-normal opacity-80 leading-none">{btn.desc}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
