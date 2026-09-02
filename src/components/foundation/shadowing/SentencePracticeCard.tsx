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
} from "lucide-react";
import type { YouTubeTranscriptSegment, LinguisticAnalysisResult } from "@/types/shadowing";
import type { ShadowingScoreResult } from "@/lib/foundation/shadowing/pronunciation-scorer";
import { WordLookupPopup } from "./WordLookupPopup";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { lookupLexiconWord } from "@/lib/foundation/vocabulary/lexicon-db.service";

type SubtitleLayer = "en" | "thought_groups" | "ipa" | "vi" | "hidden";

interface SentencePracticeCardProps {
  segment: YouTubeTranscriptSegment;
  segmentIndex: number;
  totalSegments: number;
  analysis: LinguisticAnalysisResult | null;
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
  { id: "thought_groups", label: "Nhóm ý" },
  { id: "en", label: "EN" },
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
  const [popupWord, setPopupWord] = useState<any | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  const segEnhancement = analysis?.segments_enhancement?.find(
    (e) => e.segment_id === segment.segment_id
  );

  const stressWords = segEnhancement?.stress_words ?? [];

  const displayText = (() => {
    if (subtitleLayer === "hidden") return null;
    if (subtitleLayer === "thought_groups" && segEnhancement?.thought_groups_text) {
      return segEnhancement.thought_groups_text;
    }
    if (subtitleLayer === "ipa" && segEnhancement?.ipa_transcription) {
      return segEnhancement.ipa_transcription;
    }
    return segment.text;
  })();

  // 1-Click Word Lookup powered by local 10k CEFR Lexicon Database (Function 8)
  const handleWordClick = useCallback(
    (word: string, e: React.MouseEvent<HTMLElement>) => {
      if (subtitleLayer === "hidden" || subtitleLayer === "ipa") return;
      const cleanWord = word.toLowerCase().replace(/[^\w']/g, "");
      if (!cleanWord) return;

      const lexiconMatch = lookupLexiconWord(cleanWord);
      let popupData: any;

      if (lexiconMatch) {
        popupData = {
          word: lexiconMatch.word,
          ipa: lexiconMatch.ipaUS || lexiconMatch.ipaUK || "",
          meaning: lexiconMatch.meaningVi,
          partOfSpeech: lexiconMatch.partOfSpeech,
          contextSentence: lexiconMatch.contextSentences?.[0]?.sentenceEn || segment.text,
          cefrLevel: lexiconMatch.cefrLevel,
        };
      } else {
        popupData = {
          word: cleanWord,
          ipa: "",
          meaning: "Từ vựng trong ngữ cảnh câu",
          partOfSpeech: "word",
          contextSentence: segment.text,
          cefrLevel: "Daily",
        };
      }

      setPopupWord(popupData);
      setPopupAnchor(e.currentTarget);
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
    // Reset user audio playback state when segment changes
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
  const scoreColor = overallScore >= 85 ? "text-emerald-500" : overallScore >= 65 ? "text-amber-500" : "text-red-500";
  const scoreBg = overallScore >= 85 ? "bg-emerald-500" : overallScore >= 65 ? "bg-amber-500" : "bg-red-500";

  // Render subtitle with clickable words + stress highlights
  const renderClickableSubtitle = (text: string) => {
    const words = text.split(/(\s+|\/\/|\/)/);
    return words.map((part, i) => {
      const isPause = part === "/" || part === "//";
      const isWhitespace = /^\s+$/.test(part);
      const isStressed = stressWords.some(
        (sw) => part.toLowerCase().replace(/[^\w']/g, "") === sw.toLowerCase()
      );

      if (isPause) {
        return (
          <span key={i} className="text-primary/40 mx-1 font-bold text-base">
            {part}
          </span>
        );
      }
      if (isWhitespace) return <span key={i}>{part}</span>;

      return (
        <span
          key={i}
          onClick={(e) => handleWordClick(part, e)}
          className={`cursor-pointer rounded px-0.5 transition-all hover:bg-primary/20 hover:text-primary hover:underline decoration-primary/40 underline-offset-4 ${
            isStressed ? "font-extrabold text-primary" : ""
          }`}
          title={`Click để tra từ: "${part.replace(/[^\w']/g, "")}"`}
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

      <div className="h-full flex flex-col rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
        {/* ── Header: Nav + Sentence # ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-xs text-muted-foreground">
              Câu {segmentIndex + 1}/{totalSegments}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {segment.start_time}s - {segment.end_time}s
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            {/* Loop Segment Toggle */}
            <Button
              variant={isLooping ? "default" : "outline"}
              size="sm"
              onClick={onToggleLoop}
              className={`size-7 p-0 rounded-xl transition-all ${
                isLooping ? "bg-primary text-primary-foreground shadow-xs" : "border-border/60 text-muted-foreground"
              }`}
              title={isLooping ? "Tắt lặp lại câu này" : "Bật lặp lại câu này (Loop)"}
            >
              <Repeat className="size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              disabled={segmentIndex === 0}
              onClick={onPrev}
              className="size-7 p-0 rounded-xl"
              title="Câu trước (←)"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={segmentIndex === totalSegments - 1}
              onClick={onNext}
              className="size-7 p-0 rounded-xl"
              title="Câu sau (→)"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Subtitle Layer Selector ── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/10 shrink-0">
          <div className="flex items-center gap-1">
            {SUBTITLE_LAYERS.map((layer) => (
              <button
                key={layer.id}
                onClick={() => onSubtitleLayerChange(layer.id)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all ${
                  subtitleLayer === layer.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>

          {/* Native Audio Play */}
          <Button
            variant="outline"
            size="sm"
            onClick={onPlayNative}
            className="h-7 rounded-xl text-xs font-bold gap-1 border-border/80 px-2.5 hover:border-primary/40 hover:text-primary"
            title="Nghe câu gốc từ YouTube"
          >
            <Volume2 className="size-3.5 text-primary" />
            <span>Nghe bản xứ</span>
          </Button>
        </div>

        {/* ── Subtitle Display Area ── */}
        <div className="flex-1 px-5 py-4 flex flex-col justify-center overflow-hidden space-y-3">
          {/* Main Text with Click-to-Lookup */}
          <div
            className={`min-h-[80px] flex items-center ${
              subtitleLayer === "hidden" ? "justify-center" : "justify-start"
            }`}
          >
            {subtitleLayer === "hidden" ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <EyeOff className="size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground font-semibold">
                  Chế độ Blind — Nghe và nhại lại không nhìn chữ
                </p>
              </div>
            ) : (
              <p className="text-lg md:text-xl font-semibold text-foreground leading-relaxed select-text">
                {displayText && renderClickableSubtitle(displayText)}
              </p>
            )}
          </div>

          {/* Stressed words chips */}
          {stressWords.length > 0 && subtitleLayer !== "hidden" && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Layers className="size-3" /> Trọng âm ý nghĩa:
              </span>
              {stressWords.map((w, i) => (
                <button
                  key={i}
                  onClick={() => tts.speak(sanitizeTextForTTS(w))}
                  className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title={`Click để nghe phát âm từ: "${w}"`}
                >
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Corodomo Feature: Self-Voice vs Native Voice Comparison Bar ── */}
        {hasScore && (
          <div className="px-4 pb-2 shrink-0">
            <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1">
                Đối chiếu âm thanh:
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPlayNative}
                  className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 hover:border-primary/40 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  <Volume2 className="size-3.5 text-primary" />
                  <span>1. Giọng bản xứ</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePlayUserAudio}
                  disabled={!userAudioUrl}
                  className={`h-8 px-3 rounded-xl text-xs font-bold gap-1.5 border-border/80 transition-all ${
                    isPlayingUserAudio
                      ? "bg-indigo-500/20 text-indigo-600 border-indigo-500/50 shadow-xs"
                      : "hover:bg-indigo-500/10 hover:text-indigo-600 hover:border-indigo-500/40"
                  }`}
                >
                  {isPlayingUserAudio ? (
                    <Square className="size-3.5 fill-current text-indigo-500" />
                  ) : (
                    <Headphones className="size-3.5 text-indigo-500" />
                  )}
                  <span>2. Nghe lại giọng của tôi</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Score Panel ── */}
        {hasScore && (
          <div className="px-4 pb-3 space-y-2 shrink-0">
            <div className="p-3 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`size-11 rounded-xl ${scoreBg} text-white font-black text-lg flex items-center justify-center font-mono shadow-xs`}
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
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Độ khớp từ: {score!.accuracy}% • Lưu loát: {score!.fluency}% • Ngữ điệu: {score!.prosody}%
                  </p>
                </div>
              </div>

              {overallScore >= 85 ? (
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="size-5 text-amber-500 shrink-0" />
              )}
            </div>

            {/* Missed words */}
            {score!.missedWords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] px-1">
                <span className="text-muted-foreground font-semibold">Từ cần nắn âm:</span>
                {score!.missedWords.slice(0, 5).map((w, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/20"
                  >
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Live Transcript (while recording) ── */}
        {isRecording && liveTranscript && (
          <div className="px-4 pb-2 shrink-0">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-primary/90 font-mono leading-relaxed animate-in fade-in-0 duration-100">
              <span className="font-bold text-primary">🎙 </span>
              {liveTranscript}
            </div>
          </div>
        )}

        {/* ── Recording Controls ── */}
        <div className="px-4 pb-4 flex items-center justify-between gap-2 shrink-0 border-t border-border/30 pt-3">
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
              <kbd className="text-[10px] font-mono px-1 bg-muted rounded">R</kbd>
            </Button>
          )}

          {/* Main Mic Button */}
          {!hasScore && (
            <Button
              size="sm"
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? onStopRecord : onStartRecord}
              disabled={isProcessing}
              className="flex-1 h-10 rounded-2xl font-bold text-sm gap-2 shadow-xs"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{status === "listening" ? "Đang nghe..." : "Đang chấm..."}</span>
                </>
              ) : isRecording ? (
                <>
                  <MicOff className="size-4" />
                  <span>Dừng & Chấm điểm</span>
                  <kbd className="text-[11px] font-mono px-1.5 py-0.5 bg-white/20 rounded">Space</kbd>
                </>
              ) : (
                <>
                  <Mic className="size-4" />
                  <span>Bắt đầu Shadowing</span>
                  <kbd className="text-[11px] font-mono px-1.5 py-0.5 bg-primary-foreground/20 rounded">Space</kbd>
                </>
              )}
            </Button>
          )}

          {/* Next */}
          {hasScore && (
            <Button
              size="sm"
              onClick={onNext}
              disabled={segmentIndex === totalSegments - 1}
              className="flex-1 h-8 px-3 rounded-xl text-xs font-bold gap-1"
            >
              <span>Câu tiếp theo</span>
              <kbd className="text-[10px] font-mono px-1 bg-primary-foreground/20 rounded">Enter</kbd>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
