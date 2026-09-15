"use client";

import { useState } from "react";
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
  Zap,
  Gauge,
  Mic,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ConversationTurn } from "@/types/conversation";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface TurnFeedbackCardProps {
  turn: ConversationTurn;
  onRetry?: () => void;
  onContinue: () => void;
  onSayItBetter?: () => void;
  onPracticeVariant?: (variant: string) => void;
}

export function TurnFeedbackCard({ turn, onRetry, onContinue, onSayItBetter, onPracticeVariant }: TurnFeedbackCardProps) {
  const tts = useBrowserTTS();
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [playingText, setPlayingText] = useState<string | null>(null);
  const ped = turn.pedagogy;
  if (!ped) return null;

  const handlePlay = async (text: string) => {
    setPlayingText(text);
    try {
      tts.speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 0.95 });
    } finally {
      setTimeout(() => setPlayingText(null), 1500);
    }
  };

  const score = ped.turnScore ?? 75;
  const isSuccess = score >= 70;
  const isFastPass = ped.isFastPass || ped.evaluationSource === "fast_pass";
  const variants = ped.sayItBetter
    ? [
        { id: "casual", title: "Đời thường", text: ped.sayItBetter.casual },
        { id: "professional", title: "Công sở", text: ped.sayItBetter.professional },
        { id: "idiomatic", title: "Khẩu ngữ", text: ped.sayItBetter.idiomatic },
      ].filter((v) => v.text?.trim())
    : ped.nativeReformulation && ped.nativeReformulation !== turn.text
      ? [{ id: "native", title: "Bản xứ", text: ped.nativeReformulation }]
      : [];

  return (
    <Card className="rounded-3xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-full animate-in fade-in-0 duration-200">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full gap-1 ${isSuccess ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}>
              {isSuccess ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
              <span>{isSuccess ? `Turn tốt: ${score}/100` : `Cần cải thiện: ${score}/100`}</span>
            </Badge>
            {isFastPass && (
              <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 bg-amber-500/10">
                <Zap className="size-3 mr-0.5 fill-amber-500 text-amber-500" />
                Fast-Pass
              </Badge>
            )}
            {ped.hesitationMetrics && (
              <Badge variant="outline" className="text-[10px] font-mono border-border/60">
                <Gauge className="size-3 mr-1" />
                {ped.hesitationMetrics.wpm} wpm
              </Badge>
            )}
          </div>
          {(ped.independenceScore ?? 100) < 100 && (
            <span className="text-[11px] font-mono text-amber-600">Tự lập {ped.independenceScore}%</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {[
            { label: "Ý", v: ped.meaningScore ?? score },
            { label: "Tự nhiên", v: score },
            { label: "Trôi chảy", v: ped.fluencyScore ?? 75 },
            { label: "Truy xuất", v: ped.retrievalScore ?? 75 },
          ].map((s) => (
            <Badge
              key={s.label}
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.v >= 75 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}
            >
              {s.label}: {s.v}%
            </Badge>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5">
          <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bạn vừa nói:</span>
            <p className="font-mono text-xs font-semibold">"{turn.text}"</p>
          </div>

          {ped.nativeReformulation && ped.nativeReformulation !== turn.text && (
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Sparkles className="size-3" /> Bản xứ:
                </span>
                <Button variant="ghost" size="sm" onClick={() => handlePlay(ped.nativeReformulation!)} className="size-6 p-0 rounded-full text-primary hover:bg-primary/20">
                  <Volume2 className={`size-3.5 ${playingText === ped.nativeReformulation ? "animate-pulse" : ""}`} />
                </Button>
              </div>
              <p className="font-mono text-xs font-bold">"{ped.nativeReformulation}"</p>
            </div>
          )}

          {ped.errors && ped.errors.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Điểm cần sửa:</span>
              {ped.errors.slice(0, 2).map((err, i) => (
                <div key={i} className="text-xs flex flex-wrap items-center gap-1">
                  <span className="line-through text-red-500 font-mono font-semibold">"{err.userText}"</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-600 font-mono font-bold">"{err.correction}"</span>
                  <span className="text-muted-foreground text-[11px]">({err.explanation})</span>
                </div>
              ))}
            </div>
          )}

          {(ped.actionableFeedback || ped.coachTipVi) && (
            <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/50 text-xs space-y-1">
              <p className="text-muted-foreground leading-relaxed">{ped.actionableFeedback || ped.coachTipVi}</p>
              {ped.praisePoints?.[0] && <p className="text-emerald-600 font-medium">✨ {ped.praisePoints[0]}</p>}
            </div>
          )}

          {variants.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="size-3 text-primary" /> Say It Better:
              </span>
              {variants.map((v) => (
                <div key={v.id} className="p-2 rounded-xl border border-border/60 bg-card flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground">{v.title}:</span>
                    <p className="font-mono text-xs font-semibold truncate">"{v.text}"</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handlePlay(v.text)} className="size-6 p-0 rounded-full text-muted-foreground">
                      <Volume2 className="size-3" />
                    </Button>
                    {onPracticeVariant && (
                      <Button variant="secondary" size="sm" onClick={() => onPracticeVariant(v.text)} className="h-6 px-2 rounded-lg text-[10px] font-semibold gap-1">
                        <Mic className="size-3 text-primary" />
                        <span>Luyện nói</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(ped.naturalAlternatives?.length ?? 0) > 0 && (
            <div>
              <button onClick={() => setShowAlternatives(!showAlternatives)} className="w-full p-2 rounded-xl bg-muted/30 border border-border/50 text-xs font-semibold flex items-center justify-between">
                <span>Biến thể khác ({ped.naturalAlternatives?.length})</span>
                {showAlternatives ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
              {showAlternatives && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {ped.naturalAlternatives?.map((alt, i) => (
                    <Badge key={i} variant="secondary" className="text-[11px]">"{alt.expression}"</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 shrink-0">
          {ped.isSayItBetterNeeded && onSayItBetter ? (
            <Button size="sm" onClick={onSayItBetter} className="rounded-xl h-8 px-3 gap-1.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-primary text-white btn-spring">
              <Sparkles className="size-3.5" />
              <span>Say It Better</span>
            </Button>
          ) : onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry} className="rounded-xl h-8 px-3 gap-1.5 text-xs font-semibold">
              <RotateCcw className="size-3.5" />
              <span>Nói lại [Space]</span>
            </Button>
          ) : (
            <div />
          )}
          <Button size="sm" onClick={onContinue} className="rounded-xl h-8 px-4 gap-1.5 text-xs font-bold shadow-xs btn-spring">
            <span>Tiếp tục [Enter]</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
