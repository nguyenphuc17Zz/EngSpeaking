"use client";

import { useState } from "react";
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
  ChevronDown,
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
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
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

          {/* Conversational Trap / Partner Echo Simulation */}
          {correction.conversationalTrap && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-1.5 animate-in fade-in-0 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="size-3 text-indigo-500" />
                  Đối tác giao tiếp hỏi lại (Conversational Echo):
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(correction.conversationalTrap!.partnerUtterance)}
                  className="h-6 px-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 gap-1 rounded-lg"
                  title="Nghe câu hỏi của đối tác"
                >
                  <Volume2 className="size-3" />
                  <span>Nghe đối tác nói</span>
                </Button>
              </div>

              <p className="text-sm font-semibold text-foreground italic">
                "{correction.conversationalTrap.partnerUtterance}"
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-500/15 text-[11px] text-muted-foreground">
                <span>💡 {correction.conversationalTrap.reactionPromptVi}</span>
                {correction.conversationalTrap.suggestedStarter && (
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                    (Gợi ý: "{correction.conversationalTrap.suggestedStarter}")
                  </span>
                )}
              </div>
            </div>
          )}

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

          {/* 4-Tier Progressive Hints (Stack List - Open by Default) */}
          {hints && hints.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5 mt-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý nấc thang sửa lỗi (T1 - T4):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHintsExpanded(!isHintsExpanded)}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isHintsExpanded ? "Thu gọn gợi ý" : "Hiện tất cả (T1 - T4)"}</span>
                  <ChevronDown className={`size-3.5 transition-transform duration-200 ${isHintsExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>

              {isHintsExpanded && (
                <div className="space-y-1.5 pt-0.5 animate-in fade-in-0 duration-150">
                  {hints
                    .filter((h) => h.tier >= 1 && h.tier <= 4)
                    .map((h) => {
                      const tierStyles = [
                        { badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", border: "border-sky-500/20 bg-card/90" },
                        { badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", border: "border-indigo-500/20 bg-card/90" },
                        { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", border: "border-amber-500/20 bg-card/90" },
                        { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", border: "border-emerald-500/20 bg-card/90" },
                      ];
                      const style = tierStyles[h.tier - 1] || tierStyles[0];
                      const isFullSentenceTier = h.tier === 3 || h.tier === 4;
                      const cleanRepairSentence =
                        correction.betterSentence || (!h.content.includes("______") ? h.content : "");

                      return (
                        <div key={h.tier} className={`p-2.5 rounded-xl border ${style.border} shadow-2xs space-y-1`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${style.badge}`}>
                                T{h.tier}
                              </span>
                              <span className="text-xs font-bold text-foreground">{h.title}</span>
                            </div>

                            {isFullSentenceTier && cleanRepairSentence && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePlayAudio(cleanRepairSentence)}
                                className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold btn-spring"
                                title="Nghe câu mẫu hoàn chỉnh"
                              >
                                <Volume2 className="size-3" />
                                <span>{h.tier === 3 ? "Nghe câu hoàn chỉnh" : "Nghe câu mẫu"}</span>
                              </Button>
                            )}
                          </div>

                          <p className="font-mono text-xs md:text-sm font-medium text-foreground/90 pl-0.5 leading-relaxed">
                            {h.content}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Bar: Quick Hint Status */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
            <Layers className="size-3 text-primary" />
            <span>Nấc thang sửa lỗi phản xạ (T1 - T4)</span>
          </span>
          <button
            type="button"
            onClick={() => setIsHintsExpanded(!isHintsExpanded)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
            title="Bấm để ẩn hoặc hiện toàn bộ gợi ý T1-T4"
          >
            <Sparkles className="size-3 text-amber-500" />
            <span>{isHintsExpanded ? "Gợi ý T1-T4: Đang hiện" : "Gợi ý T1-T4: Đã ẩn (Bấm mở)"}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
