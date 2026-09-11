"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, Flame, Zap, Target, HelpCircle, Volume2, Lightbulb, ChevronDown } from "lucide-react";
import type { VNToENTask } from "@/types/vn-to-en";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

interface VNPromptCardProps {
  task: VNToENTask;
  currentTaskIndex: number;
  totalTasks: number;
  prepCountdown: number | null;
  isCountingDown: boolean;
  rapidStreak?: number;
  currentHintTier?: number;
  onSelectHintTier?: (tier: 0 | 1 | 2 | 3 | 4) => void;
  onPlayTerm?: (term: string) => void;
}

export function VNPromptCard({
  task,
  currentTaskIndex,
  totalTasks,
  prepCountdown,
  isCountingDown,
  rapidStreak = 0,
  currentHintTier = 0,
  onSelectHintTier,
  onPlayTerm,
}: VNPromptCardProps) {
  const tts = useBrowserTTS();
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);

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
          label: "⚡ Rapid Fire (<2s)",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "timed":
        return {
          label: "⏱️ Timed Retrieval",
          color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        };
      default:
        return {
          label: "🎯 Direct Retrieval",
          color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
    }
  };

  const modeInfo = getModeBadge(task.retrievalMode);

  const vocabTerms = new Set(
    (task.suggestedVocabulary || []).map((v) => v.term.trim().toLowerCase())
  );
  const isFullSentence = (text?: string | null): boolean => {
    if (!text) return false;
    const clean = text.trim();
    if (!clean || vocabTerms.has(clean.toLowerCase())) return false;
    return clean.split(/\s+/).length >= 3;
  };

  const targetIntent = task.targetIntent?.trim();
  const tier4Content = task.hints?.find((h) => h.tier === 4)?.content?.trim();
  const fullExpected = task.expectedResponses?.find((r) => isFullSentence(r));

  const fullEnglishSentence =
    (isFullSentence(targetIntent) && targetIntent) ||
    (isFullSentence(tier4Content) && tier4Content) ||
    fullExpected ||
    targetIntent ||
    tier4Content ||
    task.expectedResponses?.[0] ||
    "";

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-muted font-mono font-bold text-xs text-foreground">
              Câu {currentTaskIndex + 1} / {totalTasks}
            </span>
            <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${modeInfo.color}`}>
              {modeInfo.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {task.isRapidFire && rapidStreak > 0 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-mono text-[10px] font-bold gap-1 shadow-xs animate-pulse py-0.5">
                <Flame className="size-3 fill-white" />
                <span>Streak: {rapidStreak}</span>
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {task.category.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
              Khó: {task.difficulty.overall}/10
            </Badge>
          </div>
        </div>

        {/* Vietnamese Prompt Heading & Dynamic Content */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Target className="size-3.5 text-primary" />
                <span>Hãy nói câu sau sang tiếng Anh:</span>
              </div>
              {fullEnglishSentence && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayVocab(fullEnglishSentence)}
                  className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-primary/20 text-primary hover:bg-primary/10 btn-spring shrink-0"
                  title="Nghe phát âm câu mẫu tiếng Anh hoàn chỉnh"
                >
                  <Volume2 className="size-3" />
                  <span>Nghe câu mẫu</span>
                </Button>
              )}
            </div>

            <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug">
              "{task.promptVi}"
            </h2>
          </div>

          {/* Suggested Vocabulary & Collocations Chips */}
          {task.suggestedVocabulary && task.suggestedVocabulary.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 mt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Lightbulb className="size-3 text-amber-500" />
                  Từ vựng & Cụm từ gợi ý (Collocations):
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Bấm để nghe phát âm
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {task.suggestedVocabulary.map((vocab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayVocab(vocab.term)}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-background border border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 transition-all text-xs font-medium text-foreground shadow-2xs cursor-pointer btn-spring"
                    title={`Nghe phát âm "${vocab.term}"`}
                  >
                    <Volume2 className="size-3 text-amber-500 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-bold text-foreground">{vocab.term}</span>
                    {vocab.meaningVi && (
                      <span className="text-muted-foreground text-[11px]">
                        ({vocab.meaningVi})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4-Tier Progressive Scaffolding Hints (Stack List - Open by Default) */}
          {task.hints && task.hints.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5 mt-1 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý nấc thang (T1 - T4):</span>
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
                  {task.hints
                    .filter((h) => h.tier >= 1 && h.tier <= 4)
                    .map((h) => {
                      const tierStyles = [
                        {
                          badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
                          border: "border-sky-500/20 bg-card/90",
                        },
                        {
                          badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
                          border: "border-indigo-500/20 bg-card/90",
                        },
                        {
                          badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
                          border: "border-amber-500/20 bg-card/90",
                        },
                        {
                          badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                          border: "border-emerald-500/20 bg-card/90",
                        },
                      ];
                      const style = tierStyles[h.tier - 1] || tierStyles[0];
                      const isFullSentenceTier = h.tier === 3 || h.tier === 4;

                      return (
                        <div
                          key={h.tier}
                          className={`p-2.5 rounded-xl border ${style.border} shadow-2xs space-y-1`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${style.badge}`}>
                                T{h.tier}
                              </span>
                              <span className="text-xs font-bold text-foreground">
                                {h.title}
                              </span>
                            </div>

                            {isFullSentenceTier && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (fullEnglishSentence) {
                                    handlePlayVocab(fullEnglishSentence);
                                  } else if (!h.content.includes("______")) {
                                    handlePlayVocab(h.content);
                                  }
                                }}
                                className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold btn-spring"
                                title={h.tier === 3 ? "Nghe câu hoàn chỉnh" : "Nghe câu mẫu"}
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

        {/* Bottom Bar: Prep Timer & Inline 4-Tier Hint Status */}
        <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
          {isCountingDown && prepCountdown !== null ? (
            <div className="flex items-center gap-1.5 text-primary text-xs font-semibold font-mono animate-pulse">
              <Clock className="size-3.5" />
              <span>Chuẩn bị nói: {prepCountdown}s...</span>
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
              <Clock className="size-3" />
              <span>Thời gian chuẩn bị: {task.prepTimeSec}s</span>
            </div>
          )}

          {/* 4-Tier Quick Pill Status Bar */}
          <div className="flex items-center gap-1 shrink-0">
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
        </div>
      </CardContent>
    </Card>
  );
}
