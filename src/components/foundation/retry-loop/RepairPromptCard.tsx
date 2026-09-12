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
}

export function RepairPromptCard({ session }: Props) {
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
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px] border border-amber-500/30 flex items-center gap-1">
              <RotateCcw className="size-3" />
              <span>Lần sửa #{session.currentAttemptNumber}</span>
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border/60"
            >
              Ưu tiên P{correction.priority}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {correction.errorType}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground hidden sm:inline-flex">
              {session.sourceContext === "retry_lab" ? "AI Challenge" : "Error Bank"}
            </Badge>
          </div>
        </div>

        {/* Scrollable Middle Body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
          {/* Situation & Target Intent in Vietnamese */}
          <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Target className="size-3 text-amber-500" />
                <span>Tình huống & Ý định cần nói đúng:</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(session.originalPrompt, "prompt-situation")}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                title="Sao chép tình huống"
              >
                {copiedId === "prompt-situation" ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-foreground leading-snug select-text cursor-text">
              {session.originalPrompt}
            </h2>
          </div>

          {/* Conversational Trap / Partner Echo Simulation */}
          {correction.conversationalTrap && (
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-1.5 animate-in fade-in-0 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-indigo-500" />
                  Đối tác hỏi lại (Conversational Echo):
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
                    className="text-indigo-600 dark:text-indigo-400 hover:text-foreground p-1 rounded-md hover:bg-indigo-500/20 cursor-pointer transition-colors"
                    title="Sao chép câu đối tác"
                  >
                    {copiedId === "partner-utterance" ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handlePlayAudio(correction.conversationalTrap!.partnerUtterance)
                    }
                    className="h-6 px-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 gap-1 rounded-lg"
                    title="Nghe câu hỏi của đối tác"
                  >
                    <Volume2 className="size-3" />
                    <span className="hidden sm:inline">Nghe</span>
                  </Button>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-foreground italic select-text cursor-text">
                "{correction.conversationalTrap.partnerUtterance}"
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-500/15 text-[11px] text-muted-foreground">
                <span>💡 {correction.conversationalTrap.reactionPromptVi}</span>
                {correction.conversationalTrap.suggestedStarter && (
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                    (Gợi ý mở đầu: "{correction.conversationalTrap.suggestedStarter}")
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Erroneous Spoken Sentence Display Box */}
          <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                <span>Câu nói có lỗi (Cần sửa lại):</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy(session.originalTranscript, "error-sentence")}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-red-500/10 cursor-pointer transition-colors"
                  title="Sao chép câu có lỗi"
                >
                  {copiedId === "error-sentence" ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(session.originalTranscript)}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-red-500 gap-1 rounded-lg"
                  title="Nghe câu có lỗi"
                >
                  <Volume2 className="size-3" />
                  <span className="hidden sm:inline">Nghe lỗi</span>
                </Button>
              </div>
            </div>

            <div className="text-xs sm:text-sm font-mono text-foreground leading-relaxed select-text cursor-text">
              "{session.originalTranscript}"
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-500/10 text-xs">
              <span className="font-bold text-red-500 flex items-center gap-1">
                <span>⚠️ Trọng tâm sửa:</span>
                <span className="underline decoration-red-500/60 font-mono font-bold">
                  {correction.whatToFix}
                </span>
              </span>
            </div>
          </div>

          {/* Suggested Vocabulary & Replacement Chips Bar */}
          {correction.suggestedVocabulary && correction.suggestedVocabulary.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lightbulb className="size-3 text-amber-500" />
                  <span>Cụm từ gợi ý (Collocations):</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Bấm nghe</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {correction.suggestedVocabulary.map((vocab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayAudio(vocab.term)}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-card border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 transition-all text-xs font-medium text-foreground shadow-2xs cursor-pointer btn-spring"
                    title={`Nghe: "${vocab.term}"`}
                  >
                    <Volume2 className="size-3 text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold font-mono text-amber-600 dark:text-amber-400">
                      {vocab.term}
                    </span>
                    {vocab.meaningVi && (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({vocab.meaningVi})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
