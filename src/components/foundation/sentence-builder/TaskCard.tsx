"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Layers, Zap, Target, HelpCircle, Clock, Volume2, Lightbulb } from "lucide-react";
import type { SentenceBuilderTask } from "@/types/sentence-builder";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

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
}

export function TaskCard({
  task,
  currentTaskIndex,
  totalTasks,
  prepCountdown,
  isCountingDown,
  onOpenHints,
  currentHintTier = 0,
  onSelectHintTier,
  hasListenedBaseSentence = false,
  onPlayBaseSentence,
  isSpeakingBaseSentence = false,
  onPlayTerm,
}: TaskCardProps) {
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

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "controlled":
        return {
          label: "Level A • Khung mẫu (Controlled)",
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
      case "semi_controlled":
        return {
          label: "Level B • Từ khoá (Semi-Controlled)",
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "free":
        return {
          label: "Level C • Tự do (Control-Free)",
          color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        };
      default:
        return {
          label: "Controlled",
          color: "bg-primary/10 text-primary border-primary/30",
        };
    }
  };

  const levelInfo = getLevelBadge(task.controlLevel);
  const activeHint = currentHintTier > 0 && task.hints ? task.hints.find((h) => h.tier === currentHintTier) : null;

  return (
    <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm overflow-hidden">
      <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full space-y-4">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-muted font-mono font-bold text-xs text-foreground shrink-0">
              #{currentTaskIndex + 1}/{totalTasks}
            </span>
            <Badge variant="outline" className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${levelInfo.color}`}>
              <Layers className="size-3 mr-1" />
              {levelInfo.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {task.topic.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
              Độ khó: {task.difficulty.overall}/10
            </Badge>
          </div>
        </div>

        {/* Prompt Section */}
        <div className="space-y-2 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Target className="size-3.5 text-primary" />
            <span>{task.instruction}</span>
          </div>

          <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-snug">
            "{task.promptVi}"
          </h2>

          {/* Base Sentence Display with Single-Play TTS Audio */}
          {task.baseSentence && (
            <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-foreground shrink-0">Gốc:</span>
                <span className="font-mono text-primary font-medium truncate">{task.baseSentence}</span>
              </div>
              {onPlayBaseSentence && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={hasListenedBaseSentence || isSpeakingBaseSentence}
                  onClick={onPlayBaseSentence}
                  className="h-6 text-[10px] rounded-lg font-semibold gap-1 px-2 shrink-0 border border-border/60 hover:bg-primary/10 disabled:opacity-40"
                  title={hasListenedBaseSentence ? "Đã nghe (Chỉ cho phép nghe 1 lần)" : "Nghe phát âm câu gốc tiếng Anh (1 lần duy nhất)"}
                >
                  <Volume2 className={`size-3 ${isSpeakingBaseSentence ? "text-primary animate-pulse" : "text-foreground"}`} />
                  <span>{hasListenedBaseSentence ? "Đã nghe" : isSpeakingBaseSentence ? "Đang đọc..." : "Nghe (1 lần)"}</span>
                </Button>
              )}
            </div>
          )}

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

          {/* Scaffold Layer Display */}
          {task.controlLevel === "controlled" && task.scaffold.template && (
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-1 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Sparkles className="size-3" />
                Khung mẫu câu:
              </span>
              <p className="font-mono text-sm md:text-base font-semibold text-foreground tracking-wide">
                {task.scaffold.template}
              </p>
            </div>
          )}

          {task.controlLevel === "semi_controlled" && task.scaffold.keywords && task.scaffold.keywords.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Zap className="size-3" />
                Từ khoá bắt buộc:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {task.scaffold.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-xl bg-background border border-amber-500/30 text-foreground font-mono text-xs font-semibold shadow-2xs"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {task.controlLevel === "free" && (
            <div className="p-2.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              <Sparkles className="size-3.5 shrink-0" />
              <span>Thử thách tự thân: Cấu trúc ý và phản xạ nói 1-2 câu trôi chảy!</span>
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
              { tier: 2, label: "T2: Khung câu" },
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
