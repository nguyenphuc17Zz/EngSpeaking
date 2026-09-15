"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Target, Volume2, ArrowRight, Sparkles, Zap } from "lucide-react";
import type { AdvancedTask } from "@/types/advanced";
import { TRACK_META, LEVEL_META } from "@/lib/advanced/track-map";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface AdvPromptCardProps {
  task: AdvancedTask;
  currentTaskIndex: number;
  totalTasks: number;
  prepCountdown: number | null;
  isCountingDown: boolean;
  streak?: number;
  onNextTask?: () => void;
  isGeneratingNext?: boolean;
  onRegenerateWithAI?: () => void;
  isRegeneratingAI?: boolean;
}

export function AdvPromptCard({
  task,
  currentTaskIndex,
  totalTasks,
  prepCountdown,
  isCountingDown,
  streak = 0,
  onNextTask,
  isGeneratingNext = false,
  onRegenerateWithAI,
  isRegeneratingAI = false,
}: AdvPromptCardProps) {
  const tts = useBrowserTTS();
  const trackMeta = TRACK_META[task.track];

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">1. Thử thách</span>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
              {trackMeta.labelVi} · {task.level}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">{task.skillTag}</Badge>
            {task.source === "ai" ? (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-600 bg-emerald-500/10 gap-1">
                <Sparkles className="size-2.5 text-emerald-500" /> AI
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-blue-500/40 text-blue-600 bg-blue-500/10">Ngân hàng</Badge>
            )}
            {onRegenerateWithAI && (
              <Button type="button" variant="ghost" size="xs" onClick={onRegenerateWithAI} disabled={isRegeneratingAI || isGeneratingNext}
                className="h-5 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground rounded-md cursor-pointer">
                <Sparkles className={`size-2.5 text-primary ${isRegeneratingAI ? "animate-spin" : ""}`} />
                <span>{isRegeneratingAI ? "Đang tạo..." : "Tạo mới bằng AI"}</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {streak > 1 && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-mono font-bold py-0 px-1.5">🔥 {streak}</Badge>
            )}
            {onNextTask && (
              <Button variant="outline" size="sm" onClick={onNextTask} disabled={isGeneratingNext}
                className="h-6 px-2 rounded-lg text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 gap-1 cursor-pointer">
                <span>Thử thách khác</span><ArrowRight className="size-2.5" />
              </Button>
            )}
            <span className="text-[10px] font-mono text-muted-foreground">#{currentTaskIndex + 1}/{totalTasks}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          <div className="p-3 rounded-2xl bg-muted/25 border border-border/60 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Target className="size-3" /><span>{task.instruction}</span>
            </span>
            <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug select-text">“{task.promptVi}”</h2>
            {task.scenario && <p className="text-xs text-muted-foreground leading-relaxed">Bối cảnh: {task.scenario}</p>}
          </div>

          <div className="p-2.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{LEVEL_META[task.level].labelVi} · {LEVEL_META[task.level].descVi}</span>
              <Badge variant="outline" className="text-[9px] font-mono flex items-center gap-1 border-amber-500/40 text-amber-600">
                <Zap className="size-2.5" /> Blitz {task.blitzLimitSec}s
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {task.requiredToulminElements.map((el) => (
                <Badge key={el} variant="secondary" className="text-[10px] font-mono capitalize">{el}</Badge>
              ))}
            </div>
            {task.suggestedVocabulary && task.suggestedVocabulary.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {task.suggestedVocabulary.map((v, i) => (
                  <button key={i} type="button" onClick={() => tts.speak(sanitizeTextForTTS(v.term))}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-card border border-border/60 hover:border-primary/50 text-xs cursor-pointer">
                    <Volume2 className="size-3 text-primary" />
                    <span className="font-bold">{v.term}</span>
                    {v.meaningVi && <span className="text-muted-foreground text-[10px]">({v.meaningVi})</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono">
          {isCountingDown && prepCountdown !== null ? (
            <span className="flex items-center gap-1 text-primary font-bold animate-pulse"><Clock className="size-3" /> Nói sau {prepCountdown}s...</span>
          ) : (
            <span className="flex items-center gap-1"><Clock className="size-3" /> Prep {task.prepTimeSec}s · Blitz {task.blitzLimitSec}s</span>
          )}
          <span>Độ khó {task.difficulty.overall}/10</span>
        </div>
      </CardContent>
    </Card>
  );
}
