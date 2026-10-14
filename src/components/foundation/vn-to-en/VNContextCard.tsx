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
  Lock,
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
    <Card className="rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Header Meta Row (JapSpeak BuilderContextCard Style) */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-border pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2.5 bg-accent border border-border shrink-0" />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground truncate">
              2. ĐÁP ÁN CHUẨN &amp; GỢI Ý NẤC THANG
            </span>
          </div>

          <div className="flex items-center gap-0.5 bg-secondary p-0.5 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] shrink-0">
            {([0, 1, 2, 3, 4] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSelectHintTier?.(t)}
                className={`text-[10px] font-mono px-2 py-0.5 font-extrabold transition-all cursor-pointer ${
                  currentHintTier === t
                    ? "bg-primary text-primary-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
                title={`Nấc gợi ý T${t} (Bấm phím H để tăng nấc)`}
              >
                T{t}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
          {/* Primary Model Answer Card (Gated behind T4) */}
          {primaryModelAnswer &&
            (currentHintTier >= 4 ? (
              <div className="p-3 bg-accent/35 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" />
                    <span>ĐÁP ÁN TIẾNG ANH CHUẨN (T4 UNLOCKED):</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(primaryModelAnswer, "vn-en-model")}
                      className="size-6 p-0 bg-card border border-border shrink-0"
                      title="Sao chép đáp án"
                    >
                      {copiedId === "vn-en-model" ? (
                        <Check className="size-3 text-[#00A854]" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayAudio(primaryModelAnswer)}
                      className="h-6 px-2 text-[10px] font-mono font-extrabold gap-1 bg-card border border-border hover:bg-primary hover:text-primary-foreground shrink-0"
                      title="Nghe phát âm đáp án"
                    >
                      <Volume2 className="size-3" />
                      <span>NGHE CÂU</span>
                    </Button>
                  </div>
                </div>
                <p className="font-serif text-sm sm:text-base font-extrabold text-foreground leading-relaxed select-text cursor-text">
                  &ldquo;{primaryModelAnswer}&rdquo;
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectHintTier?.(4)}
                className="w-full text-left p-2.5 bg-background hover:bg-accent hover:text-accent-foreground border-2 border-dashed border-border transition-all flex items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                  <Lock className="size-3.5 text-primary shrink-0" />
                  <span>Mở gợi ý T4 (hoặc bấm [H] 4 lần) để xem câu mẫu hoàn chỉnh</span>
                </div>
                <span className="px-2 py-0.5 bg-foreground text-accent border border-border text-[10px] font-mono font-extrabold shrink-0 uppercase">
                  MỞ T4
                </span>
              </button>
            ))}

          {/* Say It Better (Bộ 3 cách nói bản xứ - Gated behind T4) */}
          {currentHintTier >= 4 &&
            task.sayItBetter &&
            (task.sayItBetter.casual ||
              task.sayItBetter.professional ||
              task.sayItBetter.idiomatic) && (
              <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
                <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                  <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary stroke-[2.5]" />
                    <span>BỘ 3 CÁCH NÓI BẢN XỨ (SAY IT BETTER):</span>
                  </div>
                </div>

                <div className="grid gap-2 text-xs font-mono">
                  {task.sayItBetter.casual && (
                    <div className="flex items-start justify-between gap-2 p-2 bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)]">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-extrabold uppercase text-[#00A854] block mb-0.5">
                          ☕ ĐỜI THƯỜNG (CASUAL):
                        </span>
                        <span className="text-foreground text-xs font-bold leading-snug block select-text cursor-text">
                          &ldquo;{task.sayItBetter.casual}&rdquo;
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(task.sayItBetter!.casual, "sib-casual")}
                          className="p-1 bg-secondary border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          title="Sao chép"
                        >
                          {copiedId === "sib-casual" ? (
                            <Check className="size-3 text-[#00A854]" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => handlePlayAudio(task.sayItBetter!.casual)}
                          className="size-6 p-0 bg-secondary border border-border text-foreground hover:bg-accent cursor-pointer"
                          title="Nghe cách nói đời thường"
                        >
                          <Volume2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {task.sayItBetter.professional && (
                    <div className="flex items-start justify-between gap-2 p-2 bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)]">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-extrabold uppercase text-primary block mb-0.5">
                          💼 CÔNG SỞ (PROFESSIONAL):
                        </span>
                        <span className="text-foreground text-xs font-bold leading-snug block select-text cursor-text">
                          &ldquo;{task.sayItBetter.professional}&rdquo;
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(task.sayItBetter!.professional, "sib-prof")}
                          className="p-1 bg-secondary border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          title="Sao chép"
                        >
                          {copiedId === "sib-prof" ? (
                            <Check className="size-3 text-[#00A854]" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => handlePlayAudio(task.sayItBetter!.professional)}
                          className="size-6 p-0 bg-secondary border border-border text-foreground hover:bg-accent cursor-pointer"
                          title="Nghe cách nói công sở"
                        >
                          <Volume2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {task.sayItBetter.idiomatic && (
                    <div className="flex items-start justify-between gap-2 p-2 bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)]">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-extrabold uppercase text-foreground bg-accent px-1 inline-block border border-border mb-0.5">
                          ⚡ KHẨU NGỮ (IDIOMATIC):
                        </span>
                        <span className="text-foreground text-xs font-bold leading-snug block select-text cursor-text">
                          &ldquo;{task.sayItBetter.idiomatic}&rdquo;
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(task.sayItBetter!.idiomatic, "sib-idiom")}
                          className="p-1 bg-secondary border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          title="Sao chép"
                        >
                          {copiedId === "sib-idiom" ? (
                            <Check className="size-3 text-[#00A854]" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => handlePlayAudio(task.sayItBetter!.idiomatic)}
                          className="size-6 p-0 bg-secondary border border-border text-foreground hover:bg-accent cursor-pointer"
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

          {/* 4-Tier Progressive Scaffolding Hints (JapSpeak Color-Coded Badges) */}
          {task.hints && task.hints.length > 0 && (
            <div className="bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground">
                  <Sparkles className="size-3.5 text-primary stroke-[2.5]" />
                  <span>GỢI Ý NẤC THANG (T1 → T4):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHintsExpanded(!isHintsExpanded)}
                  className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isHintsExpanded ? "[THU GỌN]" : "[MỞ RỘNG]"}</span>
                  <ChevronDown
                    className={`size-3 transition-transform duration-200 ${
                      isHintsExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {isHintsExpanded && (
                <div className="space-y-2 pt-0.5 animate-in fade-in-0 duration-150">
                  {task.hints
                    .filter((h) => h.tier >= 1 && h.tier <= 4)
                    .map((h) => {
                      const tierBadgeStyles = [
                        "bg-foreground text-background border-border", // T1: Deep Ink
                        "bg-primary text-primary-foreground border-border", // T2: Signal Orange
                        "bg-accent text-accent-foreground border-border", // T3: Volt Lime
                        "bg-[#00E676] text-[#0D0E0D] border-border", // T4: Emerald
                      ];
                      const badgeClass = tierBadgeStyles[h.tier - 1] || tierBadgeStyles[0];
                      const isUnlocked = h.tier <= currentHintTier;
                      const isFullSentenceTier = h.tier === 4;

                      if (!isUnlocked) {
                        return (
                          <button
                            key={h.tier}
                            type="button"
                            onClick={() => onSelectHintTier?.(h.tier as 0 | 1 | 2 | 3 | 4)}
                            className="w-full text-left p-2.5 border-2 border-dashed border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-mono font-extrabold border ${badgeClass}`}
                              >
                                T{h.tier}
                              </span>
                              <span className="text-xs font-mono font-bold text-foreground">
                                {h.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-extrabold text-muted-foreground group-hover:text-accent-foreground flex items-center gap-1 uppercase">
                              <Lock className="size-3" />
                              <span>BẤM ĐỂ MỞ T{h.tier}</span>
                            </span>
                          </button>
                        );
                      }

                      return (
                        <div
                          key={h.tier}
                          className="p-2.5 bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-mono font-extrabold border ${badgeClass}`}
                              >
                                T{h.tier}
                              </span>
                              <span className="text-xs font-mono font-extrabold uppercase text-foreground">
                                {h.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {h.content && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(h.content, `vn-hint-${h.tier}`)}
                                  className="text-muted-foreground hover:text-foreground p-1 bg-secondary border border-border cursor-pointer transition-colors"
                                  title="Sao chép nội dung gợi ý"
                                >
                                  {copiedId === `vn-hint-${h.tier}` ? (
                                    <Check className="size-3 text-[#00A854]" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              )}
                              {isFullSentenceTier && primaryModelAnswer && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePlayAudio(h.content || primaryModelAnswer)}
                                  className="h-6 px-2 text-[9px] font-mono font-extrabold gap-1 border border-border bg-secondary hover:bg-accent shrink-0 cursor-pointer"
                                  title="Nghe câu mẫu"
                                >
                                  <Volume2 className="size-2.5" />
                                  <span>NGHE</span>
                                </Button>
                              )}
                            </div>
                          </div>

                          <p className="font-mono text-xs font-bold text-foreground pl-0.5 leading-relaxed select-text cursor-text">
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
        <div className="pt-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono font-extrabold uppercase">
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-3.5 text-primary" />
            <span>BẤM PHÍM [H] ĐỂ MỞ TỪNG NẤC GỢI Ý</span>
          </span>
          <span className="px-1.5 py-0.5 bg-secondary text-foreground border border-border">
            TIER T{currentHintTier}/4
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
