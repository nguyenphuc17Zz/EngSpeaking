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
  HelpCircle,
  Info,
  BookOpen,
} from "lucide-react";
import type {
  SpokenWordItem,
  WordPronunciationEvaluation,
} from "@/types/vocabulary-context";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { Waveform } from "@/components/voice/Waveform";

interface WordPronunciationStepProps {
  wordItem: SpokenWordItem;
  isRecording: boolean;
  isEnriching?: boolean;
  evaluation: WordPronunciationEvaluation | null;
  recordingDurationMs: number;
  userTranscript: string;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onProceedToStep2: () => void;
  onShuffleRandomWord?: () => void;
  onDeepEnrichWithAI?: () => void;
}

export function WordPronunciationStep({
  wordItem,
  isRecording,
  isEnriching,
  evaluation,
  recordingDurationMs,
  userTranscript,
  onStartRecord,
  onStopRecord,
  onProceedToStep2,
  onShuffleRandomWord,
  onDeepEnrichWithAI,
}: WordPronunciationStepProps) {
  const tts = useBrowserTTS();

  return (
    <Card className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-mono text-xs font-bold gap-1 px-3 py-1 rounded-full">
              <span>Bước 1: Luyện phát âm từ (Word-Level IPA)</span>
            </Badge>
            <Badge variant="outline" className="text-xs font-mono border-border/80">
              {wordItem.partOfSpeech} • {wordItem.cefrLevel}
            </Badge>
            {onDeepEnrichWithAI && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeepEnrichWithAI}
                disabled={isEnriching}
                className="h-7 px-2.5 rounded-full text-[11px] font-bold text-primary hover:bg-primary/10 gap-1"
              >
                <Sparkles className="size-3" />
                <span>{isEnriching ? "Đang phân tích AI..." : "✨ Phân tích sâu AI"}</span>
              </Button>
            )}
          </div>

          {evaluation && (
            <Badge
              className={`font-mono text-xs font-bold px-3 py-1 rounded-full gap-1 ${
                evaluation.isSuccessful ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}
            >
              {evaluation.isSuccessful ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
              <span>Điểm phát âm: {evaluation.overallScore}/100</span>
            </Badge>
          )}
        </div>

        {/* Word Display with IPA & Native Audio */}
        <div className="space-y-3 text-center py-2">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground font-mono">
              {wordItem.word}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tts.speak(wordItem.word)}
              className="rounded-full size-10 p-0 border-primary/40 text-primary hover:bg-primary/10 shadow-xs"
            >
              <Volume2 className="size-5" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm font-mono text-muted-foreground">
            <span>US: <b className="text-primary font-bold">{wordItem.ipaUS}</b></span>
            {wordItem.ipaUK && <span>UK: <b>{wordItem.ipaUK}</b></span>}
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <p className="text-sm font-bold text-foreground">
              🇻🇳 {wordItem.meaningVi}
            </p>
            {wordItem.englishDefinition && (
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                🇬🇧 Definition: "{wordItem.englishDefinition}"
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-muted-foreground pt-1">
            <span>Đã luyện: <b className="text-foreground">{wordItem.practiceCount} lần</b></span>
            <span>•</span>
            <span>Thành thạo từ: <b className="text-primary">{wordItem.wordMasteryScore}%</b></span>
            <span>•</span>
            <span>Thành thạo câu: <b className="text-primary">{wordItem.sentenceMasteryScore}%</b></span>
          </div>
        </div>

        {/* Phonetic & Stress Guide */}
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-950 dark:text-blue-200 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <Info className="size-3.5" />
              Vị trí trọng âm:
            </span>
            <p className="leading-relaxed">{wordItem.stressExplanationVi}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="size-3.5" />
              Hướng dẫn âm đuôi:
            </span>
            <p className="leading-relaxed">{wordItem.endingSoundGuideVi}</p>
          </div>
        </div>

        {/* Example Sentences in Context */}
        {wordItem.contextSentences.length > 0 && (
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-primary" />
                <span>Ví dụ câu thực tế (Example Sentences):</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {wordItem.contextSentences.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl bg-card border border-border/60 space-y-1 relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-xs md:text-sm font-semibold text-foreground leading-relaxed">
                      "{s.sentenceEn}"
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => tts.speak(s.sentenceEn)}
                      className="size-6 p-0 shrink-0 text-muted-foreground hover:text-primary"
                    >
                      <Volume2 className="size-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Dịch: {s.sentenceVi}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collocations Pills */}
        {wordItem.collocations.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground mr-1">
              Collocations:
            </span>
            {wordItem.collocations.map((c, i) => (
              <div
                key={i}
                className="px-2.5 py-1 rounded-lg bg-card border border-border/70 text-xs font-mono flex items-center gap-1.5"
              >
                <span className="font-semibold text-foreground">{c.phrase}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => tts.speak(c.phrase)}
                  className="size-4 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Volume2 className="size-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Live Recording Area or Evaluation Card */}
        {evaluation ? (
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-bold text-foreground">Nhận xét phát âm của AI:</span>
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span>Trọng âm: <b className="text-foreground">{evaluation.stressAccuracyScore}%</b></span>
                <span>Âm đuôi: <b className="text-foreground">{evaluation.endingSoundScore}%</b></span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{evaluation.feedbackVi}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStartRecord}
                  className="text-xs font-bold rounded-xl h-9"
                >
                  <Mic className="size-3.5 mr-1.5" />
                  <span>Phát âm lại</span>
                </Button>

                {onShuffleRandomWord && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onShuffleRandomWord}
                    className="text-xs font-semibold rounded-xl h-9 text-muted-foreground hover:text-foreground"
                  >
                    <span>🎲 Đổi từ khác</span>
                  </Button>
                )}
              </div>

              <Button
                size="sm"
                onClick={onProceedToStep2}
                className="text-xs font-bold rounded-xl h-9 bg-primary shadow-sm btn-spring gap-1.5 px-4"
              >
                <span>Sang Bước 2: Nói câu ngữ cảnh</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-4">
            {isRecording && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1.5 text-red-500 animate-pulse font-semibold">
                    <span className="size-2 rounded-full bg-red-500" />
                    Đang nghe bạn phát âm từ...
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
                Bấm mic và phát âm to, rõ ràng từ trên (Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">Space</kbd>)
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
                  <span>Bắt đầu phát âm từ</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
