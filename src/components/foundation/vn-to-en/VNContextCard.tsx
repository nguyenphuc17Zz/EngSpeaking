"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Volume2,
  ChevronDown,
  Copy,
  Check,
  BookOpen,
  Layers,
} from "lucide-react";
import type { VNToENTask } from "@/types/vn-to-en";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { toast } from "@/lib/toast";

interface VNContextCardProps {
  task: VNToENTask;
  currentHintTier?: number;
  onSelectHintTier?: (tier: 0 | 1 | 2 | 3 | 4) => void;
}

export function VNContextCard({
  task,
  currentHintTier = 0,
  onSelectHintTier,
}: VNContextCardProps) {
  const tts = useBrowserTTS();
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Priority for Model Answer:
  // 1. First full expected response from AI
  // 2. task.expectedResponses[0]
  // 3. task.sayItBetter casual / professional
  // 4. Tier 4 hint content
  // 5. targetIntent only as last resort
  const primaryModelAnswer =
    fullExpected ||
    (task.expectedResponses && task.expectedResponses[0]?.trim()) ||
    (isFullSentence(task.sayItBetter?.casual) && task.sayItBetter?.casual?.trim()) ||
    (isFullSentence(task.sayItBetter?.professional) && task.sayItBetter?.professional?.trim()) ||
    (isFullSentence(tier4Content) && tier4Content) ||
    (isFullSentence(targetIntent) && targetIntent) ||
    task.expectedResponses?.[0] ||
    targetIntent ||
    "";

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Header Meta Row */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              2. Đáp án chuẩn & Gợi ý nấc thang
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
            Đáp án tiếng Anh
          </Badge>
        </div>

        {/* Scrollable Container with Zero-scroll ergonomics */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {/* Primary Model Answer Card */}
          {primaryModelAnswer && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/30 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <span>Đáp án tiếng Anh chuẩn:</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(primaryModelAnswer, "vn-en-model")}
                    className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                    title="Sao chép đáp án"
                  >
                    {copiedId === "vn-en-model" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(primaryModelAnswer)}
                    className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all btn-spring shrink-0"
                    title="Nghe phát âm đáp án"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe đáp án</span>
                  </Button>
                </div>
              </div>
              <p className="font-mono text-xs sm:text-sm font-bold text-foreground leading-relaxed select-text cursor-text">
                "{primaryModelAnswer}"
              </p>
            </div>
          )}

          {/* Say It Better (Bộ 3 cách nói bản xứ) */}
          {task.sayItBetter && (task.sayItBetter.casual || task.sayItBetter.professional || task.sayItBetter.idiomatic) && (
            <div className="p-2.5 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3 text-indigo-500" />
                  <span>Bộ 3 cách nói bản xứ (Say It Better):</span>
                </div>
              </div>

              <div className="grid gap-1.5 text-xs font-mono">
                {task.sayItBetter.casual && (
                  <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-card border border-border/60">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                        ☕ Đời thường (Casual):
                      </span>
                      <span className="text-foreground text-xs leading-snug block select-text cursor-text">
                        "{task.sayItBetter.casual}"
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(task.sayItBetter!.casual, "sib-casual")}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                        title="Sao chép"
                      >
                        {copiedId === "sib-casual" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handlePlayAudio(task.sayItBetter!.casual)}
                        className="size-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Nghe cách nói đời thường"
                      >
                        <Volume2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {task.sayItBetter.professional && (
                  <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-card border border-border/60">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                        💼 Công sở (Professional):
                      </span>
                      <span className="text-foreground text-xs leading-snug block select-text cursor-text">
                        "{task.sayItBetter.professional}"
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(task.sayItBetter!.professional, "sib-prof")}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                        title="Sao chép"
                      >
                        {copiedId === "sib-prof" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handlePlayAudio(task.sayItBetter!.professional)}
                        className="size-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Nghe cách nói công sở"
                      >
                        <Volume2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {task.sayItBetter.idiomatic && (
                  <div className="flex items-start justify-between gap-2 p-2 rounded-xl bg-card border border-border/60">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block mb-0.5">
                        ⚡ Khẩu ngữ (Idiomatic):
                      </span>
                      <span className="text-foreground text-xs leading-snug block select-text cursor-text">
                        "{task.sayItBetter.idiomatic}"
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(task.sayItBetter!.idiomatic, "sib-idiom")}
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                        title="Sao chép"
                      >
                        {copiedId === "sib-idiom" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handlePlayAudio(task.sayItBetter!.idiomatic)}
                        className="size-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Nghe khẩu ngữ bản xứ"
                      >
                        <Volume2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
                                  onClick={() => handleCopy(h.content, `vn-hint-${h.tier}`)}
                                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                                  title="Sao chép nội dung gợi ý"
                                >
                                  {copiedId === `vn-hint-${h.tier}` ? (
                                    <Check className="size-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              )}
                              {isFullSentenceTier && primaryModelAnswer && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePlayAudio(h.content || primaryModelAnswer)}
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
            <BookOpen className="size-3 text-emerald-500" />
            <span>Đáp án chuẩn & Khung phản xạ</span>
          </span>
          <span>Nấc hiện tại: T{currentHintTier}/4</span>
        </div>
      </CardContent>
    </Card>
  );
}
