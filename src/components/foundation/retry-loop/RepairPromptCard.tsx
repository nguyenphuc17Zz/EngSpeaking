"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Volume2,
  Lightbulb,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type { RetrySession, TargetedCorrection } from "@/types/retry-loop";

interface Props {
  session: RetrySession;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
  attemptIndex?: number;
  totalAttempts?: number;
}

export function RepairPromptCard({
  session,
  currentHintTier,
  onSelectHintTier,
  attemptIndex = 1,
  totalAttempts = 5,
}: Props) {
  const tts = useBrowserTTS();
  const correction = session.targetCorrection;

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  // Build the 4-tier hints
  const hints = correction.hints && correction.hints.length > 0
    ? correction.hints
    : [
        { tier: 0, title: "Không gợi ý", content: "Tự phát hiện và sửa lại ngay." },
        {
          tier: 1,
          title: "Chỉ điểm lỗi",
          content: `Lỗi: "${correction.userErroneousText}" → Cần sửa thành: "${correction.minimalCorrection}".`,
        },
        {
          tier: 2,
          title: "Gợi ý cấu trúc",
          content: correction.explanationVi || "Sửa lỗi để câu tự nhiên hơn.",
        },
        {
          tier: 3,
          title: "Khung câu",
          content: correction.skeletonHint || correction.betterSentence.replace(correction.minimalCorrection, "______"),
        },
        {
          tier: 4,
          title: "Câu mẫu hoàn chỉnh",
          content: correction.betterSentence,
        },
      ];

  const activeHint = currentHintTier > 0 ? hints.find((h) => h.tier === currentHintTier) : null;

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs border border-amber-500/30 flex items-center gap-1">
              <RotateCcw className="size-3 animate-spin-reverse" />
              <span>Lần sửa #{session.currentAttemptNumber}</span>
            </span>
            <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 rounded-full border border-border/60">
              Ưu tiên P{correction.priority}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {correction.errorType}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
              {session.sourceContext === "retry_lab" ? "AI Generated Challenge" : "Error Bank"}
            </Badge>
          </div>
        </div>

        {/* Situation & Target Intent in Vietnamese */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="size-3.5 text-amber-500" />
              <span>Tình huống & Ý định cần nói đúng:</span>
            </div>
            <h2 className="text-base md:text-lg font-bold tracking-tight text-foreground leading-snug">
              {session.originalPrompt}
            </h2>
          </div>

          {/* Erroneous Spoken Sentence Display Box */}
          <div className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                <span>Câu nói có lỗi (Cần sửa lại):</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlayAudio(session.originalTranscript)}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-red-500 gap-1 rounded-lg"
                title="Nghe câu có lỗi"
              >
                <Volume2 className="size-3" />
                <span>Nghe lỗi</span>
              </Button>
            </div>

            <div className="text-sm md:text-base font-mono text-foreground leading-relaxed">
              <span>"</span>
              {session.originalTranscript}
              <span>"</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-500/10 text-xs">
              <span className="font-bold text-red-500 flex items-center gap-1">
                <span>⚠️ Trọng tâm sửa:</span>
                <span className="underline decoration-red-500/60 font-mono font-bold">
                  {correction.whatToFix}
                </span>
              </span>
              <span className="text-muted-foreground text-[11px]">• {correction.explanationVi}</span>
            </div>
          </div>

          {/* Suggested Vocabulary & Replacement Chips Bar */}
          {correction.suggestedVocabulary && correction.suggestedVocabulary.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 mt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lightbulb className="size-3 text-amber-500" />
                  Cụm từ thay thế chuẩn (Collocations):
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Bấm để nghe phát âm</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {correction.suggestedVocabulary.map((vocab, idx) => (
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
                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4 border-primary/40 text-primary">
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

              {/* Audio button for skeleton or model sentence */}
              {(activeHint.tier === 3 || activeHint.tier === 4) && (
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(activeHint.content)}
                    className="h-7 text-xs gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 btn-spring"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe câu mẫu</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4-Tier Inline Stepper Buttons (Always visible at card bottom, Zero Popup) */}
        <div className="pt-2 border-t border-border/40 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span className="font-semibold flex items-center gap-1">
              <Layers className="size-3 text-primary" />
              <span>Gợi ý nấc thang:</span>
            </span>
            <span className="font-mono text-[10px]">Phím 'H' để đổi tầng</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { tier: 1, label: "T1: Chỉ lỗi", desc: "Từ sai" },
              { tier: 2, label: "T2: Cấu trúc", desc: "Quy tắc" },
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
