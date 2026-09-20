"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  Mic,
  MicOff,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  EyeOff,
  Headphones,
  Repeat,
  Square,
  Sparkles,
} from "lucide-react";
import type { LinguisticAnalysisResult } from "@/types/shadowing";
import type { ShadowingScoreResult } from "@/lib/foundation/shadowing/pronunciation-scorer";
import type { CorodomoSegment } from "@/lib/foundation/shadowing/corodomo-presets";
import { WordLookupPopup, type VocabWord } from "./WordLookupPopup";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import {
  lookupLexiconWord,
  formatConciseMeaning,
  formatPartOfSpeech,
  fetchDictionaryDefinition,
} from "@/lib/foundation/vocabulary/lexicon-db.service";
import { getWordIpa } from "@/lib/foundation/shadowing/ipa-dictionary";

export type SubtitleLayer = "en" | "vi" | "thought_groups" | "ipa" | "hidden";

interface SentencePracticeCardProps {
  segment: CorodomoSegment;
  segmentIndex: number;
  totalSegments: number;
  analysis?: LinguisticAnalysisResult | null;
  subtitleLayer: SubtitleLayer;
  onSubtitleLayerChange: (layer: SubtitleLayer) => void;

  // Recording & Score
  status: "idle" | "listening" | "recording" | "evaluating";
  liveTranscript: string;
  score: ShadowingScoreResult | null;
  userAudioUrl: string | null;
  isLooping: boolean;
  onToggleLoop: () => void;
  onPlayNative: () => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onRetry: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSaveWordToDeck: (word: any) => void;
}

const SUBTITLE_LAYERS: { id: SubtitleLayer; label: string }[] = [
  { id: "vi", label: "Song ngữ" },
  { id: "thought_groups", label: "Nhóm ý" },
  { id: "en", label: "Chỉ EN" },
  { id: "ipa", label: "IPA" },
  { id: "hidden", label: "Ẩn (Blind)" },
];

export function SentencePracticeCard({
  segment,
  segmentIndex,
  totalSegments,
  analysis,
  subtitleLayer,
  onSubtitleLayerChange,
  status,
  liveTranscript,
  score,
  userAudioUrl,
  isLooping,
  onToggleLoop,
  onPlayNative,
  onStartRecord,
  onStopRecord,
  onRetry,
  onNext,
  onPrev,
  onSaveWordToDeck,
}: SentencePracticeCardProps) {
  const tts = useBrowserTTS();
  const [popupWord, setPopupWord] = useState<VocabWord | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  const segEnhancement = analysis?.segments_enhancement?.find(
    (e) => e.segment_id === segment.segment_id
  );

  const stressWords = segEnhancement?.stress_words ?? [];

  const displayText = (() => {
    if (subtitleLayer === "hidden") return null;
    if (subtitleLayer === "thought_groups") {
      return segment.thoughtGroups || segEnhancement?.thought_groups_text || segment.text;
    }
    if (subtitleLayer === "ipa") {
      return segment.ipa || segEnhancement?.ipa_transcription || segment.text;
    }
    return segment.text;
  })();

  const translationVi = segment.translationVi || "";

  // 1-Click Word Lookup powered by local CEFR Lexicon & 103k Offline Dictionary
  const handleWordClick = useCallback(
    async (word: string, e: React.MouseEvent<HTMLElement>) => {
      if (subtitleLayer === "hidden" || subtitleLayer === "ipa") return;
      const cleanWord = word.toLowerCase().replace(/[^\w']/g, "");
      if (!cleanWord) return;

      const clickToken = Date.now();

      // Stop user voice playback if currently active
      if (userAudioRef.current) {
        userAudioRef.current.pause();
        setIsPlayingUserAudio(false);
      }

      setPopupAnchor(e.currentTarget);

      // 1. Check synchronous Oxford 5000 Lexicon (0ms instant match)
      const lexiconMatch = lookupLexiconWord(cleanWord);

      if (lexiconMatch) {
        const derivedIpa = getWordIpa(cleanWord);
        const popupData: VocabWord = {
          word: lexiconMatch.word,
          ipa: lexiconMatch.ipaUS || lexiconMatch.ipaUK || (derivedIpa ? `/${derivedIpa}/` : ""),
          meaning: formatConciseMeaning(lexiconMatch.meaningVi),
          partOfSpeech: formatPartOfSpeech(lexiconMatch.partOfSpeech),
          contextSentence: lexiconMatch.contextSentences?.[0]?.sentenceEn || segment.text,
          cefrLevel: lexiconMatch.cefrLevel,
          isLoading: false,
          playToken: clickToken,
        };
        setPopupWord(popupData);
        return;
      }

      // 2. Not in Oxford 5000: derive IPA instantly and display popup with micro-shimmer
      const initialIpa = getWordIpa(cleanWord);
      const initialPopupData: VocabWord = {
        word: cleanWord,
        ipa: initialIpa ? `/${initialIpa}/` : `/${cleanWord}/`,
        meaning: "",
        partOfSpeech: "Từ vựng",
        contextSentence: segment.text,
        cefrLevel: undefined,
        isLoading: true,
        playToken: clickToken,
      };
      setPopupWord(initialPopupData);

      // 3. Asynchronously fetch from the 103k offline dictionary (~2-5ms)
      const dictResult = await fetchDictionaryDefinition(cleanWord);

      setPopupWord((prev) => {
        if (!prev || prev.word !== cleanWord) return prev;
        if (dictResult && dictResult.found) {
          return {
            ...prev,
            ipa: dictResult.ipa || prev.ipa,
            meaning: dictResult.meaningVi,
            partOfSpeech: dictResult.partOfSpeech || "Từ vựng",
            isLoading: false,
          };
        }
        return {
          ...prev,
          meaning: `Từ tiếng Anh: ${cleanWord}`,
          partOfSpeech: "Từ vựng",
          isLoading: false,
        };
      });
    },
    [subtitleLayer, segment.text]
  );

  // Playback of user's own recorded voice
  const handleTogglePlayUserAudio = useCallback(() => {
    if (!userAudioUrl) return;

    if (userAudioRef.current && isPlayingUserAudio) {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
      setIsPlayingUserAudio(false);
      return;
    }

    if (userAudioRef.current) {
      userAudioRef.current.pause();
    }

    const audio = new Audio(userAudioUrl);
    userAudioRef.current = audio;
    setIsPlayingUserAudio(true);

    audio.onended = () => setIsPlayingUserAudio(false);
    audio.onerror = () => setIsPlayingUserAudio(false);
    audio.play().catch(() => setIsPlayingUserAudio(false));
  }, [userAudioUrl, isPlayingUserAudio]);

  useEffect(() => {
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current = null;
    }
    setIsPlayingUserAudio(false);
  }, [segment.segment_id]);

  const isRecording = status === "recording";
  const isProcessing = status === "evaluating" || status === "listening";
  const hasScore = !!score;

  const overallScore = score?.overall ?? 0;
  const scoreColor =
    overallScore >= 85
      ? "text-emerald-500"
      : overallScore >= 65
      ? "text-amber-500"
      : "text-red-500";
  const scoreBg =
    overallScore >= 85 ? "bg-emerald-500" : overallScore >= 65 ? "bg-amber-500" : "bg-red-500";

  // Render clickable subtitle with stress word highlights or pronunciation breakdown
  const renderClickableSubtitle = (text: string) => {
    const words = text.split(/(\s+|\/\/|\/)/);
    return words.map((part, i) => {
      const isPause = part === "/" || part === "//";
      const isWhitespace = /^\s+$/.test(part);
      const clean = part.toLowerCase().replace(/[^\w']/g, "");

      if (isPause) {
        return (
          <span key={i} className="text-primary/40 mx-1 font-bold text-base">
            {part}
          </span>
        );
      }
      if (isWhitespace) return <span key={i}>{part}</span>;

      // When scored, render word pronunciation status
      let wordStatusClass = "hover:bg-primary/20 hover:text-primary";
      let statusBadge = null;

      if (hasScore && clean) {
        const isCorrect = score.correctWords.some((w) => w.toLowerCase() === clean);
        const isMissed = score.missedWords.some((w) => w.toLowerCase() === clean);

        if (isCorrect) {
          wordStatusClass = "text-emerald-500 font-bold bg-emerald-500/10 rounded px-1";
        } else if (isMissed) {
          wordStatusClass = "text-rose-500 line-through bg-rose-500/10 rounded px-1";
        } else {
          wordStatusClass = "text-amber-500 font-semibold bg-amber-500/10 rounded px-1";
        }
      } else {
        const isStressed = stressWords.some((sw) => clean === sw.toLowerCase());
        if (isStressed) {
          wordStatusClass = "font-extrabold text-primary";
        }
      }

      return (
        <span
          key={i}
          onClick={(e) => handleWordClick(part, e)}
          className={`cursor-pointer rounded px-0.5 transition-all underline-offset-4 decoration-primary/40 hover:underline ${wordStatusClass}`}
          title={`Click để tra từ: "${clean}"`}
        >
          {part}
        </span>
      );
    });
  };

  return (
    <>
      <WordLookupPopup
        word={popupWord}
        anchorEl={popupAnchor}
        onClose={() => {
          setPopupWord(null);
          setPopupAnchor(null);
        }}
        onSaveToDeck={onSaveWordToDeck}
      />

      <div className="h-full flex flex-col rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden shadow-xs">
        {/* ── Top Bar: Navigation + Subtitle Layer Selector ── */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/20 shrink-0 gap-2">
          {/* Sentence number & timestamp */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono font-bold text-xs text-foreground shrink-0">
              Câu {segmentIndex + 1}/{totalSegments}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono shrink-0 h-5">
              {segment.start_time}s - {segment.end_time}s
            </Badge>
          </div>

          {/* Subtitle Layers */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {SUBTITLE_LAYERS.map((layer) => (
              <button
                key={layer.id}
                onClick={() => onSubtitleLayerChange(layer.id)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all ${
                  subtitleLayer === layer.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>

          {/* Sentence Nav & Loop Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={isLooping ? "default" : "outline"}
              size="sm"
              onClick={onToggleLoop}
              className={`size-6 p-0 rounded-lg transition-all ${
                isLooping
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
              title={isLooping ? "Tắt lặp lại câu này" : "Bật lặp lại câu này (Loop)"}
            >
              <Repeat className="size-3" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              disabled={segmentIndex === 0}
              onClick={onPrev}
              className="size-6 p-0 rounded-lg"
              title="Câu trước (←)"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={segmentIndex === totalSegments - 1}
              onClick={onNext}
              className="size-6 p-0 rounded-lg"
              title="Câu sau (→)"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Subtitle Display Area ── */}
        <div className="flex-1 px-4 py-3 flex flex-col justify-center overflow-hidden space-y-2">
          {/* Main Text with Click-to-Lookup */}
          <div
            className={`min-h-[64px] flex items-center ${
              subtitleLayer === "hidden" ? "justify-center" : "justify-start"
            }`}
          >
            {subtitleLayer === "hidden" ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <EyeOff className="size-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Chế độ Blind — Lắng nghe và nhại giọng không nhìn chữ
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed select-text">
                  {displayText && renderClickableSubtitle(displayText)}
                </p>
                {/* Vietnamese translation if in bilingual mode */}
                {subtitleLayer === "vi" && translationVi && (
                  <p className="text-xs text-muted-foreground font-medium italic">
                    {translationVi}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Corodomo Feature: Self-Voice vs Native Voice Comparison Bar ── */}
        {hasScore && (
          <div className="px-4 pb-2 shrink-0">
            <div className="p-2 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Đối chiếu âm thanh:
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPlayNative}
                  className="h-7 px-2.5 rounded-xl text-xs font-bold gap-1 border-border/80 hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Volume2 className="size-3 text-primary" />
                  <span>1. Giọng bản xứ</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePlayUserAudio}
                  disabled={!userAudioUrl}
                  className={`h-7 px-2.5 rounded-xl text-xs font-bold gap-1 border-border/80 transition-all ${
                    isPlayingUserAudio
                      ? "bg-indigo-500/20 text-indigo-600 border-indigo-500/50 shadow-xs"
                      : "hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/40"
                  }`}
                >
                  {isPlayingUserAudio ? (
                    <Square className="size-3 fill-current text-indigo-500" />
                  ) : (
                    <Headphones className="size-3 text-indigo-500" />
                  )}
                  <span>2. Nghe lại giọng bạn</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Score Panel ── */}
        {hasScore && (
          <div className="px-4 pb-2.5 space-y-1.5 shrink-0">
            <div className="p-2.5 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div
                  className={`size-10 rounded-xl ${scoreBg} text-white font-black text-base flex items-center justify-center font-mono shadow-xs`}
                >
                  {overallScore}
                </div>
                <div>
                  <p className="font-bold text-xs text-foreground">
                    {overallScore >= 85
                      ? "Phát âm rất chuẩn xác!"
                      : overallScore >= 65
                      ? "Tốt, cần chú ý nhịp điệu"
                      : "Cần luyện tập thêm"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Độ khớp: {score!.accuracy}% • Lưu loát: {score!.fluency}% • Trọng âm: {score!.prosody}%
                  </p>
                </div>
              </div>

              {overallScore >= 85 ? (
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-amber-500 shrink-0" />
              )}
            </div>

            {/* Vietnamese Coaching Remark */}
            {score!.coachRemarkVi && (
              <p className="text-[11px] text-muted-foreground px-1 italic">
                💡 {score!.coachRemarkVi}
              </p>
            )}
          </div>
        )}

        {/* ── Live Transcript (while recording) ── */}
        {isRecording && (
          <div className="px-4 pb-2 shrink-0">
            <div className="p-2 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400 font-mono leading-relaxed animate-in fade-in-0 duration-100 flex items-center gap-2">
              <span className="size-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <p className="truncate">
                {liveTranscript || "Đang lắng nghe giọng bạn..."}
              </p>
            </div>
          </div>
        )}

        {/* ── Recording Controls ── */}
        <div className="px-4 pb-3.5 flex items-center justify-between gap-2 shrink-0 border-t border-border/30 pt-2.5">
          {/* Retry */}
          {hasScore && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 px-3 rounded-xl text-xs font-bold gap-1 border-border/80"
            >
              <RotateCcw className="size-3.5" />
              <span>Thử lại</span>
              <kbd className="text-[9px] font-mono px-1 bg-muted rounded">R</kbd>
            </Button>
          )}

          {/* Main Mic Button */}
          {!hasScore && (
            <Button
              size="sm"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? onStopRecord : onStartRecord}
              disabled={isProcessing}
              className="flex-1 h-9 rounded-xl font-bold text-xs gap-1.5 shadow-xs transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{status === "listening" ? "Đang lắng nghe..." : "Đang chấm..."}</span>
                </>
              ) : isRecording ? (
                <>
                  <MicOff className="size-3.5" />
                  <span>Dừng & Chấm điểm</span>
                  <kbd className="text-[9px] font-mono px-1 py-0.5 bg-white/20 rounded">Space</kbd>
                </>
              ) : (
                <>
                  <Mic className="size-3.5" />
                  <span>Bắt đầu Shadowing</span>
                  <kbd className="text-[9px] font-mono px-1 py-0.5 bg-primary-foreground/20 rounded">Space</kbd>
                </>
              )}
            </Button>
          )}

          {/* Next sentence */}
          {hasScore && (
            <Button
              size="sm"
              onClick={onNext}
              disabled={segmentIndex === totalSegments - 1}
              className="flex-1 h-8 px-3 rounded-xl text-xs font-bold gap-1"
            >
              <span>Câu tiếp theo</span>
              <kbd className="text-[9px] font-mono px-1 bg-primary-foreground/20 rounded">Enter</kbd>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
