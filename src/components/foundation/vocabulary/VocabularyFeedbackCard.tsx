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
  AlertTriangle,
  Zap,
  Target,
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
      <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full space-y-2.5 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/40 pb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full gap-1 ${
                isSuccessful ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}
            >
              {isSuccessful ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
              <span>
                {step === 1
                  ? isSuccessful
                    ? "Phát âm chuẩn xác!"
                    : "Cần chú ý âm vị"
                  : sentenceEval?.mode === "spontaneous"
                  ? isSuccessful
                    ? "Phản xạ xuất sắc!"
                    : "Cần cải thiện"
                  : isSuccessful
                  ? "Ngữ cảnh tự nhiên!"
                  : "Cần cải thiện"}
              </span>
            </Badge>

            {step === 1 && wordPronuncEval?.endingSoundStatus && (
              <Badge
                variant="outline"
                className={`text-[9px] font-mono capitalize px-1.5 py-0 ${
                  wordPronuncEval.endingSoundStatus === "clear"
                    ? "text-emerald-600 border-emerald-500/40"
                    : "text-amber-600 border-amber-500/40"
                }`}
              >
                Âm đuôi: {wordPronuncEval.endingSoundStatus === "clear" ? "Rõ ✓" : "⚠️"}
              </Badge>
            )}

            {step === 2 && sentenceEval?.mode === "spontaneous" && (
              <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 py-0">
                Spontaneous
              </Badge>
            )}
          </div>

          {/* Score Ring */}
          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${scoreBg}`}>
            <span className={`font-mono font-extrabold text-xs ${scoreColor}`}>{overallScore}</span>
            <span className="text-[9px] text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 min-h-0">
          {/* Step 1 Sub-scores */}
          {step === 1 && wordPronuncEval && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Phát âm", score: wordPronuncEval.pronunciationScore },
                  { label: "Trọng âm", score: wordPronuncEval.stressAccuracyScore },
                  { label: "Âm đuôi", score: wordPronuncEval.endingSoundScore },
                ].map((item) => (
                  <div key={item.label} className="p-2 rounded-xl bg-muted/40 border border-border/60 text-center space-y-0.5">
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </span>
                    <p
                      className={`text-base font-extrabold font-mono ${
                        item.score >= 85 ? "text-emerald-500" : item.score >= 65 ? "text-amber-500" : "text-red-500"
                      }`}
                    >
                      {item.score}
                    </p>
                  </div>
                ))}
              </div>

              {/* Syllables breakdown pill */}
              {wordPronuncEval.syllablesDetected && wordPronuncEval.syllablesDetected.length > 0 && (
                <div className="p-2 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] text-muted-foreground uppercase">Cấu trúc âm tiết:</span>
                  <div className="flex items-center gap-1">
                    {wordPronuncEval.syllablesDetected.map((s, idx) => (
                      <span
                        key={idx}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          s.startsWith("[")
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-muted text-foreground/80"
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 Sub-scores */}
          {step === 2 && sentenceEval && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Độ rõ ràng", score: sentenceEval.sentenceClarityScore },
                  { label: "Nối âm", score: sentenceEval.linkingFluencyScore },
                  {
                    label: sentenceEval.mode === "spontaneous" ? "Nhịp điệu PVI" : "Ngữ điệu",
                    score: sentenceEval.pviRhythmScore ?? sentenceEval.intonationScore,
                  },
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

              {/* Spontaneous Verification Badges */}
              {sentenceEval.mode === "spontaneous" && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                      sentenceEval.targetWordUsed
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span>{sentenceEval.targetWordUsed ? "Đã dùng từ mục tiêu" : "Chưa chứa từ mục tiêu"}</span>
                  </div>
                  <div
                    className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                      sentenceEval.collocationUsedNaturally
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    <Target className="size-3.5 shrink-0" />
                    <span>{sentenceEval.collocationUsedNaturally ? "Collocation tự nhiên" : "Cụm từ chưa chuẩn"}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Transcript vs Expected */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Ghi nhận giọng nói của bạn:
              </span>
              {evaluation.userTranscript && (
                <button
                  onClick={() => handlePlay(evaluation.userTranscript)}
                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[11px]"
                  title="Nghe lại câu bạn vừa nói"
                >
                  <Volume2 className="size-3.5" />
                  <span>Nghe lại</span>
                </button>
              )}
            </div>
            <p className="text-xs font-mono font-semibold text-foreground leading-relaxed">
              "{evaluation.userTranscript || "(Không ghi nhận được âm thanh)"}"
            </p>
          </div>

          {/* Step 1: Vietnamese L1 Pitfall Warning Callout */}
          {step === 1 && wordPronuncEval?.vietnameseL1TrapWarning && (
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                <AlertTriangle className="size-3.5 text-rose-500" />
                <span>Cảnh báo thói quen phát âm người Việt:</span>
              </div>
              <p className="text-foreground/90 text-[11px] leading-relaxed">
                {wordPronuncEval.vietnameseL1TrapWarning}
              </p>
            </div>
          )}

          {/* Step 1: Minimal Pair Advice */}
          {step === 1 && wordPronuncEval?.minimalPairAdvice && (
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-sky-700 dark:text-sky-300 text-[11px]">
                <Sparkles className="size-3.5 text-sky-500" />
                <span>Phân biệt cặp từ dễ nhầm lẫn:</span>
              </div>
              <p className="text-foreground/90 text-[11px] leading-relaxed">
                {wordPronuncEval.minimalPairAdvice}
              </p>
            </div>
          )}

          {/* Step 2 Spontaneous: Suggested Alternative Expression */}
          {step === 2 && sentenceEval?.suggestedAlternativeEn && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary flex items-center gap-1 text-[11px]">
                  <Zap className="size-3.5" />
                  Cách diễn đạt tự nhiên hơn từ bản xứ:
                </span>
                <button
                  onClick={() => handlePlay(sentenceEval.suggestedAlternativeEn!)}
                  className="text-primary hover:text-primary/80 transition-colors"
                  title="Nghe cách nói mẫu"
                >
                  <Volume2 className="size-3.5" />
                </button>
              </div>
              <p className="font-mono text-xs font-semibold text-foreground leading-relaxed">
                {sentenceEval.suggestedAlternativeEn}
              </p>
            </div>
          )}

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
