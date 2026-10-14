"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Target,
} from "lucide-react";
import type { ChunkChainTask, ChunkTrainingTask } from "@/types/chunk-automaticity";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  mode: "chain_builder" | "single_chunk";
  chainTask?: ChunkChainTask | null;
  singleTask?: ChunkTrainingTask | null;
  currentHintTier?: number;
  onSelectHintTier?: (tier: number) => void;
  onNextTask?: () => void;
  isGeneratingNext?: boolean;
  onRegenerateAI?: () => void;
  isRegeneratingAI?: boolean;
}

export function ChunkPromptCard({
  mode,
  chainTask,
  singleTask,
  currentHintTier,
  onSelectHintTier,
  onNextTask,
  isGeneratingNext = false,
  onRegenerateAI,
  isRegeneratingAI = false,
}: Props) {
  const tts = useBrowserTTS();
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

  if (mode === "chain_builder" && chainTask) {
    const blockColors = [
      {
        badge: "bg-foreground text-background border-border",
        code: "1. BUFFER",
      },
      {
        badge: "bg-primary text-primary-foreground border-border",
        code: "2. STANCE",
      },
      {
        badge: "bg-accent text-accent-foreground border-border",
        code: "3. REASON",
      },
      {
        badge: "bg-[#00E676] text-[#0D0E0D] border-border",
        code: "4. EXAMPLE",
      },
    ];

    return (
      <Card className="h-full flex flex-col justify-between rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden">
        <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
          {/* Top Meta */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b-2 border-border pb-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="size-2.5 bg-primary border border-border shrink-0" />
              <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground">
                1. 4 KHỐI NGỮ LIÊN HOÀN
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-mono font-extrabold px-1.5 py-0 border bg-accent text-accent-foreground border-border uppercase"
              >
                {chainTask.strategyTitleVi || "DAG-4 CHAIN"}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {onRegenerateAI && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={onRegenerateAI}
                  disabled={isRegeneratingAI || isGeneratingNext}
                  className="h-6 px-2 text-[10px] gap-1 text-foreground border-2 border-border bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer font-mono font-extrabold shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                  title="Tạo chuỗi câu mới bằng AI"
                >
                  <Sparkles className={cn("size-3 text-primary", isRegeneratingAI && "animate-spin")} />
                  <span>{isRegeneratingAI ? "ĐANG TẠO..." : "TẠO MỚI AI"}</span>
                </Button>
              )}
              <span className="px-1.5 py-0.5 bg-foreground text-background border border-border text-[10px] font-mono font-extrabold">
                {(chainTask.targetLatencyMs / 1000).toFixed(1)}S
              </span>
            </div>
          </div>

          {/* Scrollable Container with Zero-scroll ergonomics */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
            {/* Situation & Target Question */}
            <div className="p-3.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-1.5">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1 truncate">
                  <Target className="size-3 stroke-[2.5] shrink-0" />
                  <span className="truncate">{chainTask.persona || "CÂU HỎI PHẢN XẠ"}</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-secondary text-foreground border border-border uppercase">
                    {chainTask.source === "ai" ? "AI GEN" : "BANK 70/30"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(chainTask.targetQuestion, "chain-q-en")}
                    className="text-muted-foreground hover:text-foreground p-1 border border-transparent hover:border-border bg-card cursor-pointer transition-colors"
                    title="Sao chép câu hỏi"
                  >
                    {copiedId === "chain-q-en" ? (
                      <Check className="size-3 text-[#00A854]" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(chainTask.targetQuestion)}
                    className="h-6 px-1.5 text-[10px] font-mono font-extrabold gap-1 border border-border bg-card hover:bg-accent"
                    title="Nghe câu hỏi"
                  >
                    <Volume2 className="size-3" />
                  </Button>
                </div>
              </div>

              <h2 className="font-serif text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-snug select-text cursor-text">
                &ldquo;{chainTask.targetQuestion}&rdquo;
              </h2>
            </div>

            {/* 4 Block Assembly Chips List */}
            <div className="space-y-2">
              {chainTask.blocks.map((b, i) => {
                const color = blockColors[i] || blockColors[0];
                return (
                  <div
                    key={i}
                    className="p-2.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-mono font-extrabold border shrink-0 uppercase ${color.badge}`}
                        >
                          {color.code}
                        </span>
                        <span className="text-[10px] font-mono font-extrabold uppercase text-foreground truncate">
                          {b.labelVi}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(b.suggestedChunk, `block-${i}`)}
                          className="text-muted-foreground hover:text-foreground p-1 bg-card border border-border cursor-pointer transition-colors"
                          title="Sao chép khối này"
                        >
                          {copiedId === `block-${i}` ? (
                            <Check className="size-2.5 text-[#00A854]" />
                          ) : (
                            <Copy className="size-2.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(b.suggestedChunk)}
                          className="p-1 bg-card hover:bg-accent text-foreground border border-border cursor-pointer transition-colors"
                          title="Nghe khối này"
                        >
                          <Volume2 className="size-2.5" />
                        </button>
                      </div>
                    </div>

                    <p className="font-mono text-xs font-extrabold text-foreground pl-0.5 select-text cursor-text">
                      &ldquo;{b.suggestedChunk}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom pacing guide */}
          <div className="pt-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono font-extrabold uppercase">
            <span className="truncate max-w-[180px]">CHỦ ĐỀ: {chainTask.topic}</span>
            <span className="px-1.5 py-0.5 bg-secondary text-foreground border border-border">
              DAG 4 KHỐI
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Single Chunk Mode
  if (mode === "single_chunk" && singleTask) {
    return (
      <Card className="h-full flex flex-col justify-between rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden">
        <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
          {/* Top Meta */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b-2 border-border pb-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="size-2.5 bg-primary border border-border shrink-0" />
              <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground">
                1. CỤM KHẨU NGỮ CỐT LÕI
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-mono font-extrabold px-1.5 py-0 border bg-accent text-accent-foreground border-border uppercase"
              >
                {singleTask.contextDomain}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              {onRegenerateAI && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={onRegenerateAI}
                  disabled={isRegeneratingAI || isGeneratingNext}
                  className="h-6 px-2 text-[10px] gap-1 text-foreground border-2 border-border bg-secondary hover:bg-accent hover:text-accent-foreground cursor-pointer font-mono font-extrabold shadow-[2px_2px_0px_var(--industrial-shadow-color)]"
                  title="Tạo bài tập cụm từ mới bằng AI"
                >
                  <Sparkles className={cn("size-3 text-primary", isRegeneratingAI && "animate-spin")} />
                  <span>{isRegeneratingAI ? "ĐANG TẠO..." : "TẠO MỚI AI"}</span>
                </Button>
              )}
              <span className="px-1.5 py-0.5 bg-foreground text-background border border-border text-[10px] font-mono font-extrabold">
                {(singleTask.targetLatencyMs / 1000).toFixed(1)}S
              </span>
            </div>
          </div>

          {/* Scrollable Container with Zero-scroll ergonomics */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-0">
            {/* Situation & Target Question */}
            <div className="p-3.5 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-1.5">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1 truncate">
                  <Target className="size-3 stroke-[2.5] shrink-0" />
                  <span className="truncate">{singleTask.situationVi}</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-secondary text-foreground border border-border uppercase">
                    {singleTask.source === "ai" ? "AI GEN" : "BANK 70/30"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(singleTask.promptText, "single-prompt-text")}
                    className="text-muted-foreground hover:text-foreground p-1 border border-transparent hover:border-border bg-card cursor-pointer transition-colors"
                    title="Sao chép câu hỏi"
                  >
                    {copiedId === "single-prompt-text" ? (
                      <Check className="size-3 text-[#00A854]" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(singleTask.promptText)}
                    className="h-6 px-1.5 text-[10px] font-mono font-extrabold gap-1 border border-border bg-card hover:bg-accent"
                    title="Nghe câu hỏi"
                  >
                    <Volume2 className="size-3" />
                  </Button>
                </div>
              </div>

              <h2 className="font-serif text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-snug select-text cursor-text">
                &ldquo;{singleTask.promptText}&rdquo;
              </h2>
            </div>

            {/* Target Chunk Focus Card */}
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold text-primary uppercase tracking-wider">
                  CỤM KHẨU NGỮ MỤC TIÊU:
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(singleTask.chunk.canonicalChunk, "target-chunk")}
                    className="text-muted-foreground hover:text-foreground p-1 bg-card border border-border cursor-pointer transition-colors"
                    title="Sao chép cụm từ"
                  >
                    {copiedId === "target-chunk" ? (
                      <Check className="size-3 text-[#00A854]" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(singleTask.chunk.canonicalChunk)}
                    className="h-6 px-2 text-[10px] font-mono font-extrabold gap-1 border border-border bg-card hover:bg-accent"
                    title="Nghe phát âm cụm từ"
                  >
                    <Volume2 className="size-3" />
                    <span>NGHE</span>
                  </Button>
                </div>
              </div>

              <div className="font-serif text-lg sm:text-xl font-extrabold text-foreground select-text cursor-text">
                &ldquo;{singleTask.chunk.canonicalChunk}&rdquo;
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                Ý NGHĨA: <span className="text-foreground font-extrabold">{singleTask.chunk.meaningVi}</span>
              </p>
            </div>

            {/* Variants Chips Bar */}
            {singleTask.chunk.variants && singleTask.chunk.variants.length > 0 && (
              <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
                <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-dashed border-border pb-1">
                  <Sparkles className="size-3.5 text-primary stroke-[2.5]" />
                  <span>CÁC BIẾN THỂ TƯƠNG ĐƯƠNG (VARIANTS):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {singleTask.chunk.variants.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePlayAudio(v.expression)}
                      className="group inline-flex items-stretch bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] hover:bg-accent hover:text-accent-foreground transition-all text-xs cursor-pointer active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      title={`Bấm để nghe: "${v.expression}"`}
                    >
                      <span className="px-1.5 py-1 bg-secondary group-hover:bg-primary group-hover:text-primary-foreground border-r-2 border-border flex items-center justify-center transition-colors">
                        <Volume2 className="size-3 stroke-[2.5]" />
                      </span>
                      <span className="px-2 py-1 font-mono font-extrabold text-foreground group-hover:text-accent-foreground text-xs">
                        {v.expression}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom status */}
          <div className="pt-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono font-extrabold uppercase">
            <span>SLA LATENCY: {(singleTask.targetLatencyMs / 1000).toFixed(1)}S</span>
            <span className="px-1.5 py-0.5 bg-secondary text-foreground border border-border">
              CHUNK RECALL
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
