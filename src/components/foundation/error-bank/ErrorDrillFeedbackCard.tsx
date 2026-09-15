"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Trophy,
  Volume2,
  Sparkles,
  Award,
  Zap,
  Gauge,
  Mic,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { soundEffects } from "@/lib/audio/audio-chimes";
import type { MasterErrorRecord, DrillEvaluationResult } from "@/types/error-bank";

interface ErrorDrillFeedbackCardProps {
  record: MasterErrorRecord;
  result: DrillEvaluationResult;
  userTranscript: string;
  targetCorrection: string;
  onRetry: () => void;
  onNext: () => void;
  isLastInQueue: boolean;
  onFinish: () => void;
  onSayItBetter?: () => void;
  onPracticeVariant?: (variant: string) => void;
}

export function ErrorDrillFeedbackCard({
  record,
  result,
  userTranscript,
  targetCorrection,
  onRetry,
  onNext,
  isLastInQueue,
  onFinish,
  onSayItBetter,
  onPracticeVariant,
}: ErrorDrillFeedbackCardProps) {
  const { speak, isSpeaking } = useBrowserTTS();
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [playingText, setPlayingText] = useState<string | null>(null);

  useEffect(() => {
    if (result.corrected) {
      soundEffects.playCorrect();
    } else {
      soundEffects.playIncorrect();
    }
  }, [result.corrected]);

  const handleSpeak = async (text: string) => {
    setPlayingText(text);
    try {
      speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 0.9 });
    } finally {
      setTimeout(() => setPlayingText(null), 1500);
    }
  };

  const isSuccess = result.corrected;
  const isFastPass = result.isFastPass || result.evaluationSource === "fast_pass";
  const variants = result.sayItBetter
    ? [
        { id: "professional", title: "Công sở", text: result.sayItBetter.professional },
        { id: "casual", title: "Đời thường", text: result.sayItBetter.casual },
        { id: "idiomatic", title: "Khẩu ngữ", text: result.sayItBetter.idiomatic },
      ].filter((v) => v.text?.trim())
    : result.betterPhrasing && result.betterPhrasing !== targetCorrection
      ? [{ id: "better", title: "Tự nhiên hơn", text: result.betterPhrasing }]
      : [];

  return (
    <Card className="h-full flex flex-col border-border/80 bg-card shadow-xs overflow-hidden rounded-3xl animate-in fade-in-0 duration-200">
      {/* Status Header Banner */}
      <div
        className={`px-4 py-3 shrink-0 flex items-center justify-between border-b ${
          isSuccess
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400"
        }`}
      >
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <div>
            <h3 className="font-bold text-sm tracking-tight">
              {isSuccess ? "Đã sửa được lỗi! 🎉" : "Chưa chuẩn xác"}
            </h3>
            <p className="text-[11px] opacity-85">
              {isSuccess
                ? "Bộ nhớ FSRS & BKT đã được nâng cấp"
                : "Hãy đối chiếu và thử lại ngay"}
            </p>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-lg font-black">{Math.round(result.overallScore)}</span>
          <span className="text-[10px] opacity-75">/100</span>
        </div>
      </div>

      {/* Main Content Area */}
      <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3">
        {/* Fast-pass + hesitation + independence badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isFastPass && (
            <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 bg-amber-500/10">
              <Zap className="size-3 mr-0.5 fill-amber-500 text-amber-500" />
              Fast-Pass 0ms
            </Badge>
          )}
          {result.hesitationMetrics && (
            <Badge variant="outline" className="text-[10px] font-mono border-border/60">
              <Gauge className="size-3 mr-1" />
              {result.hesitationMetrics.wpm} wpm · {result.hesitationMetrics.hesitationLevel}
            </Badge>
          )}
          {(result.independenceScore ?? 100) < 100 && (
            <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600">
              Tự lập {result.independenceScore}%
            </Badge>
          )}
        </div>

        {/* Metric Badges (SB/VN-EN/Survival aligned) */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-[10px] text-muted-foreground block font-medium">Ngữ pháp</span>
            <span className="font-mono font-bold text-xs">
              {Math.round(result.grammarAccuracy || 0)}%
            </span>
          </div>
          <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-[10px] text-muted-foreground block font-medium">Tự nhiên</span>
            <span className="font-mono font-bold text-xs">
              {Math.round(result.naturalness || 0)}%
            </span>
          </div>
          <div className="p-2 rounded-xl bg-muted/40 border border-border/50">
            <span className="text-[10px] text-muted-foreground block font-medium">Mục tiêu</span>
            <span
              className={`font-bold text-xs ${
                result.targetErrorResolved ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {result.targetErrorResolved ? "Khắc phục" : "Vẫn dính"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { label: "Ý", v: result.conceptClarityScore ?? 80 },
            { label: "Trôi chảy", v: result.fluencyScore ?? 75 },
            { label: "Truy xuất", v: result.retrievalScore ?? 75 },
          ].map((s) => (
            <Badge
              key={s.label}
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                s.v >= 75
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
              }`}
            >
              {s.label}: {s.v}%
            </Badge>
          ))}
        </div>

        {/* User Transcript vs Target */}
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Bạn vừa nói:
            </span>
            <p className="font-medium text-foreground italic">
              &ldquo;{userTranscript || "(Không thu được âm thanh)"}&rdquo;
            </p>
          </div>

          <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                Mục tiêu sửa chuẩn:
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSpeak(targetCorrection)}
                disabled={isSpeaking}
                className="h-5 p-1 text-emerald-600 hover:text-emerald-700"
                title="Nghe phát âm chuẩn"
              >
                <Volume2 className="size-3" />
              </Button>
            </div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              &ldquo;{targetCorrection}&rdquo;
            </p>
          </div>

          {result.betterPhrasing && result.betterPhrasing !== targetCorrection && !result.sayItBetter && (
            <div className="p-2.5 rounded-xl border border-primary/30 bg-primary/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider flex items-center gap-1">
                  <Sparkles className="size-3" />
                  Diễn đạt tự nhiên hơn:
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSpeak(result.betterPhrasing!)}
                  disabled={isSpeaking}
                  className="h-5 p-1 text-primary hover:text-primary/80"
                  title="Nghe mẫu diễn đạt mới"
                >
                  <Volume2 className="size-3" />
                </Button>
              </div>
              <p className="font-medium text-foreground">
                &ldquo;{result.betterPhrasing}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Errors list */}
        {result.errors && result.errors.length > 0 && (
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Điểm cần sửa:
            </span>
            {result.errors.slice(0, 2).map((err, i) => (
              <div key={i} className="text-xs flex flex-wrap items-center gap-1.5">
                <span className="line-through text-red-500 font-mono font-semibold">"{err.userText}"</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-600 font-mono font-bold">"{err.correction}"</span>
                <span className="text-muted-foreground text-[11px]">({err.explanation})</span>
              </div>
            ))}
          </div>
        )}

        {/* Say It Better trio */}
        {variants.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="size-3 text-primary" />
              Say It Better:
            </span>
            {variants.map((v) => (
              <div key={v.id} className="p-2 rounded-xl border border-border/60 bg-card flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground">{v.title}:</span>
                  <p className="font-mono text-xs font-semibold truncate">"{v.text}"</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSpeak(v.text)}
                    className={`size-6 p-0 rounded-full ${playingText === v.text ? "text-primary animate-pulse" : "text-muted-foreground"}`}
                  >
                    <Volume2 className="size-3" />
                  </Button>
                  {onPracticeVariant && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onPracticeVariant(v.text)}
                      className="h-6 px-2 rounded-lg text-[10px] font-semibold gap-1"
                    >
                      <Mic className="size-3 text-primary" />
                      <span>Luyện nói</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Spoken Coach Feedback */}
        <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Award className="size-3.5" />
            <span>AI Bác Sĩ Khẩu Ngữ Nhận Xét:</span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            {result.actionableFeedback || result.coachFeedbackVi}
          </p>
          {result.praisePoints && result.praisePoints.length > 0 && (
            <p className="text-xs text-emerald-600 font-medium">✨ {result.praisePoints[0]}</p>
          )}
        </div>

        {(result.naturalAlternatives?.length ?? 0) > 0 && (
          <div>
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="w-full p-2 rounded-xl bg-muted/30 border border-border/50 text-xs font-semibold flex items-center justify-between"
            >
              <span>Biến thể khác ({result.naturalAlternatives?.length})</span>
              {showAlternatives ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
            {showAlternatives && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {result.naturalAlternatives?.map((alt, i) => (
                  <Badge key={i} variant="secondary" className="text-[11px]">
                    "{alt.expression}"
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Action Footer */}
      <div className="p-3 border-t border-border/60 bg-muted/10 shrink-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {result.isSayItBetterNeeded && onSayItBetter ? (
            <Button
              size="sm"
              onClick={onSayItBetter}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-indigo-600 to-primary text-white"
            >
              <Sparkles className="size-3.5" />
              Say It Better
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5"
              title="Thử nói lại câu này [R]"
            >
              <RotateCcw className="size-3.5" />
              Thử lại [R]
            </Button>
          )}

          {!isLastInQueue ? (
            <Button
              size="sm"
              onClick={onNext}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs"
              title="Chuyển sang lỗi kế tiếp"
            >
              Tiếp tục
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onFinish}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Trophy className="size-3.5" />
              Tổng kết [🏆]
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
