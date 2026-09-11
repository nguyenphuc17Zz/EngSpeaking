"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Volume2,
  RotateCcw,
  ArrowRight,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  Briefcase,
  Coffee,
  Lightbulb,
  Mic,
} from "lucide-react";
import type { VNToENEvaluation, SayItBetterSet } from "@/types/vn-to-en";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

interface VNFeedbackCardProps {
  evaluation: VNToENEvaluation;
  onRetry: () => void;
  onContinue: () => void;
  onSayItBetter: () => void;
  onPracticeVariant?: (variant: string) => void;
}

export function VNFeedbackCard({
  evaluation,
  onRetry,
  onContinue,
  onSayItBetter,
  onPracticeVariant,
}: VNFeedbackCardProps) {
  const tts = useBrowserTTS();
  const [showExpressions, setShowExpressions] = useState(false);
  const [playingText, setPlayingText] = useState<string | null>(null);

  const handlePlayTTS = async (text: string) => {
    setPlayingText(text);
    try {
      await tts.speak(text);
    } finally {
      setPlayingText(null);
    }
  };

  const getGapBadge = (gap: string) => {
    switch (gap) {
      case "retrieval_gap":
        return {
          label: "⚡ Retrieval Gap (Biết từ nhưng phản xạ chậm)",
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "knowledge_gap":
        return {
          label: "📚 Knowledge Gap (Cần củng cố từ/cấu trúc)",
          color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
        };
      case "production_gap":
        return {
          label: "🧩 Production Gap (Khẩu ngữ chưa trơn tru)",
          color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        };
      default:
        return {
          label: "✨ Phản xạ mượt mà",
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
    }
  };

  const gapInfo = getGapBadge(evaluation.gapType);

  // Synthesize Say It Better set if not explicitly passed
  const sayItBetter: SayItBetterSet = evaluation.sayItBetter || {
    professional: evaluation.betterVersion || "",
    casual: evaluation.naturalAlternatives?.[0]?.expression || evaluation.betterVersion || "",
    idiomatic: evaluation.naturalAlternatives?.[1]?.expression || evaluation.betterVersion || "",
  };

  const sayItBetterVariants = [
    {
      id: "professional",
      title: "Công sở & Trang trọng",
      label: "Professional",
      icon: Briefcase,
      text: sayItBetter.professional,
      color: "border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300",
      badgeColor: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
      desc: "Thích hợp cho email, họp dự án, giao tiếp với đối tác & sếp.",
    },
    {
      id: "casual",
      title: "Đời thường & Tự nhiên",
      label: "Casual & Friendly",
      icon: Coffee,
      text: sayItBetter.casual,
      color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      desc: "Trò chuyện thân mật, bạn bè quốc tế, giao tiếp đời thường.",
    },
    {
      id: "idiomatic",
      title: "Khẩu ngữ Bản xứ",
      label: "Native & Idiomatic",
      icon: Lightbulb,
      text: sayItBetter.idiomatic,
      color: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
      badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      desc: "Dùng cụm từ & quán ngữ đặc trưng của người bản xứ.",
    },
  ].filter((v) => Boolean(v.text && v.text.trim().length > 0));

  return (
    <Card className="rounded-3xl border border-border/80 bg-card shadow-md overflow-hidden animate-in fade-in-0 slide-in-from-bottom-3 duration-300">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Fast-Pass Badge */}
            {evaluation.isFastPass && (
              <Badge
                variant="outline"
                className="text-xs font-bold px-2.5 py-1 rounded-full border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-sm flex items-center gap-1"
              >
                <Zap className="size-3.5 fill-amber-500 text-amber-500" />
                ⚡ Fast-Pass (&lt;100ms)
              </Badge>
            )}

            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                evaluation.meaningScore >= 75
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              <CheckCircle2 className="size-3 mr-1" />
              Ý nghĩa: {evaluation.meaningScore}%
            </Badge>

            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                evaluation.grammarScore >= 75
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              {evaluation.grammarScore >= 75 ? (
                <CheckCircle2 className="size-3 mr-1" />
              ) : (
                <AlertTriangle className="size-3 mr-1" />
              )}
              Ngữ pháp: {evaluation.grammarScore}%
            </Badge>

            <Badge
              variant="outline"
              className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
            >
              <Sparkles className="size-3 mr-1" />
              Tự nhiên: {evaluation.naturalnessScore}%
            </Badge>

            <Badge variant="outline" className="text-xs font-mono px-2.5 py-1 rounded-full border bg-muted/60">
              <Clock className="size-3 mr-1 text-primary" />
              {(evaluation.responseLatencyMs / 1000).toFixed(1)}s
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Điểm câu:</span>
            <span
              className={`font-mono font-bold text-lg ${
                evaluation.isSuccessful ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {evaluation.overallScore}/100
            </span>
          </div>
        </div>

        {/* Gap Diagnosis Pill */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs font-semibold rounded-full border ${gapInfo.color}`}>
              {gapInfo.label}
            </Badge>
            <span className="text-muted-foreground hidden sm:inline">{evaluation.gapExplanation}</span>
          </div>
        </div>

        {/* User Said */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Bạn đã nói:
          </span>
          <p className="font-mono text-sm font-semibold text-foreground">
            "{evaluation.userTranscript}"
          </p>
        </div>

        {/* Actionable Errors (if any) */}
        {evaluation.errors && evaluation.errors.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              Điểm cần lưu ý chỉnh sửa:
            </span>
            <div className="space-y-1.5">
              {evaluation.errors.map((err, i) => (
                <div key={i} className="text-xs text-foreground flex flex-col sm:flex-row sm:items-center gap-1.5">
                  <span className="line-through text-red-500 font-mono font-semibold">"{err.userText}"</span>
                  <span className="text-muted-foreground hidden sm:inline">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">"{err.correction}"</span>
                  <span className="text-muted-foreground text-[11px]">({err.explanation})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bộ 3 "Say It Better" (Native Reformulation) */}
        {sayItBetterVariants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Bộ 3 Cách Diễn Đạt Bản Xứ (Say It Better)
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Bấm loa để nghe mẫu phát âm hoặc luyện nói trực tiếp
              </span>
            </div>

            <div className="grid gap-3">
              {sayItBetterVariants.map((variant) => {
                const IconComponent = variant.icon;
                const isThisPlaying = playingText === variant.text;
                return (
                  <div
                    key={variant.id}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 hover:shadow-sm ${variant.color}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${variant.badgeColor} flex items-center gap-1`}
                        >
                          <IconComponent className="size-3" />
                          {variant.title}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground hidden md:inline">
                          {variant.desc}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlayTTS(variant.text)}
                          className={`size-7 p-0 rounded-full hover:bg-background/80 ${
                            isThisPlaying ? "text-primary animate-pulse" : "text-muted-foreground"
                          }`}
                          title="Nghe mẫu phát âm"
                        >
                          <Volume2 className="size-3.5" />
                        </Button>

                        {onPracticeVariant && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onPracticeVariant(variant.text)}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-semibold gap-1 shadow-2xs hover:bg-background"
                            title="Luyện phát âm câu này"
                          >
                            <Mic className="size-3 text-primary" />
                            <span>Luyện nói bản này</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="font-mono text-sm font-bold text-foreground pl-0.5">
                      "{variant.text}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional "One Meaning -> Many Expressions" Drawer */}
        {evaluation.naturalAlternatives && evaluation.naturalAlternatives.length > 0 && (
          <div className="rounded-2xl border border-border/80 bg-muted/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExpressions(!showExpressions)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="size-3.5 text-primary" />
                <span>Thêm các biến thể khẩu ngữ khác (Other Expressions)</span>
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {evaluation.naturalAlternatives.length}
                </Badge>
              </div>
              {showExpressions ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>

            {showExpressions && (
              <div className="p-4 pt-1 space-y-2.5 border-t border-border/40 bg-card">
                {evaluation.naturalAlternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-mono font-semibold text-foreground">"{alt.expression}"</p>
                      <span className="text-[11px] text-muted-foreground">{alt.explanationVi || alt.tone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlayTTS(alt.expression)}
                        className="size-7 p-0 rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="size-3.5" />
                      </Button>
                      {onPracticeVariant && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPracticeVariant(alt.expression)}
                          className="h-7 px-2 rounded-lg text-[10px] text-primary hover:bg-primary/10"
                        >
                          Luyện nói
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons: Say It Better / Say Again & Continue */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-border/40">
          {evaluation.isSayItBetterNeeded ? (
            <Button
              variant="default"
              size="lg"
              onClick={onSayItBetter}
              className="w-full sm:w-auto h-11 px-5 rounded-2xl font-bold gap-2 bg-gradient-to-r from-indigo-600 to-primary text-white shadow-md btn-spring"
            >
              <Sparkles className="size-4" />
              <span>Nói tự nhiên hơn (Say It Better)</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onClick={onRetry}
              className="w-full sm:w-auto h-11 rounded-2xl font-semibold gap-2 border-border/80"
            >
              <RotateCcw className="size-4" />
              <span>Nói lại câu này (Say Again)</span>
            </Button>
          )}

          <Button
            size="lg"
            onClick={onContinue}
            className="w-full sm:w-auto h-11 px-6 rounded-2xl font-bold gap-2 shadow-md shadow-primary/25 btn-spring"
          >
            <span>Câu tiếp theo (Continue)</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
