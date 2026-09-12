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
  MessageCircle,
} from "lucide-react";
import type { LatencyTask } from "@/types/latency-training";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { toast } from "@/lib/toast";

interface LatencyContextCardProps {
  task: LatencyTask;
  currentHintTier?: number;
  onSelectHintTier?: (tier: number) => void;
}

export function LatencyContextCard({
  task,
  currentHintTier = 0,
  onSelectHintTier,
}: LatencyContextCardProps) {
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

  const cleanPrefix = (text?: string | null): string => {
    if (!text) return "";
    return text
      .replace(/^(câu mẫu hoàn chỉnh|câu trả lời mẫu|câu mẫu|sample response|model answer):\s*/i, "")
      .trim();
  };

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

  // Build 4-Tier hints
  const hints =
    task.hints && task.hints.length > 0
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

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Header Meta Row */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              2. Đệm từ & Gợi ý nấc thang
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
            Nấc thang T1-T4
          </Badge>
        </div>

        {/* Scrollable Container with Zero-scroll ergonomics */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {/* Buffer Phrase Strategy Suggestion */}
          {task.bufferPhraseSuggestion && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <MessageCircle className="size-3 text-amber-500" />
                  Cụm từ đệm mở đầu (Buffer Phrase):
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(task.bufferPhraseSuggestion!, "buffer-phrase")}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                    title="Sao chép cụm đệm"
                  >
                    {copiedId === "buffer-phrase" ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(task.bufferPhraseSuggestion!)}
                    className="h-5 px-1.5 text-[9px] gap-1 rounded-md border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shrink-0 font-semibold cursor-pointer"
                    title="Nghe cụm đệm"
                  >
                    <Volume2 className="size-2.5" />
                    <span>Nghe</span>
                  </Button>
                </div>
              </div>
              <p className="font-mono text-xs sm:text-sm font-bold text-foreground select-text cursor-text">
                "{task.bufferPhraseSuggestion}"
              </p>
              <p className="text-[10px] text-muted-foreground italic leading-tight">
                Mẹo: Bật cụm đệm này ngay trong 0.5s đầu tiên để não có thêm 1.5s tổ chức câu trả lời!
              </p>
            </div>
          )}

          {/* Full Model Response Preview Card */}
          {fullModelResponse && (
            <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Câu trả lời mẫu tham khảo:
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(fullModelResponse, "model-response")}
                    className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                    title="Sao chép câu trả lời mẫu"
                  >
                    {copiedId === "model-response" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(fullModelResponse)}
                    className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all btn-spring shrink-0"
                    title="Nghe câu mẫu"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe câu</span>
                  </Button>
                </div>
              </div>
              <p className="font-mono text-xs sm:text-sm font-semibold text-foreground leading-relaxed select-text cursor-text">
                "{fullModelResponse}"
              </p>
            </div>
          )}

          {/* 4-Tier Progressive Scaffolding Hints */}
          {hints && hints.length > 0 && (
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
                                  onClick={() => handleCopy(h.content, `latency-hint-${h.tier}`)}
                                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                                  title="Sao chép gợi ý"
                                >
                                  {copiedId === `latency-hint-${h.tier}` ? (
                                    <Check className="size-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              )}
                              {isFullSentenceTier && fullModelResponse && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePlayAudio(fullModelResponse)}
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
            <span>Đệm từ & Chiến lược phản xạ</span>
          </span>
          <span>Nấc hiện tại: T{currentHintTier}/4</span>
        </div>
      </CardContent>
    </Card>
  );
}
