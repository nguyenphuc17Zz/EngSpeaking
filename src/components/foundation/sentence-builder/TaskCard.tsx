"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Target,
  Clock,
  Volume2,
  Lightbulb,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";
import type { SentenceBuilderTask } from "@/types/sentence-builder";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { toast } from "@/lib/toast";

interface TaskCardProps {
  task: SentenceBuilderTask;
  currentTaskIndex: number;
  totalTasks: number;
  prepCountdown: number | null;
  isCountingDown: boolean;
  onOpenHints?: () => void;
  currentHintTier?: number;
  onSelectHintTier?: (tier: 0 | 1 | 2 | 3 | 4) => void;
  hasListenedBaseSentence?: boolean;
  onPlayBaseSentence?: () => void;
  isSpeakingBaseSentence?: boolean;
  onPlayTerm?: (term: string) => void;
  onNextTask?: () => void;
  isGeneratingNext?: boolean;
}

export function TaskCard({
  task,
  currentTaskIndex,
  totalTasks,
  prepCountdown,
  isCountingDown,
  hasListenedBaseSentence = false,
  onPlayBaseSentence,
  isSpeakingBaseSentence = false,
  onPlayTerm,
  onNextTask,
  isGeneratingNext = false,
}: TaskCardProps) {
  const tts = useBrowserTTS();
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handlePlayVocab = (term: string) => {
    if (onPlayTerm) {
      onPlayTerm(term);
    } else {
      tts.speak(sanitizeTextForTTS(term));
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "controlled":
        return {
          label: "Controlled",
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
      case "semi_controlled":
        return {
          label: "Semi-Controlled",
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "free":
        return {
          label: "Control-Free",
          color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        };
      default:
        return {
          label: "Controlled",
          color: "bg-primary/10 text-primary border-primary/30",
        };
    }
  };

  const levelInfo = getLevelBadge(task.controlLevel);

  return (
    <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              1. Đề bài & Từ khóa
            </span>
            <Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0 border ${levelInfo.color}`}>
              {levelInfo.label}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {task.topic.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onNextTask && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNextTask}
                disabled={isGeneratingNext}
                className="h-6 px-2 rounded-lg text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary gap-1 shrink-0 cursor-pointer shadow-2xs btn-spring"
                title="Đổi sang bài tập tiếp theo [R]"
              >
                <span>Bài tiếp theo</span>
                <ArrowRight className="size-2.5" />
              </Button>
            )}
            <span className="text-[10px] font-mono text-muted-foreground">
              #{currentTaskIndex + 1}/{totalTasks}
            </span>
          </div>
        </div>

        {/* Scrollable Container with Zero-scroll ergonomics */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {/* Prompt Section */}
          <div className="p-3 rounded-2xl bg-muted/25 border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Target className="size-3" />
                <span>{task.instruction}</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(task.promptVi, "prompt-vi")}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                title="Sao chép đề bài tiếng Việt"
              >
                {copiedId === "prompt-vi" ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>

            <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug select-text cursor-text">
              "{task.promptVi}"
            </h2>
          </div>

          {/* Base Sentence Display with Single-Play TTS Audio */}
          {task.baseSentence && (
            <div className="p-2.5 rounded-2xl bg-card border border-border/70 text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-muted-foreground text-[10px] uppercase shrink-0">
                  Câu gốc:
                </span>
                <span className="font-mono text-primary font-bold truncate select-text cursor-text">
                  {task.baseSentence}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(task.baseSentence || "", "base-sentence")}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                  title="Sao chép câu gốc"
                >
                  {copiedId === "base-sentence" ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
                {onPlayBaseSentence && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={hasListenedBaseSentence || isSpeakingBaseSentence}
                    onClick={onPlayBaseSentence}
                    className="h-6 text-[10px] rounded-lg font-semibold gap-1 px-2 border border-border/60 hover:bg-primary/10 disabled:opacity-40"
                    title={hasListenedBaseSentence ? "Đã nghe (1 lần)" : "Nghe phát âm câu gốc tiếng Anh"}
                  >
                    <Volume2 className={`size-3 ${isSpeakingBaseSentence ? "text-primary animate-pulse" : "text-foreground"}`} />
                    <span>{hasListenedBaseSentence ? "Đã nghe" : isSpeakingBaseSentence ? "Đang đọc..." : "Nghe (1 lần)"}</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Suggested Vocabulary & Collocations Chips */}
          {task.suggestedVocabulary && task.suggestedVocabulary.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Lightbulb className="size-3 text-amber-500" />
                  Từ vựng & Cụm từ gợi ý (Collocations):
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">
                  Bấm nghe phát âm
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {task.suggestedVocabulary.map((vocab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayVocab(vocab.term)}
                    className="group inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-card border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 transition-all text-xs font-medium text-foreground shadow-2xs cursor-pointer btn-spring"
                    title={`Nghe phát âm "${vocab.term}"`}
                  >
                    <Volume2 className="size-3 text-amber-500 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-bold text-foreground">{vocab.term}</span>
                    {vocab.meaningVi && (
                      <span className="text-muted-foreground text-[10px]">
                        ({vocab.meaningVi})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Prep Timer Bar */}
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono">
          {isCountingDown && prepCountdown !== null ? (
            <div className="flex items-center gap-1 text-primary font-bold animate-pulse">
              <Clock className="size-3" />
              <span>Chuẩn bị nói: {prepCountdown}s...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>Thời gian chuẩn bị: {task.prepTimeSec}s</span>
            </div>
          )}
          <span>Độ khó: {task.difficulty.overall}/10</span>
        </div>
      </CardContent>
    </Card>
  );
}
