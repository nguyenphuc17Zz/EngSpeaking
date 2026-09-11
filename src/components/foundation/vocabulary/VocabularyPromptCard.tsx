"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  Layers,
  Sparkles,
  Lightbulb,
  ArrowRight,
  ChevronDown,
  AlertTriangle,
  Zap,
  Target,
  BookOpen,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { decomposeIpa, getMinimalPairContrast } from "@/lib/foundation/vocabulary/phoneme-stress.engine";
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
  wordMasteryThreshold?: number;
  speakingMode?: "guided" | "spontaneous";
  onSelectSpeakingMode?: (mode: "guided" | "spontaneous") => void;
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

function buildStep2Hints(
  wordItem: SpokenWordItem,
  sentenceItem: ContextSentenceItem | null,
  mode: "guided" | "spontaneous"
): HintTier[] {
  if (mode === "spontaneous") {
    const challenge = wordItem.spontaneousChallenge;
    return [
      { tier: 0, title: "Tự do ứng biến", content: "Nói ngay 1-2 câu theo phản xạ tự nhiên của bạn." },
      { tier: 1, title: "Từ mục tiêu", content: `Bắt buộc chứa từ: "${wordItem.word}" (${wordItem.ipaUS}).` },
      {
        tier: 2,
        title: "Cụm Collocation khuyên dùng",
        content: `Thử lồng ghép cụm: "${challenge?.targetCollocation || wordItem.collocations[0]?.phrase || wordItem.word}".`,
      },
      {
        tier: 3,
        title: "Gợi ý câu mở đầu",
        content: challenge?.suggestedOpeningEn || `In my experience, when it comes to ${wordItem.word}...`,
      },
      {
        tier: 4,
        title: "Ý tưởng phản xạ hoàn chỉnh",
        content: `Ví dụ: "I think we should ${challenge?.targetCollocation || `use ${wordItem.word}`} before making any major changes."`,
      },
    ];
  }

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
  speakingMode = "guided",
  onSelectSpeakingMode,
}: VocabularyPromptCardProps) {
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const [showL1Details, setShowL1Details] = useState(false);
  const tts = useBrowserTTS();

  const handlePlay = (text: string) => tts.speak(sanitizeTextForTTS(text));

  const targetWord = wordItem.word || "";
  const primaryCollocation = wordItem.collocations?.[0]?.phrase || "";
  const fullSentenceToPlay =
    speakingMode === "spontaneous"
      ? wordItem.spontaneousChallenge?.suggestedOpeningEn || wordItem.contextSentences?.[0]?.sentenceEn || ""
      : sentenceItem?.sentenceEn || wordItem.contextSentences?.[0]?.sentenceEn || "";

  const hints = step === 1
    ? buildStep1Hints(wordItem)
    : buildStep2Hints(wordItem, sentenceItem, speakingMode);

  const wordMastered = wordItem.wordMasteryScore >= wordMasteryThreshold;

  // Real-time phonological diagnostics
  const phonemeAnalysis = decomposeIpa(wordItem.ipaUS);
  const minimalPair = getMinimalPairContrast(wordItem.word);
  const topPitfall = phonemeAnalysis.vietnameseL1Pitfalls[0];

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Meta Row */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/90 text-primary-foreground font-mono text-xs font-bold gap-1 px-2.5 py-0.5 rounded-full">
              {step === 1 ? "Bước 1: Phát âm âm vị học" : "Bước 2: Câu ngữ cảnh"}
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
          {/* === STEP 1: Word Pronunciation & Phoneme Diagnostics === */}
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

              {/* Syllable & Phoneme Anatomy Breakdown */}
              <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Target className="size-3 text-primary" />
                    Phân rã âm tiết & Trọng âm:
                  </span>
                  <span className="font-mono text-[10px] text-primary">
                    {phonemeAnalysis.totalSyllables} âm tiết · Nhấn âm {phonemeAnalysis.primaryStressIndex + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {phonemeAnalysis.syllables.map((syl, i) => (
                    <div
                      key={i}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex flex-col items-center transition-all ${
                        syl.isPrimaryStressed
                          ? "bg-primary/15 border-primary text-primary shadow-xs ring-2 ring-primary/20 scale-105"
                          : "bg-muted/50 border-border/70 text-foreground/80"
                      }`}
                    >
                      <span className="text-sm tracking-wide">
                        {syl.isPrimaryStressed ? `ˈ${syl.raw}` : syl.raw}
                      </span>
                      <span className="text-[9px] font-normal text-muted-foreground">
                        {syl.isPrimaryStressed ? "★ Trọng âm" : `Âm tiết ${i + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stress + Ending Sound Guide */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Zap className="size-3" />
                    Trọng âm:
                  </span>
                  <p className="text-xs font-semibold text-foreground">{wordItem.stressExplanationVi}</p>
                </div>
                <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Target className="size-3" />
                    Âm đuôi:
                  </span>
                  <p className="text-xs font-semibold text-foreground">{wordItem.endingSoundGuideVi}</p>
                </div>
              </div>

              {/* Vietnamese L1 Transfer Warning */}
              {topPitfall && (
                <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 text-[11px]">
                      <AlertTriangle className="size-3.5" />
                      {topPitfall.titleVi}
                    </span>
                    <button
                      onClick={() => setShowL1Details(!showL1Details)}
                      className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      {showL1Details ? "Thu gọn" : "Chi tiết"}
                    </button>
                  </div>
                  {showL1Details && (
                    <p className="text-foreground/80 leading-relaxed text-[11px] pt-1 border-t border-rose-500/20">
                      {topPitfall.descriptionVi}
                    </p>
                  )}
                </div>
              )}

              {/* Minimal Pair Contrast */}
              {minimalPair && (
                <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold text-[11px]">
                    <Lightbulb className="size-3.5" />
                    <span>Cặp từ dễ nhầm lẫn (Minimal Pair):</span>
                  </div>
                  <p className="text-foreground/90 font-mono text-[11px]">
                    <span className="font-bold text-primary">{wordItem.word}</span> ({minimalPair.targetIpa}) vs{" "}
                    <span className="font-bold text-sky-600">{minimalPair.confusedWord}</span> ({minimalPair.confusedIpa})
                  </p>
                  <p className="text-[11px] text-muted-foreground italic">{minimalPair.explanationVi}</p>
                </div>
              )}

              {/* Collocations Chip Bar */}
              {wordItem.collocations && wordItem.collocations.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Layers className="size-3 text-primary" />
                      Mạng lưới cụm từ cố định (PMI Collocations):
                    </span>
                    <span className="text-[10px] text-primary/80 font-normal">Bấm nghe</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {wordItem.collocations.map((col, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePlay(col.phrase)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 text-xs transition-all shadow-2xs group"
                        title={`Nghe cụm: "${col.phrase}"`}
                      >
                        <span className="font-semibold text-primary">{col.phrase}</span>
                        <span className="text-[10px] text-muted-foreground">({col.meaningVi})</span>
                        {col.pmiStrength === "native_chunk" && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-primary/10 text-primary">
                            Native
                          </Badge>
                        )}
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

          {/* === STEP 2: Sentence Context (Guided vs Spontaneous) === */}
          {step === 2 && (
            <div className="space-y-3">
              {/* Word Reminder Bar */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground font-mono">{wordItem.word}</span>
                  <button onClick={() => handlePlay(wordItem.word)} className="text-muted-foreground hover:text-primary transition-colors" title="Nghe từ mục tiêu">
                    <Volume2 className="size-3.5" />
                  </button>
                  <span className="text-xs text-muted-foreground font-mono">{wordItem.ipaUS}</span>
                  <span className="text-xs text-muted-foreground truncate">— {wordItem.meaningVi}</span>
                </div>
              </div>

              {/* Mode Switcher: Guided Shadowing vs Spontaneous Production */}
              {onSelectSpeakingMode && (
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border/60">
                  <button
                    onClick={() => onSelectSpeakingMode("guided")}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      speakingMode === "guided"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen className="size-3.5" />
                    <span>1. Luyện câu mẫu (Guided)</span>
                  </button>
                  <button
                    onClick={() => onSelectSpeakingMode("spontaneous")}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      speakingMode === "spontaneous"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Zap className="size-3.5" />
                    <span>2. Thử thách phản xạ (Active)</span>
                  </button>
                </div>
              )}

              {/* Guided Mode: Domain Picker + Sentence */}
              {speakingMode === "guided" && (
                <>
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Chọn ngữ cảnh câu:
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
                          {sentenceItem.rhythmNoteVi && (
                            <p className="text-[11px] text-primary/80 font-medium">
                              🎵 Nhịp điệu: {sentenceItem.rhythmNoteVi}
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
                </>
              )}

              {/* Spontaneous Mode: Active Retrieval Scenario */}
              {speakingMode === "spontaneous" && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Zap className="size-3.5" />
                      Tình huống phản xạ giao tiếp:
                    </span>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                      Active Production
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {wordItem.spontaneousChallenge?.promptVi || "Hãy tự nói 1-2 câu có chứa từ vựng mục tiêu."}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      "{wordItem.spontaneousChallenge?.promptEn || `Speak 1-2 sentences using ${wordItem.word}`}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-amber-500/20">
                    <span className="text-muted-foreground text-[11px]">Cụm từ mục tiêu:</span>
                    <Badge className="bg-primary/15 text-primary border-primary/30 font-semibold font-mono text-xs">
                      {wordItem.spontaneousChallenge?.targetCollocation || primaryCollocation || wordItem.word}
                    </Badge>
                  </div>

                  {wordItem.spontaneousChallenge?.suggestedOpeningEn && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-card/80 border border-border/70 text-xs">
                      <span className="text-muted-foreground truncate">
                        Gợi ý mở đầu: <span className="italic font-medium text-foreground">"{wordItem.spontaneousChallenge.suggestedOpeningEn}"</span>
                      </span>
                      <button
                        onClick={() => handlePlay(wordItem.spontaneousChallenge!.suggestedOpeningEn!)}
                        className="text-primary hover:text-primary/80 shrink-0 ml-1"
                        title="Nghe câu mở đầu"
                      >
                        <Volume2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4-Tier Progressive Hints (Stack List - Open by Default) */}
          {hints && hints.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5 mt-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý nấc thang từ vựng (T1 - T4):</span>
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
                      let textToPlay = "";
                      let buttonLabel = "Nghe";

                      if (isFullSentenceTier) {
                        textToPlay = fullSentenceToPlay;
                        buttonLabel = "Nghe câu";
                      } else if (h.tier === 2) {
                        textToPlay = primaryCollocation;
                        buttonLabel = "Nghe cụm";
                      } else if (h.tier === 1) {
                        textToPlay = targetWord;
                        buttonLabel = "Nghe từ";
                      }

                      const canPlay = Boolean(textToPlay && !textToPlay.includes("______"));

                      return (
                        <div key={h.tier} className={`p-2.5 rounded-xl border ${style.border} shadow-2xs space-y-1`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${style.badge}`}>
                                T{h.tier}
                              </span>
                              <span className="text-xs font-bold text-foreground">{h.title}</span>
                            </div>

                            {canPlay && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePlay(textToPlay)}
                                className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold btn-spring"
                                title={isFullSentenceTier ? "Nghe câu mẫu hoàn chỉnh" : `Nghe phát âm ${buttonLabel.toLowerCase()}`}
                              >
                                <Volume2 className="size-3" />
                                <span>{buttonLabel}</span>
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
        </div>

        {/* Bottom Bar: Quick Hint Status */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
            <Layers className="size-3 text-primary" />
            <span>Nấc thang từ vựng (T1 - T4)</span>
          </span>
          <button
            type="button"
            onClick={() => setIsHintsExpanded(!isHintsExpanded)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
            title="Bấm để ẩn hoặc hiện toàn bộ gợi ý T1-T4"
          >
            <Sparkles className="size-3 text-amber-500" />
            <span>{isHintsExpanded ? "Gợi ý T1-T4: Đang hiện" : "Gợi ý T1-T4: Đã ẩn (Bấm mở)"}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
