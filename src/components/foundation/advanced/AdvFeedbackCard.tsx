"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Sparkles, Volume2, RotateCcw, ArrowRight, Zap, Gauge } from "lucide-react";
import type { AdvancedEvaluation } from "@/types/advanced";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

interface AdvFeedbackCardProps {
  evaluation: AdvancedEvaluation;
  onRetry: () => void;
  onContinue: () => void;
}

export function AdvFeedbackCard({ evaluation, onRetry, onContinue }: AdvFeedbackCardProps) {
  const tts = useBrowserTTS();
  const isFast = evaluation.isFastPass || evaluation.evaluationSource === "fast_pass";

  return (
    <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-card shadow-sm overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
        <div className="flex flex-col gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isFast ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-purple-500/10 text-purple-600 border-purple-500/30"}`}>
                <Zap className="size-3 mr-1" />{isFast ? "Fast-Pass 0ms" : "AI Deep Review"}
              </Badge>
              {evaluation.toulmin && (
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Toulmin {evaluation.toulmin.toulminScore}%
                </Badge>
              )}
              {evaluation.composure && (
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-600 border-sky-500/30">
                  <Gauge className="size-3 mr-1" />{evaluation.composure.grade}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-muted-foreground">Tổng:</span>
              <span className={`font-mono font-bold text-base ${evaluation.isSuccessful ? "text-emerald-500" : "text-amber-500"}`}>{evaluation.overallScore}/100</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <CheckCircle2 className="size-3 mr-1" />Ý {evaluation.meaningScore}%
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/30">
              Ngữ pháp {evaluation.grammarScore}%
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
              <Sparkles className="size-3 mr-1" />Tự nhiên {evaluation.naturalnessScore}%
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-muted/60">
              {(evaluation.responseLatencyMs / 1000).toFixed(1)}s
            </Badge>
          </div>
          {evaluation.toulmin && evaluation.toulmin.elementsFound && (
            <div className="flex flex-wrap gap-1">
              {(["claim", "data", "warrant", "rebuttal"] as const).map((el) => (
                <span key={el} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${evaluation.toulmin!.elementsFound.includes(el) ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-dashed border-border/60"}`}>
                  {evaluation.toulmin!.elementsFound.includes(el) ? "✓" : "○"} {el}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Bạn đã nói:</span>
            <p className="font-mono text-xs font-semibold">“{evaluation.userTranscript}”</p>
          </div>
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1"><Sparkles className="size-3" /> Bản xứ:</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => tts.speak(evaluation.betterVersion)} className="size-6 p-0 text-primary cursor-pointer"><Volume2 className="size-3.5" /></Button>
            </div>
            <p className="font-mono text-xs font-bold">“{evaluation.betterVersion}”</p>
          </div>
          {evaluation.fallacies && evaluation.fallacies.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1"><AlertTriangle className="size-3" /> Ngụy biện: {evaluation.fallacies[0].labelVi}</span>
              <p className="text-[11px] text-muted-foreground">{evaluation.fallacies[0].explanationVi}</p>
            </div>
          )}
          {evaluation.errors && evaluation.errors.length > 0 && (
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              {evaluation.errors.slice(0, 2).map((err, i) => (
                <div key={i} className="text-xs flex flex-wrap items-center gap-1">
                  <span className="line-through text-red-500 font-mono font-semibold">“{err.userText}”</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-emerald-600 font-mono font-bold">“{err.correction}”</span>
                  <span className="text-muted-foreground text-[11px]">({err.explanation})</span>
                </div>
              ))}
            </div>
          )}
          {evaluation.sayItBetter && (
            <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/60 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Say It Better:</span>
              <p className="font-mono">💼 “{evaluation.sayItBetter.professional}”</p>
              <p className="font-mono">☕ “{evaluation.sayItBetter.casual}”</p>
              <p className="font-mono">⚡ “{evaluation.sayItBetter.idiomatic}”</p>
            </div>
          )}
          {evaluation.praisePoints.length > 0 && (
            <p className="text-[11px] text-emerald-600">👍 {evaluation.praisePoints[0]}</p>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed">{evaluation.actionableFeedback}</p>
        </div>

        <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onRetry} className="h-9 px-4 rounded-xl text-xs gap-1.5 cursor-pointer">
            <RotateCcw className="size-3.5" /><span>Nói lại [Space]</span>
          </Button>
          <Button size="sm" onClick={onContinue} className="h-9 px-5 rounded-xl text-xs font-bold gap-1.5 cursor-pointer">
            <span>Tiếp theo [Enter]</span><ArrowRight className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
