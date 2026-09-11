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
  ChevronDown,
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
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  const cleanChunkPrefix = (text?: string | null): string => {
    if (!text) return "";
    return text
      .replace(/^(chuỗi câu mẫu hoàn chỉnh|câu mẫu hoàn chỉnh|câu mẫu|sample sentence|sample response|model answer):\s*/i, "")
      .trim();
  };

  const isFullChunkSentence = (text?: string | null, targetChunk?: string): boolean => {
    if (!text) return false;
    const clean = text.trim();
    if (!clean || clean.includes("______")) return false;
    if (targetChunk && clean.toLowerCase() === targetChunk.trim().toLowerCase()) return false;
    return clean.split(/\s+/).length >= 4;
  };

  if (mode === "chain_builder" && chainTask) {
    const fullChainSpeech =
      chainTask.expectedAssemblyExample ||
      cleanChunkPrefix(chainTask.hints?.find((h) => h.tier === 4)?.content) ||
      "";
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground font-mono text-xs px-2.5 py-0.5 rounded-full">
                Chain Builder • 4 Blocks
              </Badge>
              {chainTask.strategyTitleVi && (
                <Badge variant="secondary" className="text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                  {chainTask.strategyTitleVi}
                </Badge>
              )}
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
            {chainTask.persona && (
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-primary">Bối cảnh: </span>
                <span className="italic text-foreground">{chainTask.persona}</span>
              </div>
            )}
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
              {chainTask.expectedAssemblyExample && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(chainTask.expectedAssemblyExample)}
                  className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 btn-spring shrink-0"
                  title="Nghe toàn bộ chuỗi câu mẫu hoàn chỉnh (Full speech)"
                >
                  <Volume2 className="size-3" />
                  <span>Nghe full chuỗi</span>
                </Button>
              )}
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
          {/* 4-Tier Progressive Hints (Stack List - Open by Default) */}
          {chainTask.hints && chainTask.hints.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5 mt-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý nấc thang ghép chuỗi (T1 - T4):</span>
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
                  {chainTask.hints
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

                            {isFullSentenceTier && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (fullChainSpeech) {
                                    handlePlayAudio(fullChainSpeech);
                                  } else if (!h.content.includes("______")) {
                                    handlePlayAudio(cleanChunkPrefix(h.content));
                                  }
                                }}
                                className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold btn-spring"
                                title="Nghe chuỗi câu hoàn chỉnh"
                              >
                                <Volume2 className="size-3" />
                                <span>{h.tier === 3 ? "Nghe full chuỗi" : "Nghe mẫu"}</span>
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
        </CardContent>

        {/* Bottom Bar: Quick Hint Status */}
        <div className="p-3 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3 text-amber-500" />
            <span>Nấc thang ghép chuỗi</span>
          </span>
          <button
            type="button"
            onClick={() => setIsHintsExpanded(!isHintsExpanded)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
            title="Bấm để ẩn hoặc hiện toàn bộ gợi ý T1-T4"
          >
            <Zap className="size-3 text-amber-500" />
            <span>{isHintsExpanded ? "Gợi ý T1-T4: Đang hiện" : "Gợi ý T1-T4: Đã ẩn (Bấm mở)"}</span>
          </button>
        </div>
      </Card>
    );
  }

  // Single Chunk Mode
  if (mode === "single_chunk" && singleTask) {
    const currentHint = singleTask.hints?.find((h) => h.tier === currentHintTier);
    const tier4Hint = cleanChunkPrefix(singleTask.hints?.find((h) => h.tier === 4)?.content);
    const exampleSentence = singleTask.chunk.exampleSentences
      ?.map(cleanChunkPrefix)
      .find((s) => isFullChunkSentence(s, singleTask.chunk.canonicalChunk));

    const singleModelSentence =
      (isFullChunkSentence(tier4Hint, singleTask.chunk.canonicalChunk) && tier4Hint) ||
      exampleSentence ||
      tier4Hint ||
      "";

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
              <div className="flex items-center gap-1">
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
                {singleModelSentence && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(singleModelSentence)}
                    className="h-6 px-2 text-[10px] font-semibold gap-1 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 btn-spring"
                    title="Nghe câu mẫu hoàn chỉnh"
                  >
                    <Volume2 className="size-3" />
                    <span>Nghe câu mẫu</span>
                  </Button>
                )}
              </div>
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
          {/* 4-Tier Progressive Hints (Stack List - Open by Default) */}
          {singleTask.hints && singleTask.hints.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5 mt-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý nấc thang cụm từ (T1 - T4):</span>
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
                  {singleTask.hints
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
                      const fullSentence =
                        singleTask.hints?.find((hint) => hint.tier === 4)?.content ||
                        singleTask.chunk.exampleSentences?.[0] ||
                        "";

                      return (
                        <div key={h.tier} className={`p-2.5 rounded-xl border ${style.border} shadow-2xs space-y-1`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${style.badge}`}>
                                T{h.tier}
                              </span>
                              <span className="text-xs font-bold text-foreground">{h.title}</span>
                            </div>

                            {isFullSentenceTier && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (singleModelSentence) {
                                    handlePlayAudio(singleModelSentence);
                                  } else if (!h.content.includes("______")) {
                                    handlePlayAudio(cleanChunkPrefix(h.content));
                                  }
                                }}
                                className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold btn-spring"
                                title="Nghe câu mẫu hoàn chỉnh"
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
        </CardContent>

        {/* Bottom Bar: Quick Hint Status */}
        <div className="p-3 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3 text-amber-500" />
            <span>Nấc thang cụm phản xạ</span>
          </span>
          <button
            type="button"
            onClick={() => setIsHintsExpanded(!isHintsExpanded)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
            title="Bấm để ẩn hoặc hiện toàn bộ gợi ý T1-T4"
          >
            <Zap className="size-3 text-amber-500" />
            <span>{isHintsExpanded ? "Gợi ý T1-T4: Đang hiện" : "Gợi ý T1-T4: Đã ẩn (Bấm mở)"}</span>
          </button>
        </div>
      </Card>
    );
  }

  return null;
}
