"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, Flame, Zap, Target, HelpCircle, Volume2, Lightbulb } from "lucide-react";
import type { VNToENTask } from "@/types/vn-to-en";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

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
  const handlePlayVocab = (term: string) => {
    if (onPlayTerm) {
      onPlayTerm(term);
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(sanitizeTextForTTS(term));
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
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
  const activeHint = currentHintTier > 0 ? task.hints?.find((h) => h.tier === currentHintTier) : null;

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
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Target className="size-3.5 text-primary" />
              <span>Hãy nói câu sau sang tiếng Anh:</span>
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

          {/* Active Hint Card (if unlocked) */}
          {activeHint && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 mt-1 animate-in fade-in-0 duration-150">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="size-3.5" />
                  <span>Gợi ý Tầng {activeHint.tier}: {activeHint.title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onSelectHintTier?.(0)}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Thu gọn [Esc]
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs md:text-sm font-semibold text-foreground">
                  {activeHint.content}
                </p>
                {activeHint.tier === 4 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayVocab(activeHint.content)}
                    className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
                    title="Nghe phát âm câu mẫu"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar: Prep Timer & Inline 4-Tier Hint Stepper */}
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

          {/* 4-Tier Progressive Hint Buttons Directly on Card */}
          <div className="flex items-center gap-1 shrink-0">
            {[
              { tier: 1, label: "T1: Từ khoá" },
              { tier: 2, label: "T2: Cấu trúc" },
              { tier: 3, label: "T3: Mở đầu" },
              { tier: 4, label: "T4: Câu mẫu" },
            ].map(({ tier, label }) => {
              const isActive = currentHintTier === tier;
              return (
                <Button
                  key={tier}
                  type="button"
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => onSelectHintTier?.((isActive ? 0 : tier) as 0 | 1 | 2 | 3 | 4)}
                  className={`h-7 px-2 text-[10px] sm:text-[11px] font-mono rounded-lg transition-all btn-spring ${
                    isActive
                      ? "bg-amber-500/25 border-amber-500/70 text-amber-700 dark:text-amber-300 font-bold shadow-xs scale-102"
                      : "border-border/70 text-muted-foreground hover:text-foreground hover:border-amber-500/40"
                  }`}
                  title={`Bấm để mở/ẩn gợi ý ${label}`}
                >
                  <span>{label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
