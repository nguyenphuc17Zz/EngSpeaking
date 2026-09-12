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

interface Props {
  mode: "chain_builder" | "single_chunk";
  chainTask?: ChunkChainTask | null;
  singleTask?: ChunkTrainingTask | null;
  currentHintTier?: number;
  onSelectHintTier?: (tier: number) => void;
  onNextTask?: () => void;
  isGeneratingNext?: boolean;
}

export function ChunkPromptCard({
  mode,
  chainTask,
  singleTask,
  currentHintTier,
  onSelectHintTier,
  onNextTask,
  isGeneratingNext = false,
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
        badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
        border: "border-sky-500/30 bg-sky-500/5",
        title: "Khối 1: Đệm (Buffer)",
      },
      {
        badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
        border: "border-purple-500/30 bg-purple-500/5",
        title: "Khối 2: Lập trường (Stance)",
      },
      {
        badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
        border: "border-amber-500/30 bg-amber-500/5",
        title: "Khối 3: Lý do (Reason)",
      },
      {
        badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        border: "border-emerald-500/30 bg-emerald-500/5",
        title: "Khối 4: Ví dụ (Example)",
      },
    ];

    return (
      <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden flex flex-col h-full">
        <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
          {/* Top Meta */}
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                1. 4 Khối ngữ liên hoàn
              </span>
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border border-primary/30 text-primary">
                Chain Builder
              </Badge>
              {chainTask.strategyTitleVi && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {chainTask.strategyTitleVi}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onNextTask && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNextTask}
                  disabled={isGeneratingNext}
                  className="h-6 px-2 rounded-lg text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary gap-1 shrink-0 cursor-pointer shadow-2xs btn-spring"
                  title="Đổi sang chuỗi tiếp theo [R]"
                >
                  <span>Chuỗi tiếp theo</span>
                  <ArrowRight className="size-2.5" />
                </Button>
              )}
              <span className="text-[10px] font-mono text-muted-foreground">
                {(chainTask.targetLatencyMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Scrollable Container with Zero-scroll ergonomics */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
            {/* Situation & Target Question */}
            <div className="p-2.5 rounded-2xl bg-muted/25 border border-border/60 space-y-1">
              {chainTask.persona && (
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-semibold text-primary">Bối cảnh: </span>
                  <span className="italic text-foreground">{chainTask.persona}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-bold text-foreground leading-snug select-text cursor-text">
                  "{chainTask.targetQuestion}"
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(chainTask.targetQuestion, "chain-q-en")}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                    title="Sao chép câu hỏi"
                  >
                    {copiedId === "chain-q-en" ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(chainTask.targetQuestion)}
                    className="size-6 p-0 rounded-full text-primary hover:bg-primary/10"
                    title="Nghe câu hỏi"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 4 Block Assembly Chips List */}
            <div className="space-y-1.5">
              {chainTask.blocks.map((b, i) => {
                const color = blockColors[i] || blockColors[0];
                return (
                  <div
                    key={i}
                    className={`p-2 rounded-xl border ${color.border} shadow-2xs space-y-0.5 transition-all`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${color.badge}`}>
                          K{i + 1}
                        </span>
                        <span className="text-[10px] font-bold text-foreground">
                          {b.labelVi}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(b.suggestedChunk, `block-${i}`)}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted/60 cursor-pointer transition-colors"
                          title="Sao chép khối này"
                        >
                          {copiedId === `block-${i}` ? (
                            <Check className="size-2.5 text-emerald-500" />
                          ) : (
                            <Copy className="size-2.5" />
                          )}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayAudio(b.suggestedChunk)}
                          className="size-5 p-0 rounded-md text-primary hover:bg-primary/10"
                          title="Nghe khối này"
                        >
                          <Volume2 className="size-2.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="font-mono text-xs font-bold text-foreground pl-0.5 select-text cursor-text">
                      "{b.suggestedChunk}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom pacing guide */}
          <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono">
            <span>Chủ đề: {chainTask.topic}</span>
            <span>Nói liền mạch 4 khối ngữ</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Single Chunk Mode
  if (mode === "single_chunk" && singleTask) {
    return (
      <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden flex flex-col h-full">
        <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
          {/* Top Meta */}
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                1. Cụm khẩu ngữ cốt lõi
              </span>
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border border-primary/30 text-primary capitalize">
                {singleTask.contextDomain}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onNextTask && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNextTask}
                  disabled={isGeneratingNext}
                  className="h-6 px-2 rounded-lg text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary gap-1 shrink-0 cursor-pointer shadow-2xs btn-spring"
                  title="Đổi sang cụm từ tiếp theo [R]"
                >
                  <span>Cụm tiếp theo</span>
                  <ArrowRight className="size-2.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Scrollable Container with Zero-scroll ergonomics */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
            {/* Situation & Target Question */}
            <div className="p-2.5 rounded-2xl bg-muted/25 border border-border/60 space-y-1">
              <div className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-primary">Tình huống: </span>
                <span className="text-foreground">{singleTask.situationVi}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-bold text-foreground font-mono select-text cursor-text">
                  "{singleTask.promptText}"
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(singleTask.promptText, "single-prompt-text")}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                    title="Sao chép câu hỏi"
                  >
                    {copiedId === "single-prompt-text" ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(singleTask.promptText)}
                    className="size-6 p-0 rounded-full text-primary hover:bg-primary/10"
                    title="Nghe câu hỏi"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Target Chunk Focus Card */}
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  Cụm khẩu ngữ mục tiêu:
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(singleTask.chunk.canonicalChunk, "target-chunk")}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/60 cursor-pointer transition-colors"
                    title="Sao chép cụm từ"
                  >
                    {copiedId === "target-chunk" ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(singleTask.chunk.canonicalChunk)}
                    className="size-6 p-0 rounded-full text-primary hover:bg-primary/20"
                    title="Nghe phát âm cụm từ"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="font-mono text-base sm:text-lg font-bold text-foreground select-text cursor-text">
                "{singleTask.chunk.canonicalChunk}"
              </div>
              <p className="text-xs text-muted-foreground">
                Ý nghĩa: <span className="text-foreground font-semibold">{singleTask.chunk.meaningVi}</span>
              </p>
            </div>

            {/* Variants Chips Bar */}
            {singleTask.chunk.variants && singleTask.chunk.variants.length > 0 && (
              <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 shadow-2xs">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-500" />
                  <span>Các biến thể tương đương (Variants):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {singleTask.chunk.variants.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePlayAudio(v.expression)}
                      className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-xs transition-all shadow-2xs cursor-pointer btn-spring"
                      title={`Bấm để nghe: "${v.expression}"`}
                    >
                      <span className="font-bold text-foreground font-mono text-xs">{v.expression}</span>
                      <Volume2 className="size-2.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom status */}
          <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono">
            <span>Độ trễ mục tiêu: {(singleTask.targetLatencyMs / 1000).toFixed(1)}s</span>
            <span>Khối ngữ phản xạ tự nhiên</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
