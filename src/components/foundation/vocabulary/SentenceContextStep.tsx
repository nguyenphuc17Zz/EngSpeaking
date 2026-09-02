"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  Sparkles,
  Mic,
  Square,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Layers,
  Repeat,
} from "lucide-react";
import type {
  SpokenWordItem,
  ContextSentenceItem,
  SentenceContextEvaluation,
} from "@/types/vocabulary-context";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { Waveform } from "@/components/voice/Waveform";

interface SentenceContextStepProps {
  wordItem: SpokenWordItem;
  sentenceItem: ContextSentenceItem;
  selectedSentenceIndex: number;
  isRecording: boolean;
  evaluation: SentenceContextEvaluation | null;
  recordingDurationMs: number;
  userTranscript: string;
  onSelectSentenceIndex: (index: number) => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onBackToStep1: () => void;
  onShuffleRandomWord?: () => void;
}

export function SentenceContextStep({
  wordItem,
  sentenceItem,
  selectedSentenceIndex,
  isRecording,
  evaluation,
  recordingDurationMs,
  userTranscript,
  onSelectSentenceIndex,
  onStartRecord,
  onStopRecord,
  onBackToStep1,
  onShuffleRandomWord,
}: SentenceContextStepProps) {
  const tts = useBrowserTTS();

  return (
    <Card className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToStep1}
              className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <Badge className="bg-primary text-primary-foreground font-mono text-xs font-bold gap-1 px-3 py-1 rounded-full">
              <span>Bước 2: Nói câu trong ngữ cảnh (Sentence Context)</span>
            </Badge>
          </div>

          {evaluation && (
            <Badge
              className={`font-mono text-xs font-bold px-3 py-1 rounded-full gap-1 ${
                evaluation.isSuccessful ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}
            >
              {evaluation.isSuccessful ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
              <span>Điểm trôi chảy: {evaluation.overallScore}/100</span>
            </Badge>
          )}
        </div>

        {/* Collocations Pills */}
        {wordItem.collocations.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Layers className="size-3.5" />
              <span>Cụm Collocations tự nhiên thường đi kèm từ "{wordItem.word}":</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {wordItem.collocations.map((c, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-card border border-amber-500/30 text-xs flex items-center gap-2"
                >
                  <b className="font-mono text-foreground">"{c.phrase}"</b>
                  <span className="text-muted-foreground text-[11px]">({c.meaningVi})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => tts.speak(c.phrase)}
                    className="size-5 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Volume2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Context Sentence Selector Tabs */}
        {wordItem.contextSentences.length > 1 && (
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <span className="text-xs font-bold text-muted-foreground">Chọn ngữ cảnh:</span>
            {wordItem.contextSentences.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => onSelectSentenceIndex(idx)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  selectedSentenceIndex === idx
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground"
                }`}
              >
                {s.domainTitleVi}
              </button>
            ))}
          </div>
        )}

        {/* Active Context Sentence Display */}
        <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {sentenceItem.domainTitleVi}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tts.speak(sentenceItem.sentenceEn)}
              className="gap-1.5 text-xs font-bold rounded-xl h-8 px-3 text-primary border-primary/30"
            >
              <Volume2 className="size-3.5" />
              <span>Nghe câu mẫu</span>
            </Button>
          </div>

          <p className="font-mono text-base md:text-lg font-bold text-foreground leading-relaxed">
            "{sentenceItem.sentenceEn}"
          </p>

          <p className="text-xs text-muted-foreground italic">
            Ý nghĩa: {sentenceItem.sentenceVi}
          </p>

          {sentenceItem.linkingSoundHints && (
            <div className="pt-2 border-t border-border/40 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
              🔗 Gợi ý nối âm: {sentenceItem.linkingSoundHints}
            </div>
          )}
        </div>

        {/* Recording or Evaluation Feedback */}
        {evaluation ? (
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Đánh giá câu ngữ cảnh:</span>
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span>Rõ ràng: <b className="text-foreground">{evaluation.sentenceClarityScore}%</b></span>
                <span>Nối âm: <b className="text-foreground">{evaluation.linkingFluencyScore}%</b></span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{evaluation.feedbackVi}</p>
            <p className="text-xs font-medium text-primary">{evaluation.fluencyAdviceVi}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={onStartRecord}
                className="text-xs font-bold rounded-xl h-9"
              >
                <Mic className="size-3.5 mr-1.5" />
                <span>Nói lại câu này</span>
              </Button>

              {onShuffleRandomWord && (
                <Button
                  size="sm"
                  onClick={onShuffleRandomWord}
                  className="text-xs font-bold rounded-xl h-9 bg-primary shadow-sm btn-spring gap-1.5 px-4"
                >
                  <span>🎲 Sang từ mới (Next Word)</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-4">
            {isRecording && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1.5 text-red-500 animate-pulse font-semibold">
                    <span className="size-2 rounded-full bg-red-500" />
                    Đang nghe bạn đọc câu...
                  </span>
                  <span>{(recordingDurationMs / 1000).toFixed(1)}s</span>
                </div>
                <Waveform active={true} variant="primary" />
                {userTranscript && (
                  <p className="font-mono text-xs text-foreground font-semibold">
                    "{userTranscript}"
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Đọc trôi chảy cả câu chứa từ khóa (Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">Space</kbd>)
              </span>

              {isRecording ? (
                <Button
                  variant="destructive"
                  onClick={onStopRecord}
                  className="w-full sm:w-auto h-10 px-5 rounded-2xl font-bold gap-1.5 animate-pulse"
                >
                  <Square className="size-4 fill-white" />
                  <span>Xong & Chấm điểm</span>
                </Button>
              ) : (
                <Button
                  onClick={onStartRecord}
                  className="w-full sm:w-auto h-10 px-6 rounded-2xl font-bold gap-2 shadow-sm btn-spring"
                >
                  <Mic className="size-4" />
                  <span>Bắt đầu đọc câu</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
