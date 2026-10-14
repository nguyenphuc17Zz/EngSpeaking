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
  RotateCcw,
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
  isRecording?: boolean;
  elapsedMs?: number;
  rapidStreak?: number;
  staircaseTargetMs?: number;
  onNextTask?: () => void;
  isGeneratingNext?: boolean;
  onRegenerateWithAI?: () => void;
  isRegeneratingAI?: boolean;
}

export function LatencyPromptCard({
  task,
  currentTaskIndex,
  totalTasks,
  rapidStreak = 0,
  staircaseTargetMs,
  onNextTask,
  isGeneratingNext = false,
  onRegenerateWithAI,
  isRegeneratingAI = false,
}: LatencyPromptCardProps) {
  const tts = useBrowserTTS();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const targetMs = staircaseTargetMs ?? task.staircaseTargetMs ?? task.targetLatencyMs ?? 3000;

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
    <Card className="h-full flex flex-col justify-between rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Top Meta Header (JapSpeak BuilderTaskCard Style) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b-2 border-border pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="size-2.5 bg-primary border border-border shrink-0" />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground">
              1. ĐỀ BÀI &amp; TỐC ĐỘ
            </span>
            <Badge
              variant="outline"
              className="text-[9px] font-mono font-extrabold px-1.5 py-0 border bg-accent text-accent-foreground border-border gap-1"
            >
              <Zap className="size-2.5 text-primary fill-primary" />
              <span>{(targetMs / 1000).toFixed(1)}S SLA</span>
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {rapidStreak > 0 && (
              <span className="px-1.5 py-0.5 bg-[#FFB800] text-[#0D0E0D] border border-border font-mono text-[10px] font-extrabold inline-flex items-center gap-0.5">
                <Flame className="size-2.5 fill-current" />
                <span>{rapidStreak}</span>
              </span>
            )}
            {onRegenerateWithAI && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onRegenerateWithAI}
                disabled={isRegeneratingAI || isGeneratingNext}
                className="h-6 px-2 text-[10px] gap-1 text-foreground border-2 border-border bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer font-mono font-extrabold shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                title="Yêu cầu AI tạo câu hỏi phản xạ hoàn toàn mới"
              >
                <Sparkles
                  className={`size-3 text-primary ${isRegeneratingAI ? "animate-spin" : ""}`}
                />
                <span>{isRegeneratingAI ? "ĐANG TẠO..." : "TẠO MỚI AI"}</span>
              </Button>
            )}
            <span className="px-1.5 py-0.5 bg-foreground text-background border border-border text-[10px] font-mono font-extrabold">
              #{currentTaskIndex + 1}/{totalTasks > 0 ? totalTasks : 10}
            </span>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
          {/* Prompt Section — Crisp #F6F4EC Paper Box with 2px Hard Border */}
          <div className="p-3.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-1.5">
              <span className="text-[10px] font-mono uppercase font-extrabold text-primary tracking-wider flex items-center gap-1.5">
                <Brain className="size-3.5 text-primary stroke-[2.5]" />
                <span>TÌNH HUỐNG PHẢN XẠ TỨC THÌ:</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-secondary text-foreground border border-border uppercase">
                  {task.source === "ai" ? "AI GEN" : "BANK 70/30"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(task.promptText, "latency-prompt")}
                  className="text-muted-foreground hover:text-foreground p-1 border border-transparent hover:border-border bg-card cursor-pointer transition-colors"
                  title="Sao chép tình huống"
                >
                  {copiedId === "latency-prompt" ? (
                    <Check className="size-3 text-[#00A854]" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => handlePlayAudio(task.promptText)}
                  className="h-6 px-2 text-[10px] font-mono font-extrabold gap-1 text-foreground bg-card border border-border hover:bg-accent cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="size-3 text-primary" />
                  <span className="hidden sm:inline">NGHE</span>
                </Button>
              </div>
            </div>

            <h2 className="font-serif text-lg sm:text-xl font-extrabold tracking-tight text-foreground leading-snug select-text cursor-text">
              &ldquo;{task.promptText}&rdquo;
            </h2>
          </div>

          {/* Target Intent Explanation */}
          {task.targetIntent && (
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1 text-xs">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                <Sparkles className="size-3 stroke-[2.5]" />
                <span>MỤC TIÊU PHẢN XẠ CẦN ĐẠT:</span>
              </span>
              <p className="font-mono font-bold text-foreground leading-snug select-text cursor-text">
                {task.targetIntent}
              </p>
            </div>
          )}

          {/* Expected Keywords / Suggested Vocabulary — JapSpeak Split Hardware Chips */}
          {(task.suggestedVocabulary && task.suggestedVocabulary.length > 0) ||
          (task.expectedKeywords && task.expectedKeywords.length > 0) ? (
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Zap className="size-3.5 text-primary fill-primary" />
                  <span>TỪ KHOÁ &amp; CỤM TỪ TRỌNG TÂM:</span>
                </span>
                <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase">
                  [CLICK ĐỂ NGHE]
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {task.suggestedVocabulary && task.suggestedVocabulary.length > 0
                  ? task.suggestedVocabulary.map((vocab, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePlayAudio(vocab.term)}
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
                    ))
                  : task.expectedKeywords.map((kw, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePlayAudio(kw)}
                        className="group inline-flex items-stretch bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] hover:bg-accent hover:text-accent-foreground transition-all text-xs cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                        title={`Nghe phát âm "${kw}"`}
                      >
                        <span className="px-1.5 py-1 bg-secondary group-hover:bg-primary group-hover:text-primary-foreground border-r-2 border-border flex items-center justify-center transition-colors">
                          <Volume2 className="size-3 stroke-[2.5]" />
                        </span>
                        <span className="px-2 py-1 flex items-center gap-1.5 font-mono">
                          <strong className="font-extrabold text-foreground group-hover:text-accent-foreground">
                            {kw}
                          </strong>
                        </span>
                      </button>
                    ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Card Footer: Pacing Info */}
        <div className="pt-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono font-extrabold uppercase">
          <div className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary fill-primary" />
            <span>MỤC TIÊU SLA: &lt;{(targetMs / 1000).toFixed(1)}S</span>
            <span className="text-border">•</span>
            <span className="truncate max-w-[140px]">
              {(task.topic || task.category).replace(/_/g, " ")}
            </span>
          </div>
          <span className="px-1.5 py-0.5 bg-secondary text-foreground border border-border">
            BLITZ DRILL
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
