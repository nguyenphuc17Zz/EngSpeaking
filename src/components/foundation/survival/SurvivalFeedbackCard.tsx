"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Ban,
  RotateCcw,
  Target,
  Zap,
  Gauge,
  Mic,
  Briefcase,
  Coffee,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SurvivalEvaluationResult } from "@/types/survival-speaking";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface SurvivalFeedbackCardProps {
  evaluation: SurvivalEvaluationResult;
  onContinue: () => void;
  onRetry?: () => void;
  onSayItBetter?: () => void;
  onPracticeVariant?: (variant: string) => void;
}

export function SurvivalFeedbackCard({
  evaluation,
  onContinue,
  onRetry,
  onSayItBetter,
  onPracticeVariant,
}: SurvivalFeedbackCardProps) {
  const tts = useBrowserTTS();
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [playingText, setPlayingText] = useState<string | null>(null);

  const handlePlayAudio = async (text: string) => {
    setPlayingText(text);
    try {
      tts.speak(sanitizeTextForTTS(text));
    } finally {
      setTimeout(() => setPlayingText(null), 1500);
    }
  };

  const isFastPass = evaluation.isFastPass || evaluation.evaluationSource === "fast_pass";
  const sayItBetter = evaluation.sayItBetter;
  const variants = sayItBetter
    ? [
        { id: "casual", title: "Đời thường", text: sayItBetter.casual, icon: Coffee, color: "border-emerald-500/30 bg-emerald-500/5" },
        { id: "professional", title: "Công sở", text: sayItBetter.professional, icon: Briefcase, color: "border-sky-500/30 bg-sky-500/5" },
        { id: "idiomatic", title: "Khẩu ngữ", text: sayItBetter.idiomatic, icon: Lightbulb, color: "border-amber-500/30 bg-amber-500/5" },
      ].filter((v) => v.text?.trim())
    : [];

  return (
    <Card className="rounded-3xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-full animate-in fade-in-0 duration-200">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full gap-1 ${
                evaluation.isSuccessful ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
              }`}
            >
              {evaluation.isSuccessful ? (
                <CheckCircle2 className="size-3.5" />
              ) : (
                <AlertCircle className="size-3.5" />
              )}
              <span>
                {evaluation.isSuccessful
                  ? `Phục hồi thành công: ${evaluation.overallScore}/100`
                  : `Cần cải thiện: ${evaluation.overallScore}/100`}
              </span>
            </Badge>

            {isFastPass && (
              <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                <Zap className="size-3 mr-0.5 fill-amber-500 text-amber-500" />
                Fast-Pass 0ms
              </Badge>
            )}
            {evaluation.hesitationMetrics && (
              <Badge variant="outline" className="text-[10px] font-mono border-border/60">
                <Gauge className="size-3 mr-1" />
                {evaluation.hesitationMetrics.wpm} wpm · {evaluation.hesitationMetrics.hesitationLevel}
              </Badge>
            )}

            {evaluation.targetWordAvoided !== undefined && (
              <Badge
                variant="outline"
                className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                  evaluation.targetWordAvoided
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "border-red-500 text-red-500 bg-red-500/10"
                }`}
              >
                {evaluation.targetWordAvoided ? (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    Không lộ từ cấm
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Ban className="size-3" />
                    Lỡ miệng nói từ cấm
                  </span>
                )}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Clock className="size-3.5 text-primary" />
            <span>Phản xạ: {(evaluation.repairInitiationLatencyMs / 1000).toFixed(1)}s</span>
            {(evaluation.independenceScore ?? 100) < 100 && (
              <span className="text-amber-600">· Tự lập {evaluation.independenceScore}%</span>
            )}
          </div>
        </div>

        {/* Multi-dim score badges (SB/VN-EN aligned) */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: "Ý", v: evaluation.conceptClarityScore },
            { label: "Tự nhiên", v: evaluation.naturalnessScore },
            { label: "Trôi chảy", v: evaluation.fluencyScore ?? 75 },
            { label: "Truy xuất", v: evaluation.retrievalScore ?? 75 },
            { label: "Tự lập", v: evaluation.independenceScore ?? 100 },
          ].map((s) => (
            <Badge
              key={s.label}
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                s.v >= 75
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              {s.label}: {s.v}%
            </Badge>
          ))}
        </div>

        {/* Native Listener Guessing Banner (Circumlocution Mode) */}
        {evaluation.listenerGuess && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-card border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-1.5">
                <Target className="size-3.5" />
                <span>Thử nghiệm Người nghe Bản xứ (Listener Guess):</span>
              </span>
              <p className="font-mono text-sm md:text-base font-extrabold text-foreground">
                "{evaluation.listenerGuess}"
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
              <span
                className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  evaluation.genusDetected
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {evaluation.genusDetected ? "✓" : "✗"} Chủng loại (Genus)
              </span>

              <span
                className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  evaluation.differentiaDetected
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {evaluation.differentiaDetected ? "✓" : "✗"} Công dụng (Differentia)
              </span>

              {evaluation.semanticPrecisionScore !== undefined && (
                <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-bold">
                  Độ chính xác: {evaluation.semanticPrecisionScore}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Evaluation Body */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
          <div className="grid md:grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Lời ứng biến của bạn:
                </span>
                {evaluation.userTranscript && (
                  <button
                    onClick={() => handlePlayAudio(evaluation.userTranscript)}
                    className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                    title="Nghe lại câu bạn nói"
                  >
                    <Volume2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="font-mono text-xs md:text-sm font-semibold text-foreground leading-relaxed">
                "{evaluation.userTranscript || "(Không ghi nhận được âm thanh)"}"
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1 relative">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Mẫu giải thích / ứng biến chuẩn:
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayAudio(evaluation.idealRepairVersion)}
                  className="size-6 p-0 rounded-full text-primary hover:bg-primary/20"
                  title="Nghe câu mẫu"
                >
                  <Volume2 className="size-3.5" />
                </Button>
              </div>
              <p className="font-mono text-xs md:text-sm font-bold text-foreground leading-relaxed">
                "{evaluation.idealRepairVersion}"
              </p>
            </div>
          </div>

          {/* Errors (SB/VN-EN aligned) */}
          {evaluation.errors && evaluation.errors.length > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Điểm cần sửa:
              </span>
              {evaluation.errors.slice(0, 2).map((err, i) => (
                <div key={i} className="text-xs flex flex-wrap items-center gap-1.5">
                  <span className="line-through text-red-500 font-mono font-semibold">"{err.userText}"</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">"{err.correction}"</span>
                  <span className="text-muted-foreground text-[11px]">({err.explanation})</span>
                </div>
              ))}
            </div>
          )}

          {/* Coach Advice */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/5 via-card to-background border border-border/60 text-xs space-y-1">
            <span className="font-bold text-foreground">Lời khuyên của AI Coach:</span>
            <p className="text-muted-foreground leading-relaxed">
              {evaluation.actionableFeedback || evaluation.coachFeedbackVi}
            </p>
            {evaluation.praisePoints && evaluation.praisePoints.length > 0 && (
              <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✨ {evaluation.praisePoints[0]}
              </p>
            )}
          </div>

          {/* Say It Better trio */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="size-3.5 text-primary" />
                <span>Say It Better — 3 cách bản xứ:</span>
              </div>
              <div className="grid gap-2">
                {variants.map((v) => {
                  const Icon = v.icon;
                  return (
                    <div key={v.id} className={`p-2.5 rounded-2xl border ${v.color} flex items-center justify-between gap-2`}>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold flex items-center gap-1">
                          <Icon className="size-3" />
                          {v.title}
                        </span>
                        <p className="font-mono text-xs font-bold truncate">"{v.text}"</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayAudio(v.text)}
                          className={`size-7 p-0 rounded-full ${playingText === v.text ? "text-primary animate-pulse" : "text-muted-foreground"}`}
                          title="Nghe mẫu"
                        >
                          <Volume2 className="size-3.5" />
                        </Button>
                        {onPracticeVariant && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onPracticeVariant(v.text)}
                            className="h-7 px-2 rounded-lg text-[10px] font-semibold gap-1"
                            title="Luyện nói bản này"
                          >
                            <Mic className="size-3 text-primary" />
                            <span>Luyện nói</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alternative Strategies */}
          {evaluation.alternativeStrategies && evaluation.alternativeStrategies.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="w-full p-2.5 rounded-2xl bg-muted/30 border border-border/50 text-xs font-semibold flex items-center justify-between"
              >
                <span>Chiến lược thay thế khác ({evaluation.alternativeStrategies.length})</span>
                {showAlternatives ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
              {showAlternatives && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {evaluation.alternativeStrategies.map((strat, i) => (
                    <Badge key={i} variant="outline" className="text-[11px] font-medium bg-card px-2 py-0.5">
                      {strat}
                    </Badge>
                  ))}
                  {(evaluation.naturalAlternatives || []).map((alt, i) => (
                    <Badge key={`alt-${i}`} variant="secondary" className="text-[11px] px-2 py-0.5">
                      "{alt.expression}"
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 shrink-0">
          {evaluation.isSayItBetterNeeded && onSayItBetter ? (
            <Button
              size="sm"
              onClick={onSayItBetter}
              className="rounded-xl h-9 px-3 gap-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-primary text-white btn-spring"
            >
              <Sparkles className="size-3.5" />
              <span>Say It Better</span>
            </Button>
          ) : onRetry ? (
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
          ) : (
            <div />
          )}

          <Button
            size="sm"
            onClick={onContinue}
            className="rounded-xl h-9 px-4 gap-1.5 text-xs font-bold shadow-xs btn-spring"
          >
            <span>Tiếp tục</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 bg-primary-foreground/20 rounded">Enter</kbd>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
