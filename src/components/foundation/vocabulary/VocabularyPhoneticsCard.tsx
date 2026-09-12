"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  Zap,
  Target,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { decomposeIpa, getMinimalPairContrast } from "@/lib/foundation/vocabulary/phoneme-stress.engine";
import type { SpokenWordItem } from "@/types/vocabulary-context";

interface VocabularyPhoneticsCardProps {
  step: 1 | 2;
  wordItem: SpokenWordItem;
  isEnriching?: boolean;
  onDeepEnrichWithAI?: () => void;
  wordMasteryThreshold?: number;
  onNextWord?: () => void;
  isSearchingNext?: boolean;
}

export function VocabularyPhoneticsCard({
  step,
  wordItem,
  isEnriching,
  onDeepEnrichWithAI,
  wordMasteryThreshold = 80,
  onNextWord,
  isSearchingNext,
}: VocabularyPhoneticsCardProps) {
  const [showL1Details, setShowL1Details] = useState(false);
  const tts = useBrowserTTS();

  const handlePlay = (text: string) => tts.speak(sanitizeTextForTTS(text));
  const wordMastered = wordItem.wordMasteryScore >= wordMasteryThreshold;

  // Real-time phonological diagnostics
  const phonemeAnalysis = decomposeIpa(wordItem.ipaUS);
  const minimalPair = getMinimalPairContrast(wordItem.word);
  const topPitfall = phonemeAnalysis.vietnameseL1Pitfalls?.[0];

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Header Meta Row */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {step === 1 ? "1. Âm vị học" : "1. Từ vựng mục tiêu"}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-border/70 px-1.5 py-0">
              {wordItem.partOfSpeech} · {wordItem.cefrLevel}
            </Badge>
            {wordMastered && (
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 px-1.5 py-0">
                ✓ Đã làm chủ
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onNextWord && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNextWord}
                disabled={isSearchingNext || isEnriching}
                className="h-6 px-2 rounded-lg text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 hover:border-primary gap-1 shrink-0 cursor-pointer shadow-2xs btn-spring"
                title="Học từ tiếp theo trong kho từ điển [R]"
              >
                <span>Từ tiếp theo</span>
                <ArrowRight className="size-2.5" />
              </Button>
            )}

            {onDeepEnrichWithAI && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeepEnrichWithAI}
                disabled={isEnriching}
                className="h-6 px-2 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1 shrink-0 cursor-pointer"
                title="Phân tích sâu hơn qua AI"
              >
                <Sparkles className={`size-3 ${isEnriching ? "animate-spin" : ""}`} />
                <span>{isEnriching ? "AI..." : "AI Enrich"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable Container with Zero-scroll fallback */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {/* Word Hero & Pronunciation */}
          <div className="text-center space-y-1 p-2.5 rounded-2xl bg-muted/25 border border-border/60">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
              {wordItem.word}
            </h2>

            <div className="flex items-center justify-center gap-2 flex-wrap pt-0.5">
              <button
                type="button"
                onClick={() => handlePlay(wordItem.word)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/70 hover:border-primary/50 text-foreground transition-all group shadow-2xs cursor-pointer"
                title="Nghe phát âm chuẩn US"
              >
                <Volume2 className="size-3.5 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-mono text-xs font-bold text-primary">{wordItem.ipaUS}</span>
                {wordItem.ipaUK && (
                  <span className="text-[10px] font-mono text-muted-foreground/70">
                    (UK: {wordItem.ipaUK})
                  </span>
                )}
              </button>
            </div>

            <p className="text-xs font-semibold text-foreground/90 pt-0.5">
              {wordItem.meaningVi}
            </p>
            {wordItem.englishDefinition && (
              <p className="text-[11px] text-muted-foreground italic max-w-xs mx-auto leading-tight line-clamp-2">
                "{wordItem.englishDefinition}"
              </p>
            )}
          </div>

          {/* Syllables Breakdown */}
          <div className="p-2.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Target className="size-3 text-primary" />
                Phân rã âm tiết & trọng âm:
              </span>
              <span className="font-mono text-[10px] text-primary">
                {phonemeAnalysis.totalSyllables} âm · Nhấn âm {phonemeAnalysis.primaryStressIndex + 1}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {phonemeAnalysis.syllables.map((syl, i) => (
                <div
                  key={i}
                  className={`px-2.5 py-1 rounded-xl border text-xs font-mono font-bold flex flex-col items-center transition-all ${
                    syl.isPrimaryStressed
                      ? "bg-primary/15 border-primary text-primary shadow-xs ring-1 ring-primary/30 scale-105"
                      : "bg-muted/40 border-border/70 text-foreground/80"
                  }`}
                >
                  <span className="text-xs tracking-wide">
                    {syl.isPrimaryStressed ? `ˈ${syl.raw}` : syl.raw}
                  </span>
                  <span className="text-[8px] font-normal text-muted-foreground">
                    {syl.isPrimaryStressed ? "★ Trọng âm" : `Âm ${i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stress + Ending Sound Guide Grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Zap className="size-2.5 text-amber-500" />
                Trọng âm:
              </span>
              <p className="text-[11px] font-semibold text-foreground leading-snug">
                {wordItem.stressExplanationVi}
              </p>
            </div>

            <div className="p-2 rounded-xl bg-muted/40 border border-border/60 space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Target className="size-2.5 text-primary" />
                Âm đuôi:
              </span>
              <p className="text-[11px] font-semibold text-foreground leading-snug">
                {wordItem.endingSoundGuideVi}
              </p>
            </div>
          </div>

          {/* Vietnamese L1 Transfer Warning */}
          {topPitfall && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1 text-[10px]">
                  <AlertTriangle className="size-3 text-rose-500 shrink-0" />
                  <span>{topPitfall.titleVi}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowL1Details(!showL1Details)}
                  className="text-[9px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  {showL1Details ? "Gọn" : "Xem"}
                </button>
              </div>
              {showL1Details && (
                <p className="text-foreground/80 leading-snug text-[10px] pt-1 border-t border-rose-500/20">
                  {topPitfall.descriptionVi}
                </p>
              )}
            </div>
          )}

          {/* Minimal Pair Contrast */}
          {minimalPair && (
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-0.5">
              <div className="flex items-center gap-1 text-sky-700 dark:text-sky-300 font-bold text-[10px]">
                <Lightbulb className="size-3 text-sky-500 shrink-0" />
                <span>Cặp từ dễ nhầm lẫn (Minimal Pair):</span>
              </div>
              <p className="text-foreground/90 font-mono text-[10px] leading-snug">
                <span className="font-bold text-primary">{wordItem.word}</span> ({minimalPair.targetIpa}) vs{" "}
                <span className="font-bold text-sky-600">{minimalPair.confusedWord}</span> ({minimalPair.confusedIpa})
              </p>
              <p className="text-[9px] text-muted-foreground italic leading-tight">
                {minimalPair.explanationVi}
              </p>
            </div>
          )}
        </div>

        {/* Footer info pill */}
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3 text-primary" />
            <span>Âm vị học chuẩn bản xứ</span>
          </span>
          <span>Bấm [H] xem gợi ý</span>
        </div>
      </CardContent>
    </Card>
  );
}
