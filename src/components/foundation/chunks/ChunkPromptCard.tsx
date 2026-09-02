"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  Sparkles,
  Layers,
  HelpCircle,
  Clock,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Zap,
} from "lucide-react";
import type { ChunkChainTask, ChunkTrainingTask } from "@/types/chunk-automaticity";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface Props {
  mode: "chain_builder" | "single_chunk";
  chainTask?: ChunkChainTask | null;
  singleTask?: ChunkTrainingTask | null;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
}

export function ChunkPromptCard({
  mode,
  chainTask,
  singleTask,
  currentHintTier,
  onSelectHintTier,
}: Props) {
  const tts = useBrowserTTS();

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

    const currentHint = chainTask.hints?.find((h) => h.tier === currentHintTier);

    return (
      <Card className="h-full rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col justify-between overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-mono text-xs px-2.5 py-0.5 rounded-full">
                Chain Builder • 4 Blocks
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono">
                Chủ đề: {chainTask.topic}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Clock className="size-3.5 text-primary" />
              <span>Mục tiêu: {(chainTask.targetLatencyMs / 1000).toFixed(1)}s</span>
            </div>
          </div>

          {/* Situation & Target Question */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              Tình huống: <span className="text-foreground">{chainTask.situationVi}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Câu hỏi hội thoại mục tiêu
                </span>
                <p className="text-sm sm:text-base font-bold text-foreground font-mono">
                  "{chainTask.targetQuestion}"
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlayAudio(chainTask.targetQuestion)}
                className="size-8 p-0 rounded-full shrink-0 text-primary hover:bg-primary/10"
                title="Nghe câu hỏi"
              >
                <Volume2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* 4 Visual Colored Blocks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span>4 Khối ghép câu (Speech Blocks):</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">Nói liền mạch 4 khối</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {chainTask.blocks.map((block, idx) => {
                const styling = blockColors[idx] || blockColors[0];
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border ${styling.border} space-y-1.5 flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-[10px] font-mono ${styling.badge}`}>
                        {styling.title}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayAudio(block.suggestedChunk)}
                        className="size-6 p-0 rounded-full shrink-0 hover:bg-black/5 dark:hover:bg-white/10"
                        title="Nghe cụm này"
                      >
                        <Volume2 className="size-3" />
                      </Button>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-foreground font-mono leading-tight">
                      "{block.suggestedChunk}"
                    </p>

                    {block.alternativeChunks && block.alternativeChunks.length > 0 && (
                      <div className="pt-1 text-[10px] text-muted-foreground truncate">
                        Tùy chọn: {block.alternativeChunks.slice(0, 2).join(" / ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connectors / Vocabulary Chips Bar */}
          {chainTask.suggestedVocabulary && chainTask.suggestedVocabulary.length > 0 && (
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3 text-amber-500" />
                <span>Từ nối chuyển đoạn gợi ý (Connectors):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chainTask.suggestedVocabulary.map((vocab, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePlayAudio(vocab.term)}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background border border-border/80 hover:border-primary/50 text-xs transition-all shadow-2xs"
                    title="Bấm để nghe phát âm"
                  >
                    <span className="font-bold text-foreground font-mono">{vocab.term}</span>
                    <span className="text-[10px] text-muted-foreground">({vocab.meaningVi})</span>
                    <Volume2 className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* 4-Tier Inline Stepper Dock */}
        <div className="p-4 bg-muted/30 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Zap className="size-3 text-amber-500 fill-amber-500" />
              <span>Gợi ý nấc thang (Inline Stepper):</span>
            </span>
            {currentHintTier > 0 && (
              <button
                onClick={() => onSelectHintTier(0)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Ẩn gợi ý
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { tier: 1, label: "T1: 4 Khối" },
              { tier: 2, label: "T2: Từ nối" },
              { tier: 3, label: "T3: Khung câu" },
              { tier: 4, label: "T4: Chuỗi mẫu" },
            ].map((btn) => {
              const isActive = currentHintTier === btn.tier;
              return (
                <button
                  key={btn.tier}
                  type="button"
                  onClick={() => onSelectHintTier(isActive ? 0 : btn.tier)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background/80 hover:bg-background text-foreground border-border/80"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Active Hint Content Card */}
          {currentHint && currentHintTier > 0 && (
            <div className="p-3.5 rounded-2xl bg-card border border-primary/40 shadow-xs space-y-1.5 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Lightbulb className="size-3.5 text-amber-500 fill-amber-500" />
                  <span>{currentHint.title}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(currentHint.content)}
                  className="size-6 p-0 rounded-md text-primary hover:bg-primary/10"
                  title="Nghe gợi ý"
                >
                  <Volume2 className="size-3.5" />
                </Button>
              </div>
              <p className="text-xs font-mono text-foreground leading-relaxed">
                {currentHint.content}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Single Chunk Mode
  if (mode === "single_chunk" && singleTask) {
    const currentHint = singleTask.hints?.find((h) => h.tier === currentHintTier);

    return (
      <Card className="h-full rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col justify-between overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-mono text-xs px-2.5 py-0.5 rounded-full">
                Single Chunk Practice
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono capitalize">
                Lĩnh vực: {singleTask.contextDomain}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Clock className="size-3.5 text-primary" />
              <span>Mục tiêu: {(singleTask.targetLatencyMs / 1000).toFixed(1)}s</span>
            </div>
          </div>

          {/* Situation & Target Question */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">
              Tình huống: <span className="text-foreground">{singleTask.situationVi}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Câu hỏi hội thoại
                </span>
                <p className="text-sm sm:text-base font-bold text-foreground font-mono">
                  "{singleTask.promptText}"
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlayAudio(singleTask.promptText)}
                className="size-8 p-0 rounded-full shrink-0 text-primary hover:bg-primary/10"
                title="Nghe câu hỏi"
              >
                <Volume2 className="size-4" />
              </Button>
            </div>
          </div>

          {/* Target Chunk Focus Card */}
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Cụm khẩu ngữ mục tiêu:
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlayAudio(singleTask.chunk.canonicalChunk)}
                className="size-7 p-0 rounded-full text-primary hover:bg-primary/20"
                title="Nghe cụm từ"
              >
                <Volume2 className="size-3.5" />
              </Button>
            </div>

            <div className="font-mono text-base sm:text-lg font-bold text-foreground">
              "{singleTask.chunk.canonicalChunk}"
            </div>
            <p className="text-xs text-muted-foreground">
              Ý nghĩa: <span className="text-foreground font-semibold">{singleTask.chunk.meaningVi}</span>
            </p>
          </div>

          {/* Variants Chips Bar */}
          {singleTask.chunk.variants && singleTask.chunk.variants.length > 0 && (
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/60 space-y-1.5">
              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3 text-amber-500" />
                <span>Các biến thể tương đương (Variants):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {singleTask.chunk.variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handlePlayAudio(v.expression)}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-background border border-border/80 hover:border-primary/50 text-xs transition-all shadow-2xs"
                    title="Bấm để nghe phát âm"
                  >
                    <span className="font-bold text-foreground font-mono">{v.expression}</span>
                    <Volume2 className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        {/* 4-Tier Inline Stepper Dock */}
        <div className="p-4 bg-muted/30 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Zap className="size-3 text-amber-500 fill-amber-500" />
              <span>Gợi ý nấc thang (Inline Stepper):</span>
            </span>
            {currentHintTier > 0 && (
              <button
                onClick={() => onSelectHintTier(0)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Ẩn gợi ý
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { tier: 1, label: "T1: Cụm" },
              { tier: 2, label: "T2: Biến thể" },
              { tier: 3, label: "T3: Khung câu" },
              { tier: 4, label: "T4: Câu mẫu" },
            ].map((btn) => {
              const isActive = currentHintTier === btn.tier;
              return (
                <button
                  key={btn.tier}
                  type="button"
                  onClick={() => onSelectHintTier(isActive ? 0 : btn.tier)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background/80 hover:bg-background text-foreground border-border/80"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Active Hint Content Card */}
          {currentHint && currentHintTier > 0 && (
            <div className="p-3.5 rounded-2xl bg-card border border-primary/40 shadow-xs space-y-1.5 animate-in fade-in-0 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Lightbulb className="size-3.5 text-amber-500 fill-amber-500" />
                  <span>{currentHint.title}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(currentHint.content)}
                  className="size-6 p-0 rounded-md text-primary hover:bg-primary/10"
                  title="Nghe gợi ý"
                >
                  <Volume2 className="size-3.5" />
                </Button>
              </div>
              <p className="text-xs font-mono text-foreground leading-relaxed">
                {currentHint.content}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return null;
}
