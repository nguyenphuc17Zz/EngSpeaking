"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Volume2,
  Sparkles,
  RotateCcw,
  MessageSquare,
  Clock,
} from "lucide-react";
import type { SurvivalScenarioTask } from "@/types/survival-speaking";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

interface SurvivalScenarioCardProps {
  task: SurvivalScenarioTask;
  isRecording: boolean;
  countdownSeconds: number;
}

export function SurvivalScenarioCard({
  task,
  isRecording,
  countdownSeconds,
}: SurvivalScenarioCardProps) {
  const tts = useBrowserTTS();

  return (
    <Card className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-600 text-white font-mono text-xs font-bold gap-1 px-3 py-1 rounded-full">
              <AlertTriangle className="size-3.5" />
              <span>Real-Life Survival Scenario</span>
            </Badge>
            <Badge variant="outline" className="text-xs font-mono border-border/80">
              {task.contextTitleVi}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full">
            <Clock className="size-3.5" />
            <span>Phản xạ: {countdownSeconds}s</span>
          </div>
        </div>

        {/* Problem Situation */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Sự cố giao tiếp bất ngờ:
            </span>
            <p className="text-sm font-semibold text-foreground leading-relaxed">
              {task.problemDescriptionVi}
            </p>
          </div>

          {/* Incoming Audio Prompt */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">
                Câu nói của đối phương:
              </span>
              <p className="font-mono text-base font-bold text-foreground">
                "{task.audioPromptText}"
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tts.speak(task.audioPromptText)}
              className="shrink-0 gap-1.5 text-xs font-bold rounded-xl h-9"
            >
              <Volume2 className="size-4 text-primary" />
              <span>Nghe câu nói</span>
            </Button>
          </div>
        </div>

        {/* Suggested Repair Strategy & Phrases */}
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
          <span className="text-xs font-bold text-primary block">
            Chiến lược sinh tồn đề xuất:
          </span>
          <div className="flex flex-wrap gap-2">
            {task.suggestedRepairPhrases.map((phrase, i) => (
              <Badge
                key={i}
                variant="outline"
                className="font-mono text-xs bg-card border-primary/30 text-foreground px-3 py-1"
              >
                "{phrase}"
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
