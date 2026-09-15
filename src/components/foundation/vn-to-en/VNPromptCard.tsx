"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Flame,
  Zap,
  Target,
  Volume2,
  Lightbulb,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { VNToENTask } from "@/types/vn-to-en";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { toast } from "@/lib/toast";

interface VNPromptCardProps {
  task: VNToENTask;
  currentTaskIndex: number;
  totalTasks: number;
  prepCountdown: number | null;
  isCountingDown: boolean;
  rapidStreak?: number;
  onPlayTerm?: (term: string) => void;
  onNextTask?: () => void;
  isGeneratingNext?: boolean;
  onRegenerateWithAI?: () => void;
  isRegeneratingAI?: boolean;
}

export function VNPromptCard({
  task,
  currentTaskIndex,
  totalTasks,
  prepCountdown,
  isCountingDown,
  rapidStreak = 0,
  onPlayTerm,
  onNextTask,
  isGeneratingNext = false,
  onRegenerateWithAI,
  isRegeneratingAI = false,
}: VNPromptCardProps) {
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

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "rapid_fire":
        return {
          label: "Rapid Fire (<2s)",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "timed":
        return {
          label: "Timed Retrieval",
          color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        };
      default:
        return {
          label: "Direct Retrieval",
          color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
    }
  };

  const modeInfo = getModeBadge(task.retrievalMode);

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              1. Câu khẩu ngữ gốc
            </span>
            <Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0 border ${modeInfo.color}`}>
              {modeInfo.label}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {task.category.replace(/_/g, " ")}
            </Badge>

            {task.source === "ai" ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 font-normal">
                <Sparkles className="size-2.5 text-emerald-500" />
                AI Generated
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 gap-1 font-normal">
                Từ ngân hàng
              </Badge>
            )}

            {onRegenerateWithAI && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onRegenerateWithAI}
                disabled={isRegeneratingAI || isGeneratingNext}
                className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/80 cursor-pointer"
                title="Yêu cầu AI tạo câu khẩu ngữ hoàn toàn mới"
              >
                <Sparkles className={`size-2.5 text-emerald-500 ${isRegeneratingAI ? "animate-spin" : ""}`} />
                <span>{isRegeneratingAI ? "Đang tạo..." : "Tạo mới bằng AI"}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {task.isRapidFire && rapidStreak > 0 && (
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

        {/* Scrollable Container with Zero-scroll ergonomics */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {/* Vietnamese Prompt Section */}
          <div className="p-3 rounded-2xl bg-muted/25 border border-border/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Target className="size-3" />
                <span>Hãy bật câu này sang tiếng Anh:</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(task.promptVi, "vn-prompt")}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                title="Sao chép câu tiếng Việt"
              >
                {copiedId === "vn-prompt" ? (
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
              <span>Bật phản xạ tức thì</span>
            </div>
          )}
          <span>Độ khó: {task.difficulty.overall}/10</span>
        </div>
      </CardContent>
    </Card>
  );
}
