"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Sparkles,
  Ban,
  Clock,
  Copy,
  Check,
  Tag,
  Key,
  ArrowRight,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalVocabularyItem,
} from "@/types/survival-speaking";

interface SurvivalPromptCardProps {
  mode: "circumlocution" | "scenarios";
  circumTask: CircumlocutionTask | null;
  scenarioTask: SurvivalScenarioTask | null;
  countdownSeconds: number;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
  onRegenerateAI?: () => void;
  isRegeneratingAI?: boolean;
  onNextTask?: () => void;
  // SB/VN-EN aligned session header
  currentTaskIndex?: number;
  totalTasks?: number;
  prepCountdown?: number | null;
  isCountingDown?: boolean;
  rapidStreak?: number;
}

export function SurvivalPromptCard({
  mode,
  circumTask,
  scenarioTask,
  countdownSeconds,
  onRegenerateAI,
  isRegeneratingAI = false,
  onNextTask,
  currentTaskIndex = 0,
  totalTasks = 0,
  prepCountdown = null,
  isCountingDown = false,
  rapidStreak = 0,
}: SurvivalPromptCardProps) {
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

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  return (
    <Card className="h-full flex flex-col justify-between rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b-2 border-border pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="size-2.5 bg-primary border border-border shrink-0" />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground">
              {mode === "circumlocution" ? "1. CIRCUMLOCUTION GYM" : "1. SURVIVAL SCENARIO"}
            </span>
            <Badge
              variant="outline"
              className="text-[9px] font-mono font-extrabold px-1.5 py-0 border bg-accent text-accent-foreground border-border uppercase truncate max-w-[140px]"
            >
              {mode === "circumlocution" ? circumTask?.category : scenarioTask?.contextTitleVi}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {onRegenerateAI && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onRegenerateAI}
                disabled={isRegeneratingAI}
                className="h-6 px-2 text-[10px] gap-1 text-foreground border-2 border-border bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer font-mono font-extrabold shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                title="Tạo thử thách mới bằng AI"
              >
                <Sparkles className={cn("size-3 text-primary", isRegeneratingAI && "animate-spin")} />
                <span>{isRegeneratingAI ? "ĐANG TẠO..." : "TẠO MỚI AI"}</span>
              </Button>
            )}
            <span className="px-1.5 py-0.5 bg-foreground text-background border border-border text-[10px] font-mono font-extrabold">
              #{currentTaskIndex + 1}
              {totalTasks > 0 ? `/${totalTasks}` : ""}
            </span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary text-primary-foreground border border-border text-[10px] font-mono font-extrabold">
              <Clock className="size-3" />
              <span>{countdownSeconds}S</span>
            </div>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3">
          {mode === "circumlocution" && circumTask && (
            <div className="space-y-3">
              {/* Target Word Main Prompt Box */}
              <div className="p-3.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-1.5">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                    <ShieldAlert className="size-3 stroke-[2.5]" />
                    <span>MÔ TẢ KHÁI NIỆM (KHÔNG NÓI TỪ MỤC TIÊU)</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-secondary text-foreground border border-border uppercase">
                      {circumTask.source === "ai" ? "AI GEN" : "BANK 70/30"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(circumTask.targetWord, "target-word")}
                      className="text-muted-foreground hover:text-foreground p-1 border border-transparent hover:border-border bg-card cursor-pointer transition-colors"
                      title="Sao chép từ mục tiêu"
                    >
                      {copiedId === "target-word" ? (
                        <Check className="size-3 text-[#00A854]" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="py-1 text-center space-y-1">
                  <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground select-text cursor-text">
                    &ldquo;{circumTask.targetWord}&rdquo;
                  </h2>
                  <p className="text-xs font-mono font-bold text-muted-foreground">
                    (Ý NGHĨA: <span className="text-foreground">{circumTask.vietnameseMeaning}</span>)
                  </p>
                </div>
              </div>

              {/* Forbidden Words Banner */}
              <div className="p-2.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase text-destructive border-b border-dashed border-border pb-1">
                  <Ban className="size-3.5 shrink-0 stroke-[2.5]" />
                  <span>TỪ CẤM NÓI (TABOO WORDS):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {circumTask.forbiddenWords.map((w, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-destructive text-destructive-foreground border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] font-mono font-extrabold text-[11px]"
                    >
                      &ldquo;{w}&rdquo;
                    </span>
                  ))}
                </div>
              </div>

              {/* Semantic Anchors (if available) */}
              {circumTask.semanticKeyAnchors && circumTask.semanticKeyAnchors.length > 0 && (
                <div className="p-2.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold text-foreground uppercase tracking-wider border-b border-dashed border-border pb-1">
                    <Key className="size-3 text-primary stroke-[2.5]" />
                    <span>Ý TƯỞNG TỪ KHÓA (KEY ANCHORS):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {circumTask.semanticKeyAnchors.map((anchor, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] text-[11px] font-mono font-extrabold text-foreground"
                      >
                        {anchor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Vocabulary / Circumlocution Connectors */}
              {circumTask.suggestedVocabulary && circumTask.suggestedVocabulary.length > 0 && (
                <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
                  <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                    <span className="text-[10px] font-mono font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary stroke-[2.5]" />
                      <span>CỤM TỪ DIỄN GIẢI GỢI Ý:</span>
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase">
                      [CLICK ĐỂ NGHE]
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {circumTask.suggestedVocabulary.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePlayAudio(item.term)}
                        className="group inline-flex items-stretch bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] hover:bg-accent hover:text-accent-foreground transition-all text-xs cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                        title={`Nghe phát âm "${item.term}"`}
                      >
                        <span className="px-1.5 py-1 bg-secondary group-hover:bg-primary group-hover:text-primary-foreground border-r-2 border-border flex items-center justify-center transition-colors">
                          <Volume2 className="size-3 stroke-[2.5]" />
                        </span>
                        <span className="px-2 py-1 flex items-center gap-1.5 font-mono">
                          <strong className="font-extrabold text-foreground group-hover:text-accent-foreground">
                            {item.term}
                          </strong>
                          {item.meaningVi && (
                            <span className="text-[10px] text-muted-foreground group-hover:text-accent-foreground/80 font-sans font-semibold">
                              ({item.meaningVi})
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "scenarios" && scenarioTask && (
            <div className="space-y-3">
              {/* Problem Situation Description */}
              <div className="p-3.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-1.5">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                    <AlertTriangle className="size-3 stroke-[2.5]" />
                    <span>SỰ CỐ GIAO TIẾP THỰC TẾ:</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-secondary text-foreground border border-border uppercase">
                      {scenarioTask.source === "ai" ? "AI GEN" : "BANK 70/30"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(scenarioTask.problemDescriptionVi, "scenario-desc")}
                      className="text-muted-foreground hover:text-foreground p-1 border border-transparent hover:border-border bg-card cursor-pointer transition-colors"
                      title="Sao chép tình huống"
                    >
                      {copiedId === "scenario-desc" ? (
                        <Check className="size-3 text-[#00A854]" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>
                <h2 className="font-serif text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-snug select-text cursor-text">
                  {scenarioTask.problemDescriptionVi}
                </h2>
              </div>

              {/* Incoming Dialogue Audio Prompt */}
              <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
                <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                  <span className="text-[10px] uppercase font-mono font-extrabold text-foreground">
                    CÂU ĐỐI PHƯƠNG VỪA NÓI:
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(scenarioTask.audioPromptText, "dialog-prompt")}
                      className="text-muted-foreground hover:text-foreground p-1 bg-card border border-border cursor-pointer transition-colors"
                      title="Sao chép câu đối phương nói"
                    >
                      {copiedId === "dialog-prompt" ? (
                        <Check className="size-3 text-[#00A854]" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayAudio(scenarioTask.audioPromptText)}
                      className="h-6 px-2 text-[10px] font-mono font-extrabold gap-1 border-2 border-border bg-card hover:bg-accent"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="size-3" />
                      <span>NGHE</span>
                    </Button>
                  </div>
                </div>
                <p className="font-serif text-base sm:text-lg font-extrabold text-foreground leading-snug select-text cursor-text">
                  &ldquo;{scenarioTask.audioPromptText}&rdquo;
                </p>
              </div>

              {/* Survival Phrases Chips Bar */}
              <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
                <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                  <span className="text-[10px] font-mono font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary stroke-[2.5]" />
                    <span>CỤM TỪ CỨU CÁNH ĐỀ XUẤT:</span>
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase">
                    [CLICK ĐỂ NGHE]
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    scenarioTask.suggestedVocabulary ||
                    scenarioTask.suggestedRepairPhrases.map((p) => ({ term: p, meaningVi: "" }))
                  ).map((item: SurvivalVocabularyItem, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePlayAudio(item.term)}
                      className="group inline-flex items-stretch bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] hover:bg-accent hover:text-accent-foreground transition-all text-xs cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      title={`Nghe phát âm "${item.term}"`}
                    >
                      <span className="px-1.5 py-1 bg-secondary group-hover:bg-primary group-hover:text-primary-foreground border-r-2 border-border flex items-center justify-center transition-colors">
                        <Volume2 className="size-3 stroke-[2.5]" />
                      </span>
                      <span className="px-2 py-1 flex items-center gap-1.5 font-mono">
                        <strong className="font-extrabold text-foreground group-hover:text-accent-foreground">
                          {item.term}
                        </strong>
                        {item.meaningVi && (
                          <span className="text-[10px] text-muted-foreground group-hover:text-accent-foreground/80 font-sans font-semibold">
                            ({item.meaningVi})
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom prep timer bar (SB/VN-EN aligned) */}
        <div className="pt-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono font-extrabold uppercase">
          {isCountingDown && prepCountdown !== null ? (
            <div className="flex items-center gap-1.5 text-primary animate-pulse">
              <Clock className="size-3.5" />
              <span>CHUẨN BỊ NÓI: {prepCountdown}S...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-foreground" />
              <span>
                PREP SLA:{" "}
                {mode === "circumlocution"
                  ? (circumTask?.prepTimeSec ?? 2.5)
                  : (scenarioTask?.prepTimeSec ?? 2.0)}
                S
              </span>
              <span className="text-border">•</span>
              <span className="truncate max-w-[140px]">
                {(mode === "circumlocution" ? circumTask?.topic : scenarioTask?.topic) ||
                  "SURVIVAL"}
              </span>
            </div>
          )}
          <span className="px-1.5 py-0.5 bg-secondary text-foreground border border-border">
            LVL{" "}
            {mode === "circumlocution"
              ? (circumTask?.difficultyOverall ?? 5)
              : (scenarioTask?.difficultyOverall ?? 5)}
            /10
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
