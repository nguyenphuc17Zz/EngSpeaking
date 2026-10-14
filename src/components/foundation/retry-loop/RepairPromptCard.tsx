"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Volume2,
  Lightbulb,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Target,
  Layers,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { toast } from "@/lib/toast";
import type { RetrySession } from "@/types/retry-loop";

interface Props {
  session: RetrySession;
  currentHintTier?: number;
  onSelectHintTier?: (tier: number) => void;
  attemptIndex?: number;
  totalAttempts?: number;
  onRegenerateWithAI?: () => void;
  isRegeneratingAI?: boolean;
}

export function RepairPromptCard({
  session,
  attemptIndex = 0,
  totalAttempts = 10,
  onRegenerateWithAI,
  isRegeneratingAI = false,
}: Props) {
  const tts = useBrowserTTS();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const correction = session.targetCorrection;

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
              1. ĐỀ BÀI &amp; CÂU CẦN SỬA
            </span>
            <Badge
              variant="outline"
              className="text-[9px] font-mono font-extrabold px-1.5 py-0 border bg-accent text-accent-foreground border-border uppercase"
            >
              {correction.errorType} // P{correction.priority}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {onRegenerateWithAI && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onRegenerateWithAI}
                disabled={isRegeneratingAI}
                className="h-6 px-2 text-[10px] gap-1 text-foreground border-2 border-border bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer font-mono font-extrabold shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                title="Yêu cầu AI tạo câu sửa lỗi hoàn toàn mới"
              >
                <Sparkles
                  className={`size-3 text-primary ${isRegeneratingAI ? "animate-spin" : ""}`}
                />
                <span>{isRegeneratingAI ? "ĐANG TẠO..." : "TẠO MỚI AI"}</span>
              </Button>
            )}
            <span className="px-1.5 py-0.5 bg-foreground text-background border border-border text-[10px] font-mono font-extrabold">
              #{attemptIndex + 1}/{totalAttempts}
            </span>
          </div>
        </div>

        {/* Scrollable Middle Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3">
          {/* Situation & Target Intent in Vietnamese — Crisp #F6F4EC Paper Box */}
          <div className="p-3.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-1.5">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                <Target className="size-3 stroke-[2.5]" />
                <span>TÌNH HUỐNG &amp; Ý ĐỊNH CẦN NÓI ĐÚNG:</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-secondary text-foreground border border-border uppercase">
                  {session.source === "bank" ? "BANK 70/30" : "AI GEN"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(session.originalPrompt, "prompt-situation")}
                  className="text-muted-foreground hover:text-foreground p-1 border border-transparent hover:border-border bg-card cursor-pointer transition-colors"
                  title="Sao chép tình huống"
                >
                  {copiedId === "prompt-situation" ? (
                    <Check className="size-3 text-[#00A854]" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
              </div>
            </div>
            <h2 className="font-serif text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-snug select-text cursor-text">
              &ldquo;{session.originalPrompt}&rdquo;
            </h2>
          </div>

          {/* Conversational Trap / Partner Echo Simulation */}
          {correction.conversationalTrap && (
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  <span>ĐỐI TÁC HỎI LẠI (CONVERSATIONAL ECHO):</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        correction.conversationalTrap!.partnerUtterance,
                        "partner-utterance"
                      )
                    }
                    className="text-muted-foreground hover:text-foreground p-1 bg-card border border-border cursor-pointer transition-colors"
                    title="Sao chép câu đối tác"
                  >
                    {copiedId === "partner-utterance" ? (
                      <Check className="size-3 text-[#00A854]" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handlePlayAudio(correction.conversationalTrap!.partnerUtterance)
                    }
                    className="h-6 px-2 text-[10px] font-mono font-extrabold bg-card border border-border hover:bg-accent gap-1"
                    title="Nghe câu hỏi của đối tác"
                  >
                    <Volume2 className="size-3" />
                    <span className="hidden sm:inline">NGHE</span>
                  </Button>
                </div>
              </div>

              <p className="font-serif text-sm font-extrabold text-foreground italic select-text cursor-text">
                &ldquo;{correction.conversationalTrap.partnerUtterance}&rdquo;
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed border-border text-[11px] font-mono text-muted-foreground">
                <span>💡 {correction.conversationalTrap.reactionPromptVi}</span>
                {correction.conversationalTrap.suggestedStarter && (
                  <span className="text-primary font-extrabold">
                    (Gợi ý mở đầu: &ldquo;{correction.conversationalTrap.suggestedStarter}&rdquo;)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Erroneous Spoken Sentence Display Box */}
          <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
            <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-destructive flex items-center gap-1">
                <AlertTriangle className="size-3 stroke-[2.5]" />
                <span>CÂU NÓI CÓ LỖI (CẦN SỬA LẠI):</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(session.originalTranscript, "error-sentence")}
                  className="text-muted-foreground hover:text-foreground p-1 bg-card border border-border cursor-pointer transition-colors"
                  title="Sao chép câu có lỗi"
                >
                  {copiedId === "error-sentence" ? (
                    <Check className="size-3 text-[#00A854]" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlayAudio(session.originalTranscript)}
                  className="h-6 px-2 text-[10px] font-mono font-extrabold bg-card border border-border hover:bg-accent gap-1"
                  title="Nghe câu có lỗi"
                >
                  <Volume2 className="size-3" />
                  <span className="hidden sm:inline">NGHE LỖI</span>
                </Button>
              </div>
            </div>

            <div className="font-serif text-sm sm:text-base font-extrabold text-foreground leading-relaxed select-text cursor-text">
              &ldquo;{session.originalTranscript}&rdquo;
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed border-border text-xs font-mono">
              <span className="font-extrabold text-destructive flex items-center gap-1">
                <span>⚠️ TRỌNG TÂM SỬA:</span>
                <span className="underline decoration-destructive font-extrabold">
                  {correction.whatToFix}
                </span>
              </span>
            </div>
          </div>

          {/* Suggested Vocabulary & Replacement Chips Bar — JapSpeak Split Hardware Chips */}
          {correction.suggestedVocabulary && correction.suggestedVocabulary.length > 0 && (
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Lightbulb className="size-3.5 text-primary stroke-[2.5]" />
                  <span>CỤM TỪ GỢI Ý (COLLOCATIONS):</span>
                </span>
                <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase">
                  [CLICK ĐỂ NGHE]
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {correction.suggestedVocabulary.map((vocab, idx) => (
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="pt-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono font-extrabold uppercase">
          <div className="flex items-center gap-1.5">
            <RotateCcw className="size-3.5 text-primary" />
            <span>LẦN SỬA #{session.currentAttemptNumber}</span>
          </div>
          <span className="px-1.5 py-0.5 bg-secondary text-foreground border border-border">
            PRIORITY P{correction.priority}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
