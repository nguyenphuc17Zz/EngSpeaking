"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Layers, Zap, Target, HelpCircle, Clock, Volume2, Lightbulb, ChevronDown } from "lucide-react";
import type { SentenceBuilderTask } from "@/types/sentence-builder";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

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
  const tts = useBrowserTTS();
  const [isPlayingFullSentence, setIsPlayingFullSentence] = useState(false);
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);

  // Resolve the true full complete model sentence, avoiding picking an isolated vocabulary term
  const vocabTerms = new Set([
    ...(task.suggestedVocabulary || []).map((v) => v.term.trim().toLowerCase()),
    ...(task.scaffold?.keywords || []).map((k) => k.trim().toLowerCase()),
  ]);

  const isFullSentence = (text?: string | null): boolean => {
    if (!text) return false;
    const clean = text.trim();
    if (!clean) return false;
    if (vocabTerms.has(clean.toLowerCase())) return false;
    return clean.split(/\s+/).length >= 4;
  };

  const targetIntent = task.targetIntent?.trim();
  const tier4Content = task.hints?.find((h) => h.tier === 4)?.content?.trim();
  const fullExpected = task.expectedResponses?.find((r) => isFullSentence(r));

  let filledTemplate = "";
  if (task.scaffold?.template && task.scaffold.template.includes("___")) {
    const fillTerms = (task.suggestedVocabulary || []).map((v) => v.term);
    let idx = 0;
    filledTemplate = task.scaffold.template.replace(/_{2,}/g, () => fillTerms[idx++] || "").trim();
  }

  const fullModelSentence =
    (isFullSentence(targetIntent) && targetIntent) ||
    (isFullSentence(tier4Content) && tier4Content) ||
    fullExpected ||
    (isFullSentence(filledTemplate) && filledTemplate) ||
    targetIntent ||
    tier4Content ||
    task.expectedResponses?.[0] ||
    "";

  const handlePlayVocab = (term: string) => {
    if (onPlayTerm) {
      onPlayTerm(term);
    } else {
      tts.speak(sanitizeTextForTTS(term));
    }
  };

  const handlePlayFullSentence = () => {
    if (!fullModelSentence) return;
    setIsPlayingFullSentence(true);
    if (onPlayTerm) {
      onPlayTerm(fullModelSentence);
      setTimeout(() => setIsPlayingFullSentence(false), 2500);
    } else {
      tts.speak(sanitizeTextForTTS(fullModelSentence));
      setTimeout(() => setIsPlayingFullSentence(false), 2500);
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
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Khung mẫu câu:
                </span>
                {fullModelSentence && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayFullSentence}
                    className="h-6 px-2 text-[11px] font-semibold gap-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all btn-spring shrink-0"
                    title="Nghe phát âm câu mẫu hoàn chỉnh (Full sentence)"
                  >
                    <Volume2 className={`size-3.5 ${isPlayingFullSentence ? "animate-pulse scale-110 text-primary" : ""}`} />
                    <span>{isPlayingFullSentence ? "Đang đọc..." : "Nghe câu hoàn chỉnh"}</span>
                  </Button>
                )}
              </div>
              <p className="font-mono text-sm md:text-base font-semibold text-foreground tracking-wide">
                {task.scaffold.template}
              </p>
            </div>
          )}

          {task.controlLevel === "semi_controlled" && task.scaffold.keywords && task.scaffold.keywords.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Zap className="size-3" />
                  Từ khoá bắt buộc:
                </span>
                {fullModelSentence && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayFullSentence}
                    className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all btn-spring shrink-0"
                    title="Nghe phát âm câu mẫu hoàn chỉnh"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe câu hoàn chỉnh</span>
                  </Button>
                )}
              </div>
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
            <div className="p-2.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between gap-2 text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 shrink-0" />
                <span>Thử thách tự thân: Cấu trúc ý và phản xạ nói 1-2 câu trôi chảy!</span>
              </div>
              {fullModelSentence && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayFullSentence}
                  className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all btn-spring shrink-0"
                  title="Nghe phát âm câu mẫu gợi ý"
                >
                  <Volume2 className="size-3" />
                  <span>Nghe câu mẫu</span>
                </Button>
              )}
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
                                onClick={() => handlePlayFullSentence()}
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
