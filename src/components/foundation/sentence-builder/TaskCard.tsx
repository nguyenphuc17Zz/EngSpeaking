"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Clock,
  Volume2,
  Lightbulb,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import type { SentenceBuilderTask } from "@/types/sentence-builder";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { toast } from "@/lib/toast";
import { getTopicDisplay } from "@/lib/foundation/sentence-builder/topics";

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
  onRegenerateWithAI?: () => void;
  isRegeneratingAI?: boolean;
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
  isGeneratingNext = false,
  onRegenerateWithAI,
  isRegeneratingAI = false,
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
          label: "LEVEL A // CONTROLLED",
          color: "bg-accent text-accent-foreground border-border",
        };
      case "semi_controlled":
        return {
          label: "LEVEL B // SEMI-FREE",
          color: "bg-[#FFB800] text-[#0D0E0D] border-border",
        };
      case "free":
        return {
          label: "LEVEL C // FREE REFLEX",
          color: "bg-primary text-primary-foreground border-border",
        };
      default:
        return {
          label: "LEVEL A // CONTROLLED",
          color: "bg-accent text-accent-foreground border-border",
        };
    }
  };

  const levelInfo = getLevelBadge(task.controlLevel);

  return (
    <Card className="h-full flex flex-col justify-between rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Top Meta Bar (JapSpeak BuilderTaskCard Style) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b-2 border-border pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="size-2.5 bg-primary border border-border shrink-0" />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground">
              1. ĐỀ BÀI &amp; TỪ KHÓA
            </span>
            <Badge
              variant="outline"
              className={`text-[9px] font-mono font-extrabold px-1.5 py-0 border ${levelInfo.color}`}
            >
              {levelInfo.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {onRegenerateWithAI && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onRegenerateWithAI}
                disabled={isRegeneratingAI || isGeneratingNext}
                className="h-6 px-2 text-[10px] gap-1 text-foreground border-2 border-border bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer font-mono font-extrabold shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                title="Yêu cầu AI tạo câu hoàn toàn mới"
              >
                <Sparkles
                  className={`size-3 text-primary ${isRegeneratingAI ? "animate-spin" : ""}`}
                />
                <span>{isRegeneratingAI ? "ĐANG TẠO..." : "TẠO MỚI AI"}</span>
              </Button>
            )}
            <span className="px-1.5 py-0.5 bg-foreground text-background border border-border text-[10px] font-mono font-extrabold">
              #{currentTaskIndex + 1}/{totalTasks}
            </span>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
          {/* Prompt Section — Crisp #F6F4EC Paper Box with 2px Hard Border */}
          <div className="p-3.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-1.5">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                <Target className="size-3 stroke-[2.5]" />
                <span>{task.instruction}</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-secondary text-foreground border border-border uppercase">
                  {task.source === "ai" ? "AI GEN" : "BANK 70/30"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(task.promptVi, "prompt-vi")}
                  className="text-muted-foreground hover:text-foreground p-1 border border-transparent hover:border-border bg-card cursor-pointer transition-colors"
                  title="Sao chép đề bài tiếng Việt"
                >
                  {copiedId === "prompt-vi" ? (
                    <Check className="size-3 text-[#00A854]" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>
            </div>

            <h2 className="font-serif text-lg sm:text-xl font-extrabold tracking-tight text-foreground leading-snug select-text cursor-text">
              &ldquo;{task.promptVi}&rdquo;
            </h2>
          </div>

          {/* Base Sentence Display with Single-Play TTS Audio */}
          {task.baseSentence && (
            <div className="p-2.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono font-extrabold text-foreground bg-accent px-1.5 py-0.5 border border-border text-[9px] uppercase shrink-0">
                  CÂU GỐC
                </span>
                <span className="font-mono text-foreground font-bold truncate select-text cursor-text">
                  {task.baseSentence}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(task.baseSentence || "", "base-sentence")}
                  className="text-muted-foreground hover:text-foreground p-1 bg-card border border-border cursor-pointer transition-colors"
                  title="Sao chép câu gốc"
                >
                  {copiedId === "base-sentence" ? (
                    <Check className="size-3 text-[#00A854]" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
                {onPlayBaseSentence && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={hasListenedBaseSentence || isSpeakingBaseSentence}
                    onClick={onPlayBaseSentence}
                    className="h-6 text-[10px] font-mono font-extrabold gap-1 px-2 border-2 border-border bg-card hover:bg-accent disabled:opacity-40"
                    title={
                      hasListenedBaseSentence
                        ? "Đã nghe (1 lần)"
                        : "Nghe phát âm câu gốc tiếng Anh"
                    }
                  >
                    <Volume2
                      className={`size-3 ${
                        isSpeakingBaseSentence ? "text-primary animate-pulse" : "text-foreground"
                      }`}
                    />
                    <span>
                      {hasListenedBaseSentence
                        ? "ĐÃ NGHE"
                        : isSpeakingBaseSentence
                        ? "ĐANG ĐỌC..."
                        : "NGHE (1 LẦN)"}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Suggested Vocabulary & Collocations — JapSpeak Split Hardware Chips */}
          {task.suggestedVocabulary && task.suggestedVocabulary.length > 0 && (
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Lightbulb className="size-3.5 text-primary stroke-[2.5]" />
                  <span>TỪ VỰNG &amp; COLLOCATIONS GỢI Ý:</span>
                </span>
                <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase">
                  [CLICK ĐỂ NGHE]
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {task.suggestedVocabulary.map((vocab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayVocab(vocab.term)}
                    className="group inline-flex items-stretch bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] hover:bg-accent hover:text-accent-foreground transition-all text-xs cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    title={`Nghe phát âm "${vocab.term}"`}
                  >
                    <span className="px-1.5 py-1 bg-secondary group-hover:bg-primary group-hover:text-primary-foreground border-r-2 border-border flex items-center justify-center transition-colors">
                      <Volume2 className="size-3 stroke-[2.5]" />
                    </span>
                    <span className="px-2 py-1 flex items-center gap-1.5 font-mono">
                      <strong className="font-extrabold text-foreground group-hover:text-accent-foreground">
                        {vocab.term}
                      </strong>
                      {vocab.meaningVi && (
                        <span className="text-muted-foreground group-hover:text-accent-foreground/80 text-[10px] font-sans font-semibold">
                          ({vocab.meaningVi})
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Prep Timer Bar */}
        <div className="pt-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono font-extrabold uppercase">
          {isCountingDown && prepCountdown !== null ? (
            <div className="flex items-center gap-1.5 text-primary animate-pulse">
              <Clock className="size-3.5" />
              <span>CHUẨN BỊ NÓI: {prepCountdown}S...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-foreground" />
              <span>PREP SLA: {task.prepTimeSec}S</span>
              <span className="text-border">•</span>
              <span className="truncate max-w-[140px]">{getTopicDisplay(task.topic).label}</span>
            </div>
          )}
          <span className="px-1.5 py-0.5 bg-secondary text-foreground border border-border">
            LVL {task.difficulty.overall}/10
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
