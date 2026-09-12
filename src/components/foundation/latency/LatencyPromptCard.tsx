"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Zap,
  Target,
  Flame,
  Sparkles,
  Volume2,
  Lightbulb,
  X,
  Layers,
  HelpCircle,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type { LatencyTask } from "@/types/latency-training";

interface LatencyPromptCardProps {
  task: LatencyTask;
  currentTaskIndex: number;
  totalTasks: number;
  isRecording: boolean;
  elapsedMs: number;
  rapidStreak?: number;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
  staircaseTargetMs?: number;
}

export function LatencyPromptCard({
  task,
  currentTaskIndex,
  totalTasks,
  isRecording,
  elapsedMs,
  rapidStreak = 0,
  currentHintTier,
  onSelectHintTier,
  staircaseTargetMs,
}: LatencyPromptCardProps) {
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const tts = useBrowserTTS();
  const targetMs = staircaseTargetMs ?? task.staircaseTargetMs ?? task.targetLatencyMs ?? 3000;
  const progressPercent = Math.min(100, Math.round((elapsedMs / targetMs) * 100));

  // Dynamic Stopwatch Color Thresholds
  const isSafeGreen = elapsedMs <= targetMs * 0.75;
  const isWarningAmber = elapsedMs > targetMs * 0.75 && elapsedMs <= targetMs;
  const isOverRed = elapsedMs > targetMs;

  const stopwatchColor = isOverRed
    ? "text-red-500"
    : isWarningAmber
    ? "text-amber-500"
    : "text-emerald-500";

  const progressColorClass = isOverRed
    ? "[&>div]:bg-red-500"
    : isWarningAmber
    ? "[&>div]:bg-amber-500"
    : "[&>div]:bg-emerald-500";

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  // Build 4-Tier hints
  const hints = task.hints && task.hints.length > 0
    ? task.hints
    : [
        { tier: 0, title: "Không gợi ý", content: "Tự bật câu trả lời ngay lập tức." },
        {
          tier: 1,
          title: "Từ khoá cốt lõi",
          content: task.expectedKeywords?.join(" / ") || "Tập trung vào ý chính",
        },
        {
          tier: 2,
          title: "Cụm từ đệm mở đầu",
          content: task.bufferPhraseSuggestion || "Well, to be honest...",
        },
        {
          tier: 3,
          title: "Khung câu",
          content: `${task.bufferPhraseSuggestion || "Well,"} I usually ______ .`,
        },
        {
          tier: 4,
          title: "Câu mẫu hoàn chỉnh",
          content: task.sampleResponses?.[0] || "Sample response...",
        },
      ];

  const vocabTerms = new Set([
    ...(task.suggestedVocabulary || []).map((v) => v.term.trim().toLowerCase()),
    ...(task.expectedKeywords || []).map((k) => k.trim().toLowerCase()),
  ]);

  const isFullSentence = (text?: string | null): boolean => {
    if (!text) return false;
    const clean = text.trim();
    if (!clean || clean.includes("______") || vocabTerms.has(clean.toLowerCase())) return false;
    return clean.split(/\s+/).length >= 3;
  };

  const cleanPrefix = (text?: string | null): string => {
    if (!text) return "";
    return text
      .replace(/^(câu mẫu hoàn chỉnh|câu trả lời mẫu|câu mẫu|sample response|model answer):\s*/i, "")
      .trim();
  };

  const tier4Content = cleanPrefix(task.hints?.find((h) => h.tier === 4)?.content);
  const sampleCandidate = task.sampleResponses?.map(cleanPrefix).find((s) => isFullSentence(s));
  const targetCandidate = isFullSentence(task.targetIntent) ? task.targetIntent!.trim() : "";

  const fullModelResponse =
    (isFullSentence(tier4Content) && tier4Content) ||
    sampleCandidate ||
    targetCandidate ||
    cleanPrefix(task.sampleResponses?.[0]) ||
    tier4Content ||
    "";

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-muted font-mono font-bold text-xs text-foreground">
              Câu {currentTaskIndex + 1} / {totalTasks}
            </span>
            <Badge
              variant="outline"
              className="text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-600 dark:text-amber-400 gap-1 font-mono"
            >
              <Zap className="size-3 text-amber-500 fill-amber-500" />
              <span>Mục tiêu nấc thang: {(targetMs / 1000).toFixed(1)}s</span>
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {rapidStreak > 0 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-mono text-[10px] font-bold gap-1 shadow-xs animate-pulse py-0.5">
                <Flame className="size-3 fill-white" />
                <span>Streak: {rapidStreak}</span>
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {task.category.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        {/* Live Millisecond Stopwatch Gauge */}
        <div className="p-3 rounded-2xl bg-card border border-border/80 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock
                className={`size-4 ${
                  isRecording ? "text-amber-500 animate-spin" : "text-muted-foreground"
                }`}
              />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Độ trễ phản xạ thời gian thực:
              </span>
            </div>

            <div className="font-mono text-base md:text-lg font-bold flex items-baseline gap-1">
              <span className={stopwatchColor}>{(elapsedMs / 1000).toFixed(2)}s</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                / {(targetMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          <Progress
            value={progressPercent}
            className={`h-2 rounded-full transition-all ${progressColorClass}`}
          />
        </div>

        {/* Prompt Heading & Intent Section */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Target className="size-3.5 text-primary" />
                <span>Hãy phản xạ và nói ngay bằng tiếng Anh:</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(task.promptText)}
                  className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 rounded-lg"
                  title="Nghe câu hỏi"
                >
                  <Volume2 className="size-3" />
                  <span>Nghe câu hỏi</span>
                </Button>
                {fullModelResponse && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(fullModelResponse)}
                    className="h-6 px-2 text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-500 gap-1 rounded-lg border border-amber-500/20 hover:bg-amber-500/10 btn-spring"
                    title="Nghe câu trả lời mẫu hoàn chỉnh"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe câu mẫu</span>
                  </Button>
                )}
              </div>
            </div>

            <h2 className="font-serif text-xl md:text-2xl italic font-normal tracking-tight text-foreground leading-snug">
              "{task.promptText}"
            </h2>
            {task.targetIntent && (
              <p className="text-xs text-muted-foreground">{task.targetIntent}</p>
            )}
          </div>

          {/* Buffer Chunk Priming Bar (3 Strategic Categories) */}
          {task.bufferChunks && task.bufferChunks.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2 mt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Zap className="size-3 text-amber-500 fill-amber-500" />
                  <span>Cụm đệm mồi đà (Buffer Chunk Priming) — Bật âm ngay để giảm trễ:</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Bấm nghe đệm</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {task.bufferChunks.map((chunk, idx) => {
                  const catLabels: Record<string, { label: string; icon: string }> = {
                    buying_time: { label: "Câu giờ", icon: "⏱️" },
                    framing_opinion: { label: "Mở đà", icon: "💭" },
                    immediate_reaction: { label: "Phản xạ", icon: "⚡" },
                  };
                  const cat = catLabels[chunk.category] || { label: "Đệm", icon: "💬" };

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePlayAudio(chunk.phrase)}
                      className="group flex flex-col items-start p-2 rounded-xl bg-background/90 border border-amber-500/30 hover:border-amber-500/70 hover:bg-amber-500/10 transition-all text-left shadow-2xs cursor-pointer btn-spring"
                      title={`Nghe mẫu đệm: "${chunk.phrase}"`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          {cat.icon} {cat.label}
                        </span>
                        <Volume2 className="size-3 text-amber-500 group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="font-semibold font-mono text-xs text-foreground mt-1 line-clamp-1">
                        "{chunk.phrase}"
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">
                        {chunk.meaningVi}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Suggested Vocabulary Chips Bar */}
          {task.suggestedVocabulary && task.suggestedVocabulary.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1.5 mt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="size-3 text-amber-500" />
                  Từ vựng gợi ý:
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Bấm nghe</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {task.suggestedVocabulary.map((vocab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlayAudio(vocab.term)}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-background border border-border/80 hover:border-amber-500/50 hover:bg-muted/80 transition-all text-xs font-medium text-foreground shadow-2xs cursor-pointer btn-spring"
                    title={`Nghe: "${vocab.term}"`}
                  >
                    <Volume2 className="size-3 text-muted-foreground group-hover:text-amber-500 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold font-mono text-foreground">
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

                      return (
                        <div key={h.tier} className={`p-2.5 rounded-xl border ${style.border} shadow-2xs space-y-1`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${style.badge}`}>
                                T{h.tier}
                              </span>
                              <span className="text-xs font-bold text-foreground">{h.title}</span>
                            </div>

                            {(h.tier === 2 || isFullSentenceTier) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (h.tier === 3 || h.tier === 4) {
                                    if (fullModelResponse) {
                                      handlePlayAudio(fullModelResponse);
                                    } else if (!h.content.includes("______")) {
                                      handlePlayAudio(cleanPrefix(h.content));
                                    }
                                  } else {
                                    handlePlayAudio(cleanPrefix(h.content));
                                  }
                                }}
                                className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold btn-spring"
                                title={isFullSentenceTier ? "Nghe câu hoàn chỉnh" : "Nghe phát âm"}
                              >
                                <Volume2 className="size-3" />
                                <span>{h.tier === 3 ? "Nghe câu hoàn chỉnh" : isFullSentenceTier ? "Nghe câu mẫu" : "Nghe"}</span>
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
        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
            <Layers className="size-3 text-primary" />
            <span>Phản xạ theo nấc thang (T1 - T4)</span>
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
