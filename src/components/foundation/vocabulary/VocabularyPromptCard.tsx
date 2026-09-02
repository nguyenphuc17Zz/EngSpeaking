"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  Layers,
  Sparkles,
  X,
  Lightbulb,
  ArrowRight,
  Ban,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type {
  SpokenWordItem,
  ContextSentenceItem,
} from "@/types/vocabulary-context";

interface HintTier {
  tier: number;
  title: string;
  content: string;
}

interface VocabularyPromptCardProps {
  step: 1 | 2;
  wordItem: SpokenWordItem;
  sentenceItem: ContextSentenceItem | null;
  selectedSentenceIndex: number;
  onSelectSentenceIndex: (idx: number) => void;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
  isEnriching?: boolean;
  onDeepEnrichWithAI?: () => void;
  // Auto-advance guidance
  wordMasteryThreshold?: number;
}

function buildStep1Hints(wordItem: SpokenWordItem): HintTier[] {
  return [
    { tier: 0, title: "Không gợi ý", content: "Tự phát âm trong 3 giây theo trọng âm đúng." },
    { tier: 1, title: "Trọng âm IPA", content: `IPA: ${wordItem.ipaUS} — ${wordItem.stressExplanationVi}` },
    {
      tier: 2,
      title: "Cụm hay dùng",
      content:
        wordItem.collocations?.slice(0, 2).map((c) => `"${c.phrase}" (${c.meaningVi})`).join(" · ") ||
        "Collocations đang được tải...",
    },
    {
      tier: 3,
      title: "Khung câu ngữ cảnh",
      content: wordItem.contextSentences?.[0]?.sentenceEn
        ? wordItem.contextSentences[0].sentenceEn.replace(
            new RegExp(`\\b${wordItem.word}\\b`, "i"),
            `[${wordItem.word}]`
          )
        : `Try using "${wordItem.word}" in a sentence about your daily life.`,
    },
    {
      tier: 4,
      title: "Câu mẫu hoàn chỉnh",
      content:
        wordItem.contextSentences?.[0]?.sentenceEn ||
        `"${wordItem.word}" — ${wordItem.englishDefinition}`,
    },
  ];
}

function buildStep2Hints(wordItem: SpokenWordItem, sentenceItem: ContextSentenceItem | null): HintTier[] {
  const sentence = sentenceItem?.sentenceEn || `Use "${wordItem.word}" in a sentence.`;
  return [
    { tier: 0, title: "Không gợi ý", content: "Đọc và nói nguyên câu trong 5 giây." },
    { tier: 1, title: "Từ mục tiêu", content: `Nhớ phát âm "${wordItem.word}" (${wordItem.ipaUS}) rõ ràng khi đọc câu.` },
    {
      tier: 2,
      title: "Cụm kết hợp",
      content:
        wordItem.collocations?.[0]?.phrase
          ? `Chú ý cụm: "${wordItem.collocations[0].phrase}" = ${wordItem.collocations[0].meaningVi}`
          : "Chú ý cách kết hợp từ với các động từ/danh từ đi kèm.",
    },
    {
      tier: 3,
      title: "Khung câu (trống)",
      content: sentence.replace(new RegExp(`\\b${wordItem.word}\\b`, "i"), "______"),
    },
    { tier: 4, title: "Câu mẫu chuẩn", content: sentence },
  ];
}

export function VocabularyPromptCard({
  step,
  wordItem,
  sentenceItem,
  selectedSentenceIndex,
  onSelectSentenceIndex,
  currentHintTier,
  onSelectHintTier,
  isEnriching,
  onDeepEnrichWithAI,
  wordMasteryThreshold = 80,
}: VocabularyPromptCardProps) {
  const tts = useBrowserTTS();

  const handlePlay = (text: string) => tts.speak(sanitizeTextForTTS(text));

  const hints = step === 1
    ? buildStep1Hints(wordItem)
    : buildStep2Hints(wordItem, sentenceItem);

  const activeHint = currentHintTier > 0 ? hints.find((h) => h.tier === currentHintTier) : null;

  const wordMastered = wordItem.wordMasteryScore >= wordMasteryThreshold;

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Meta Row */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/90 text-primary-foreground font-mono text-xs font-bold gap-1 px-2.5 py-0.5 rounded-full">
              {step === 1 ? "Bước 1: Phát âm từ" : "Bước 2: Nói câu ngữ cảnh"}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono border-border/70 px-2 py-0.5">
              {wordItem.partOfSpeech} · {wordItem.cefrLevel}
            </Badge>
            {wordMastered && step === 1 && (
              <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 px-2 py-0.5">
                ✓ Đã nắm
              </Badge>
            )}
          </div>

          {onDeepEnrichWithAI && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeepEnrichWithAI}
              disabled={isEnriching}
              className="h-7 px-2 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/10 gap-1 shrink-0"
              title="Phân tích sâu hơn qua AI"
            >
              <Sparkles className={`size-3 ${isEnriching ? "animate-spin" : ""}`} />
              <span>{isEnriching ? "Đang phân tích..." : "AI Enrich"}</span>
            </Button>
          )}
        </div>

        {/* Scrollable Main Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          {/* === STEP 1: Word Pronunciation === */}
          {step === 1 && (
            <div className="space-y-3">
              {/* Word + IPA Hero */}
              <div className="text-center space-y-1.5 py-2">
                <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
                  {wordItem.word}
                </h2>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => handlePlay(wordItem.word)}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors text-sm font-mono font-semibold group"
                    title="Nghe phát âm chuẩn"
                  >
                    <Volume2 className="size-4 group-hover:scale-110 transition-transform" />
                    <span>{wordItem.ipaUS}</span>
                    {wordItem.ipaUK && (
                      <span className="text-xs text-muted-foreground/60">(UK: {wordItem.ipaUK})</span>
                    )}
                  </button>
                </div>
                <p className="text-sm font-medium text-foreground/80">{wordItem.meaningVi}</p>
                <p className="text-xs text-muted-foreground italic max-w-xs mx-auto">{wordItem.englishDefinition}</p>
              </div>

              {/* Stress + Ending Sound Guide */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Trọng âm:
                  </span>
                  <p className="text-xs font-semibold text-foreground">{wordItem.stressExplanationVi}</p>
                </div>
                <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Âm đuôi:
                  </span>
                  <p className="text-xs font-semibold text-foreground">{wordItem.endingSoundGuideVi}</p>
                </div>
              </div>

              {/* Collocations Chip Bar */}
              {wordItem.collocations && wordItem.collocations.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Layers className="size-3 text-primary" />
                    <span>Cụm từ kết hợp hay dùng (Bấm nghe):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {wordItem.collocations.map((col, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePlay(col.phrase)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 text-xs transition-all shadow-2xs group"
                        title={`Nghe: "${col.phrase}"`}
                      >
                        <span className="font-semibold text-primary">{col.phrase}</span>
                        <span className="text-[10px] text-muted-foreground">({col.meaningVi})</span>
                        <Volume2 className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hint: Auto-advance suggestion */}
              {wordMastered && (
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <ArrowRight className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                    Phát âm đã đạt! Bấm <kbd className="px-1.5 py-0.5 rounded bg-emerald-500/20 font-mono">Enter</kbd> để sang Bước 2 luyện câu ngữ cảnh.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* === STEP 2: Sentence Context === */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Word Reminder */}
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-foreground font-mono">{wordItem.word}</span>
                <button onClick={() => handlePlay(wordItem.word)} className="text-muted-foreground hover:text-primary transition-colors" title="Nghe từ mục tiêu">
                  <Volume2 className="size-3.5" />
                </button>
                <span className="text-xs text-muted-foreground font-mono">{wordItem.ipaUS}</span>
                <span className="text-xs text-muted-foreground">— {wordItem.meaningVi}</span>
              </div>

              {/* Sentence Picker Tabs */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Chọn ngữ cảnh câu luyện tập:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {wordItem.contextSentences.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectSentenceIndex(idx)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                        selectedSentenceIndex === idx
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {s.domainTitleVi}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Sentence Display */}
              {sentenceItem && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-bold text-foreground leading-relaxed">
                        {sentenceItem.sentenceEn.split(new RegExp(`(\\b${wordItem.word}\\b)`, "i")).map((part, i) =>
                          part.toLowerCase() === wordItem.word.toLowerCase()
                            ? <mark key={i} className="bg-primary/20 text-primary font-extrabold rounded px-0.5">{part}</mark>
                            : <span key={i}>{part}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground italic">{sentenceItem.sentenceVi}</p>
                      {sentenceItem.linkingSoundHints && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          💡 Nối âm: {sentenceItem.linkingSoundHints}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePlay(sentenceItem.sentenceEn)}
                      className="size-8 p-0 rounded-xl text-primary hover:bg-primary/10 shrink-0"
                      title="Nghe câu mẫu"
                    >
                      <Volume2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4-Tier Inline Stepper Hint Dock */}
        <div className="pt-2 border-t border-border/40 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <Lightbulb className="size-3.5 text-amber-500" />
              <span>Gợi ý ({currentHintTier === 0 ? "Tự phản xạ" : `Tầng ${currentHintTier}`}):</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              Phím: <kbd className="px-1.5 py-0.5 rounded bg-muted font-bold">H</kbd>
            </span>
          </div>

          {/* Stepper Buttons Row */}
          <div className="grid grid-cols-4 gap-1.5">
            {hints
              .filter((h) => h.tier > 0)
              .map((h) => {
                const isSelected = currentHintTier === h.tier;
                return (
                  <button
                    key={h.tier}
                    onClick={() => onSelectHintTier(isSelected ? 0 : h.tier)}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all truncate text-center leading-tight ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs scale-[1.02]"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    title={h.title}
                  >
                    T{h.tier}: {h.title}
                  </button>
                );
              })}
          </div>

          {/* Active Hint Content */}
          {activeHint && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 space-y-1.5 animate-in fade-in-0 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                  <Lightbulb className="size-3.5 text-amber-500" />
                  T{activeHint.tier}: {activeHint.title}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlay(activeHint.content)}
                    className="size-6 p-0 rounded-lg text-primary hover:bg-primary/20"
                    title="Nghe gợi ý"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectHintTier(0)}
                    className="size-6 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed">{activeHint.content}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
