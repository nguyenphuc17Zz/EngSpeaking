"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  Layers,
  Sparkles,
  Zap,
  BookOpen,
  ChevronDown,
  Copy,
  Check,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { toast } from "@/lib/toast";
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

interface VocabularyContextCardProps {
  step: 1 | 2;
  wordItem: SpokenWordItem;
  sentenceItem: ContextSentenceItem | null;
  selectedSentenceIndex: number;
  onSelectSentenceIndex: (idx: number) => void;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
  speakingMode?: "guided" | "spontaneous";
  onSelectSpeakingMode?: (mode: "guided" | "spontaneous") => void;
  isEnrichingContext?: boolean;
  aiError?: string | null;
  onRegenerateWithAI?: () => void;
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
        "Collocations đang được nạp...",
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
        content: `Thử lồng ghép cụm: "${challenge?.targetCollocation || wordItem.collocations?.[0]?.phrase || wordItem.word}".`,
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

export function VocabularyContextCard({
  step,
  wordItem,
  sentenceItem,
  selectedSentenceIndex,
  onSelectSentenceIndex,
  currentHintTier,
  onSelectHintTier,
  speakingMode = "guided",
  onSelectSpeakingMode,
  isEnrichingContext = false,
  aiError,
  onRegenerateWithAI,
}: VocabularyContextCardProps) {
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const tts = useBrowserTTS();

  const handlePlay = (text: string) => tts.speak(sanitizeTextForTTS(text));

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

  const targetWord = wordItem.word || "";
  const primaryCollocation = wordItem.collocations?.[0]?.phrase || "";
  const fullSentenceToPlay =
    speakingMode === "spontaneous"
      ? wordItem.spontaneousChallenge?.suggestedOpeningEn || wordItem.contextSentences?.[0]?.sentenceEn || ""
      : sentenceItem?.sentenceEn || wordItem.contextSentences?.[0]?.sentenceEn || "";

  const hints =
    step === 1
      ? buildStep1Hints(wordItem)
      : buildStep2Hints(wordItem, sentenceItem, speakingMode);

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        {/* Header Meta Row */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {step === 1 ? "2. Cụm từ & Gợi ý nấc thang" : "2. Ngữ cảnh & Phản xạ"}
            </span>

            {wordItem.source === "ai" && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 font-normal">
                <Sparkles className="size-2.5 text-emerald-500" />
                AI Generated
              </Badge>
            )}

            {onRegenerateWithAI && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={onRegenerateWithAI}
                disabled={isEnrichingContext}
                className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/80"
                title="Làm mới câu ví dụ bằng AI"
              >
                <Sparkles className={`size-3 text-amber-500 ${isEnrichingContext ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Làm mới bằng AI</span>
              </Button>
            )}
          </div>

          {/* Mode Switcher in Step 2 */}
          {step === 2 && onSelectSpeakingMode ? (
            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => onSelectSpeakingMode("guided")}
                className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all ${
                  speakingMode === "guided"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Câu mẫu
              </button>
              <button
                type="button"
                onClick={() => onSelectSpeakingMode("spontaneous")}
                className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all ${
                  speakingMode === "spontaneous"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Phản xạ tự do
              </button>
            </div>
          ) : (
            <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
              Nấc thang T1-T4
            </Badge>
          )}
        </div>

        {/* Scrollable Container with Zero-scroll ergonomics */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {/* AI Error Alert Banner — Per user requirement: hiển thị lỗi, không fallback ngầm */}
          {aiError && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                <span className="truncate text-[11px] font-medium" title={aiError}>
                  {aiError}
                </span>
              </div>
              {onRegenerateWithAI && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={onRegenerateWithAI}
                  disabled={isEnrichingContext}
                  className="shrink-0 h-6 px-2 text-[10px] gap-1 border-destructive/40 hover:bg-destructive/10 text-destructive"
                >
                  <RotateCw className={`size-3 ${isEnrichingContext ? "animate-spin" : ""}`} />
                  Thử lại
                </Button>
              )}
            </div>
          )}

          {/* Background AI Enrichment Notification Banner */}
          {isEnrichingContext && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium animate-pulse">
              <Sparkles className="size-3.5 animate-spin shrink-0 text-amber-500" />
              <span className="text-[11px] truncate">
                AI đang làm giàu câu ví dụ & collocations mới cho từ này...
              </span>
            </div>
          )}

          {/* ── STEP 1: PMI Collocations ── */}
          {step === 1 && wordItem.collocations && wordItem.collocations.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3 text-primary" />
                  Mạng lưới cụm từ cố định (PMI Collocations):
                </span>
                <span className="text-[9px] text-primary/80 font-normal">Bấm nghe mẫu</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {wordItem.collocations.map((col, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePlay(col.phrase)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-muted/40 border border-border/70 hover:border-primary/50 hover:bg-primary/5 text-xs transition-all shadow-2xs group cursor-pointer"
                    title={`Nghe cụm: "${col.phrase}"`}
                  >
                    <span className="font-semibold text-primary text-xs">{col.phrase}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">({col.meaningVi})</span>
                    {col.pmiStrength === "native_chunk" && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-primary/10 text-primary">
                        Native
                      </Badge>
                    )}
                    <Volume2 className="size-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Guided Sentence Context ── */}
          {step === 2 && speakingMode === "guided" && (
            <div className="space-y-2">
              {/* Domain Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Chọn ngữ cảnh áp dụng:
                </span>
                <div className="flex flex-wrap gap-1">
                  {wordItem.contextSentences.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectSentenceIndex(idx)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        selectedSentenceIndex === idx
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {s.domainTitleVi}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Sentence Card */}
              {sentenceItem && (
                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed select-text cursor-text">
                        {sentenceItem.sentenceEn.split(new RegExp(`(\\b${wordItem.word}\\b)`, "i")).map((part, i) =>
                          part.toLowerCase() === wordItem.word.toLowerCase() ? (
                            <mark key={i} className="bg-primary/20 text-primary font-extrabold rounded px-0.5">
                              {part}
                            </mark>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground italic select-text">{sentenceItem.sentenceVi}</p>
                      {sentenceItem.linkingSoundHints && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium select-text">
                          💡 Nối âm: {sentenceItem.linkingSoundHints}
                        </p>
                      )}
                      {sentenceItem.rhythmNoteVi && (
                        <p className="text-[10px] text-primary/80 font-medium select-text">
                          🎵 Nhịp điệu: {sentenceItem.rhythmNoteVi}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(sentenceItem.sentenceEn, "main-sentence")}
                        className="size-7 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                        title="Sao chép câu này (hoặc bôi đen bấm Ctrl+C)"
                      >
                        {copiedId === "main-sentence" ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlay(sentenceItem.sentenceEn)}
                        className="size-7 p-0 rounded-xl text-primary hover:bg-primary/10 shrink-0"
                        title="Nghe câu mẫu"
                      >
                        <Volume2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Spontaneous Active Challenge ── */}
          {step === 2 && speakingMode === "spontaneous" && (
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Zap className="size-3" />
                  Tình huống phản xạ giao tiếp:
                </span>
                <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-600 dark:text-amber-400">
                  Active Production
                </Badge>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  {wordItem.spontaneousChallenge?.promptVi || "Hãy tự nói 1-2 câu có chứa từ vựng mục tiêu."}
                </p>
                <p className="text-[11px] text-muted-foreground italic">
                  "{wordItem.spontaneousChallenge?.promptEn || `Speak 1-2 sentences using ${wordItem.word}`}"
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1 border-t border-amber-500/20">
                <span className="text-muted-foreground text-[10px]">Cụm mục tiêu:</span>
                <Badge className="bg-primary/15 text-primary border-primary/30 font-semibold font-mono text-[10px]">
                  {wordItem.spontaneousChallenge?.targetCollocation || primaryCollocation || wordItem.word}
                </Badge>
              </div>

              {wordItem.spontaneousChallenge?.suggestedOpeningEn && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-card/80 border border-border/70 text-xs">
                  <span className="text-muted-foreground truncate text-[11px] select-text cursor-text">
                    Gợi ý mở đầu: <span className="italic font-medium text-foreground">"{wordItem.spontaneousChallenge.suggestedOpeningEn}"</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(wordItem.spontaneousChallenge!.suggestedOpeningEn!, "spontaneous-opening")}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      title="Sao chép câu mở đầu"
                    >
                      {copiedId === "spontaneous-opening" ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlay(wordItem.spontaneousChallenge!.suggestedOpeningEn!)}
                      className="text-primary hover:text-primary/80 p-1 rounded-lg hover:bg-primary/10 shrink-0 cursor-pointer transition-colors"
                      title="Nghe câu mở đầu"
                    >
                      <Volume2 className="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Progressive 4-Tier Hint Ladder ── */}
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
                        <div key={h.tier} className={`p-2 rounded-xl border ${style.border} shadow-2xs space-y-0.5`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${style.badge}`}>
                                T{h.tier}
                              </span>
                              <span className="text-[11px] font-bold text-foreground">{h.title}</span>
                            </div>

                            {canPlay && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePlay(textToPlay)}
                                className="h-5 px-1.5 text-[9px] gap-1 rounded-md border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold cursor-pointer"
                                title={isFullSentenceTier ? "Nghe câu mẫu" : `Nghe ${buttonLabel.toLowerCase()}`}
                              >
                                <Volume2 className="size-2.5" />
                                <span>{buttonLabel}</span>
                              </Button>
                            )}
                          </div>

                          <p className="font-mono text-xs font-medium text-foreground/90 pl-0.5 leading-snug">
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
            <span>Ngữ cảnh & Bản năng phản xạ</span>
          </span>
          <span>Nấc hiện tại: T{currentHintTier}/4</span>
        </div>
      </CardContent>
    </Card>
  );
}
