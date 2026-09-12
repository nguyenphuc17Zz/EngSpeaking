"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  Volume2,
  ChevronDown,
  Copy,
  Check,
  BookOpen,
  Layers,
} from "lucide-react";
import type { SentenceBuilderTask } from "@/types/sentence-builder";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { toast } from "@/lib/toast";

interface SentenceBuilderContextCardProps {
  task: SentenceBuilderTask;
  currentHintTier?: number;
  onSelectHintTier?: (tier: 0 | 1 | 2 | 3 | 4) => void;
}

export function SentenceBuilderContextCard({
  task,
  currentHintTier = 0,
  onSelectHintTier,
}: SentenceBuilderContextCardProps) {
  const tts = useBrowserTTS();
  const [isPlayingFullSentence, setIsPlayingFullSentence] = useState(false);
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Đã sao chép câu mẫu", text);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {
      toast.error("Không thể sao chép", "Vui lòng bôi đen chuột và nhấn phím Ctrl+C.");
    }
  }, []);

  // Resolve the true full complete model sentence
  const vocabTerms = new Set([
    ...(task.suggestedVocabulary || []).map((v) => v.term.trim().toLowerCase()),
    ...(task.scaffold?.keywords || []).map((k) => k.trim().toLowerCase()),
  ]);

  const isFullSentence = (text?: string | null): boolean => {
    if (!text) return false;
    const clean = text.trim();
    if (!clean || vocabTerms.has(clean.toLowerCase())) return false;
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

  const handlePlayFullSentence = () => {
    if (!fullModelSentence) return;
    setIsPlayingFullSentence(true);
    tts.speak(sanitizeTextForTTS(fullModelSentence));
    setTimeout(() => setIsPlayingFullSentence(false), 2500);
  };

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Header Meta Row */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              2. Khung câu & Gợi ý nấc thang
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
            Nấc thang T1-T4
          </Badge>
        </div>

        {/* Scrollable Container with Zero-scroll ergonomics */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {/* Scaffold Layer: Controlled */}
          {task.controlLevel === "controlled" && task.scaffold.template && (
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Khung cấu trúc mẫu:
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {fullModelSentence && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(fullModelSentence, "scaffold-sentence")}
                        className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                        title="Sao chép câu hoàn chỉnh (hoặc bấm Ctrl+C)"
                      >
                        {copiedId === "scaffold-sentence" ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handlePlayFullSentence}
                        className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all btn-spring shrink-0"
                        title="Nghe câu mẫu hoàn chỉnh"
                      >
                        <Volume2 className={`size-3 ${isPlayingFullSentence ? "animate-pulse scale-110" : ""}`} />
                        <span>{isPlayingFullSentence ? "Đang đọc..." : "Nghe câu"}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <p className="font-mono text-xs sm:text-sm font-bold text-foreground tracking-wide select-text cursor-text leading-relaxed">
                {task.scaffold.template}
              </p>
            </div>
          )}

          {/* Scaffold Layer: Semi-Controlled */}
          {task.controlLevel === "semi_controlled" && task.scaffold.keywords && task.scaffold.keywords.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Zap className="size-3" />
                  Từ khoá bắt buộc lồng ghép:
                </span>
                {fullModelSentence && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(fullModelSentence, "scaffold-semi")}
                      className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                      title="Sao chép câu mẫu"
                    >
                      {copiedId === "scaffold-semi" ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handlePlayFullSentence}
                      className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all btn-spring shrink-0"
                      title="Nghe phát âm câu mẫu"
                    >
                      <Volume2 className="size-3" />
                      <span>Nghe mẫu</span>
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.scaffold.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-xl bg-background border border-amber-500/30 text-foreground font-mono text-xs font-semibold shadow-2xs select-text"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scaffold Layer: Free */}
          {task.controlLevel === "free" && (
            <div className="p-2.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2 text-xs text-primary">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 shrink-0 text-amber-500" />
                <span className="font-semibold text-foreground text-xs">
                  Phản xạ tự do: Bật ra 1-2 câu trọn vẹn theo văn cảnh!
                </span>
              </div>
              {fullModelSentence && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(fullModelSentence, "scaffold-free")}
                    className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                    title="Sao chép câu gợi ý"
                  >
                    {copiedId === "scaffold-free" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayFullSentence}
                    className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all btn-spring shrink-0"
                    title="Nghe câu mẫu"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe câu</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 4-Tier Progressive Scaffolding Hints */}
          {task.hints && task.hints.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="size-3 text-amber-500" />
                  <span>Gợi ý nấc thang (T1 - T4):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHintsExpanded(!isHintsExpanded)}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isHintsExpanded ? "Thu gọn" : "Mở rộng"}</span>
                  <ChevronDown className={`size-3 transition-transform duration-200 ${isHintsExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>

              {isHintsExpanded && (
                <div className="space-y-1.5 pt-0.5 animate-in fade-in-0 duration-150">
                  {task.hints
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
                        <div key={h.tier} className={`p-2 rounded-xl border ${style.border} shadow-2xs space-y-0.5`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${style.badge}`}>
                                T{h.tier}
                              </span>
                              <span className="text-[11px] font-bold text-foreground">{h.title}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {h.content && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(h.content, `hint-${h.tier}`)}
                                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                                  title="Sao chép nội dung gợi ý"
                                >
                                  {copiedId === `hint-${h.tier}` ? (
                                    <Check className="size-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              )}
                              {isFullSentenceTier && fullModelSentence && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handlePlayFullSentence}
                                  className="h-5 px-1.5 text-[9px] gap-1 rounded-md border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold cursor-pointer"
                                  title="Nghe câu mẫu"
                                >
                                  <Volume2 className="size-2.5" />
                                  <span>Nghe</span>
                                </Button>
                              )}
                            </div>
                          </div>

                          <p className="font-mono text-xs font-medium text-foreground/90 pl-0.5 leading-snug select-text cursor-text">
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

        {/* Footer info */}
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3 text-amber-500" />
            <span>Khung mẫu & Nấc thang phản xạ</span>
          </span>
          <span>Nấc hiện tại: T{currentHintTier}/4</span>
        </div>
      </CardContent>
    </Card>
  );
}
