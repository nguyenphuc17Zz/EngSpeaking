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
  Zap,
  Lock,
} from "lucide-react";
import type { ChunkChainTask, ChunkTrainingTask } from "@/types/chunk-automaticity";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { toast } from "@/lib/toast";

interface ChunkContextCardProps {
  mode: "chain_builder" | "single_chunk";
  chainTask?: ChunkChainTask | null;
  singleTask?: ChunkTrainingTask | null;
  currentHintTier: number;
  onSelectHintTier?: (tier: number) => void;
}

export function ChunkContextCard({
  mode,
  chainTask,
  singleTask,
  currentHintTier = 0,
  onSelectHintTier,
}: ChunkContextCardProps) {
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

  const cleanChunkPrefix = (text?: string | null): string => {
    if (!text) return "";
    return text
      .replace(/^(chuỗi câu mẫu hoàn chỉnh|câu mẫu hoàn chỉnh|câu mẫu|sample sentence|sample response|model answer):\s*/i, "")
      .trim();
  };

  const fullChainSpeech =
    mode === "chain_builder"
      ? chainTask?.expectedAssemblyExample ||
        cleanChunkPrefix(chainTask?.hints?.find((h) => h.tier === 4)?.content) ||
        ""
      : cleanChunkPrefix(singleTask?.hints?.find((h) => h.tier === 4)?.content) ||
        singleTask?.expectedChunkUsage ||
        singleTask?.chunk?.exampleSentences?.[0] ||
        "";

  const hints = mode === "chain_builder" ? chainTask?.hints : singleTask?.hints;

  const dagBlocks = [
    { label: "1. BUFFER", style: "bg-foreground text-background border-border" },
    { label: "2. STANCE", style: "bg-primary text-primary-foreground border-border" },
    { label: "3. REASON", style: "bg-accent text-accent-foreground border-border" },
    { label: "4. EXAMPLE", style: "bg-[#00E676] text-[#0D0E0D] border-border" },
  ];

  return (
    <Card className="rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Header Meta Row */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-border pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2.5 bg-accent border border-border shrink-0" />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground truncate">
              {mode === "chain_builder" ? "2. CÚ PHÁP GHÉP & GỢI Ý" : "2. MẪU CÂU & GỢI Ý"}
            </span>
          </div>

          <div className="flex items-center gap-0.5 bg-secondary p-0.5 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] shrink-0">
            {[0, 1, 2, 3, 4].map((t) => (
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

        {/* Scrollable Container with Zero-scroll ergonomics */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
          {/* 4-Block DAG Flow Strip (Chain Builder Mode) */}
          {mode === "chain_builder" && (
            <div className="p-2.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1">
                  <Layers className="size-3 text-primary stroke-[2.5]" />
                  <span>CẤU TRÚC CHUỖI 4 KHỐI (DAG-4 PIPELINE):</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {dagBlocks.map((b, idx) => (
                  <span
                    key={b.label}
                    className={`px-2 py-0.5 text-[10px] font-mono font-extrabold border uppercase ${b.style}`}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full Assembly / Model Sentence Card (Gated behind T4) */}
          {fullChainSpeech &&
            (currentHintTier >= 4 ? (
              <div className="p-3 bg-accent/35 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" />
                    <span>
                      {mode === "chain_builder"
                        ? "CHUỖI CÂU HOÀN CHỈNH MẪU (T4 UNLOCKED):"
                        : "CÂU MẪU HOÀN CHỈNH (T4 UNLOCKED):"}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(fullChainSpeech, "chunk-assembly-model")}
                      className="size-6 p-0 bg-card border border-border shrink-0"
                      title="Sao chép câu hoàn chỉnh"
                    >
                      {copiedId === "chunk-assembly-model" ? (
                        <Check className="size-3 text-[#00A854]" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayAudio(fullChainSpeech)}
                      className="h-6 px-2 text-[10px] font-mono font-extrabold gap-1 bg-card border border-border hover:bg-primary hover:text-primary-foreground shrink-0"
                      title="Nghe chuỗi câu mẫu"
                    >
                      <Volume2 className="size-3" />
                      <span>NGHE CHUỖI</span>
                    </Button>
                  </div>
                </div>
                <p className="font-serif text-sm sm:text-base font-extrabold text-foreground leading-relaxed select-text cursor-text">
                  &ldquo;{fullChainSpeech}&rdquo;
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

          {/* 4-Tier Progressive Hints */}
          {hints && hints.length > 0 && (
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
                  {hints
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
                            onClick={() => onSelectHintTier?.(h.tier)}
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
                                  onClick={() => handleCopy(h.content, `chunk-hint-${h.tier}`)}
                                  className="text-muted-foreground hover:text-foreground p-1 bg-secondary border border-border cursor-pointer transition-colors"
                                  title="Sao chép nội dung gợi ý"
                                >
                                  {copiedId === `chunk-hint-${h.tier}` ? (
                                    <Check className="size-3 text-[#00A854]" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </button>
                              )}
                              {isFullSentenceTier && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (fullChainSpeech) {
                                      handlePlayAudio(fullChainSpeech);
                                    } else if (!h.content.includes("______")) {
                                      handlePlayAudio(cleanChunkPrefix(h.content));
                                    }
                                  }}
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
