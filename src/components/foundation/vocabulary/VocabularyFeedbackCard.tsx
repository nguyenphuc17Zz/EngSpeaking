"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Volume2,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import type {
  WordPronunciationEvaluation,
  SentenceContextEvaluation,
} from "@/types/vocabulary-context";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface VocabularyFeedbackCardProps {
  step: 1 | 2;
  wordPronuncEval?: WordPronunciationEvaluation | null;
  sentenceEval?: SentenceContextEvaluation | null;
  onRetry: () => void;
  onContinue: () => void;
  continueLabel?: string;
}

export function VocabularyFeedbackCard({
  step,
  wordPronuncEval,
  sentenceEval,
  onRetry,
  onContinue,
  continueLabel,
}: VocabularyFeedbackCardProps) {
  const tts = useBrowserTTS();
  const evaluation = step === 1 ? wordPronuncEval : sentenceEval;

  if (!evaluation) return null;

  const isSuccessful = evaluation.isSuccessful;
  const overallScore = evaluation.overallScore;

  const feedbackVi =
    step === 1
      ? (wordPronuncEval?.feedbackVi ?? "")
      : (sentenceEval?.feedbackVi ?? "");

  const handlePlay = (text: string) => tts.speak(sanitizeTextForTTS(text));

  // Color rings for score
  const scoreColor =
    overallScore >= 85
      ? "text-emerald-500"
      : overallScore >= 65
      ? "text-amber-500"
      : "text-red-500";

  const scoreBg =
    overallScore >= 85
      ? "bg-emerald-500/10 border-emerald-500/20"
      : overallScore >= 65
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-red-500/10 border-red-500/20";

  const defaultContinueLabel = step === 1
    ? (isSuccessful ? "Sang Bước 2 →" : "Thử lại")
    : "Từ tiếp theo →";

  return (
    <Card className="rounded-3xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-full animate-in fade-in-0 duration-200">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <Badge
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full gap-1 ${
                isSuccessful ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}
            >
              {isSuccessful ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
              <span>
                {step === 1
                  ? isSuccessful
                    ? "Phát âm rất chuẩn!"
                    : "Cần luyện thêm"
                  : isSuccessful
                  ? "Ngữ cảnh rất tự nhiên!"
                  : "Cần cải thiện"}
              </span>
            </Badge>
          </div>

          {/* Score Ring */}
          <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full border ${scoreBg}`}>
            <span className={`font-mono font-extrabold text-sm ${scoreColor}`}>{overallScore}</span>
            <span className="text-[10px] text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
          {/* Sub-scores */}
          {step === 1 && wordPronuncEval && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Phát âm", score: wordPronuncEval.pronunciationScore },
                { label: "Trọng âm", score: wordPronuncEval.stressAccuracyScore },
                { label: "Âm đuôi", score: wordPronuncEval.endingSoundScore },
              ].map((item) => (
                <div key={item.label} className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.label}
                  </span>
                  <p
                    className={`text-lg font-extrabold font-mono ${
                      item.score >= 85 ? "text-emerald-500" : item.score >= 65 ? "text-amber-500" : "text-red-500"
                    }`}
                  >
                    {item.score}
                  </p>
                </div>
              ))}
            </div>
          )}

          {step === 2 && sentenceEval && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Rõ ràng", score: sentenceEval.sentenceClarityScore },
                { label: "Nối âm", score: sentenceEval.linkingFluencyScore },
                { label: "Ngữ điệu", score: sentenceEval.intonationScore },
              ].map((item) => (
                <div key={item.label} className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.label}
                  </span>
                  <p
                    className={`text-lg font-extrabold font-mono ${
                      item.score >= 85 ? "text-emerald-500" : item.score >= 65 ? "text-amber-500" : "text-red-500"
                    }`}
                  >
                    {item.score}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* User Transcript vs Expected */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Bạn đã nói:
                </span>
                {evaluation.userTranscript && (
                  <button onClick={() => handlePlay(evaluation.userTranscript)} className="text-muted-foreground hover:text-primary transition-colors">
                    <Volume2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs font-mono font-semibold text-foreground leading-relaxed">
                "{evaluation.userTranscript || "(Không ghi nhận được âm thanh)"}"
              </p>
            </div>

            {step === 2 && sentenceEval && (
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Mẫu chuẩn:
                </span>
                <p className="text-xs font-mono font-bold text-foreground leading-relaxed">
                  — xem thẻ bài tập bên trái —
                </p>
              </div>
            )}
          </div>

          {/* Coach Feedback */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/5 via-card to-background border border-border/60 text-xs space-y-1">
            <span className="font-bold text-foreground">Nhận xét của AI Coach:</span>
            <p className="text-muted-foreground leading-relaxed">{feedbackVi}</p>

            {step === 1 && wordPronuncEval?.phonemeCorrectionAdvice && (
              <p className="text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                📌 {wordPronuncEval.phonemeCorrectionAdvice}
              </p>
            )}
            {step === 2 && sentenceEval?.fluencyAdviceVi && (
              <p className="text-primary/80 font-medium pt-0.5">
                💡 {sentenceEval.fluencyAdviceVi}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="rounded-xl h-9 px-3 gap-1.5 text-xs font-semibold"
          >
            <RotateCcw className="size-3.5" />
            <span>Nói lại</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 bg-muted rounded">Space</kbd>
          </Button>

          <Button
            size="sm"
            onClick={onContinue}
            className="rounded-xl h-9 px-4 gap-1.5 text-xs font-bold shadow-xs btn-spring"
          >
            <span>{continueLabel ?? defaultContinueLabel}</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 bg-primary-foreground/20 rounded">Enter</kbd>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
