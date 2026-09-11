"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Flame,
  HelpCircle,
  Volume2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Ban,
  Clock,
} from "lucide-react";
import type { CircumlocutionTask } from "@/types/survival-speaking";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";

interface CircumlocutionCardProps {
  task: CircumlocutionTask;
  isRecording: boolean;
  countdownSeconds: number;
}

export function CircumlocutionCard({
  task,
  isRecording,
  countdownSeconds,
}: CircumlocutionCardProps) {
  const tts = useBrowserTTS();
  const [showHints, setShowHints] = useState(false);

  return (
    <Card className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-mono text-xs font-bold gap-1 px-3 py-1 rounded-full">
              <ShieldAlert className="size-3.5" />
              <span>Circumlocution Gym (Diễn giải khi quên từ)</span>
            </Badge>
            <Badge variant="outline" className="text-xs font-mono border-border/80">
              {task.category}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full">
            <Clock className="size-3.5" />
            <span>Chuẩn bị: {countdownSeconds}s</span>
          </div>
        </div>

        {/* Target Concept Showcase with Forbidden Tag */}
        <div className="space-y-4 text-center py-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
            Mô tả đồ vật / khái niệm này bằng tiếng Anh (KHÔNG ĐƯỢC NÓI TỪ MỤC TIÊU):
          </p>

          <div className="inline-flex flex-col items-center p-6 rounded-3xl bg-muted/40 border-2 border-dashed border-primary/40 space-y-2">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground font-mono">
              "{task.targetWord}"
            </h2>
            <span className="text-sm font-medium text-muted-foreground">
              (Ý nghĩa: {task.vietnameseMeaning})
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-red-500 font-semibold">
            <Ban className="size-4" />
            <span>Từ cấm phát âm: {task.forbiddenWords.map((w) => `"${w}"`).join(", ")}</span>
          </div>
        </div>

        {/* Aristotelian 2-Step Definition Formula */}
        <div className="grid sm:grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border/70 text-xs">
          <div className="p-2.5 rounded-xl bg-card border border-border/50 space-y-1 shadow-2xs">
            <span className="font-bold text-primary flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
              🏷️ 1. Chủng loại (Genus Proximum)
            </span>
            <p className="font-mono text-muted-foreground text-[11px]">
              "It's a kind of <span className="text-foreground font-semibold">{task.genus || task.category}</span>..."
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-card border border-border/50 space-y-1 shadow-2xs">
            <span className="font-bold text-primary flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
              ⚙️ 2. Công dụng cốt lõi (Differentia)
            </span>
            <p className="font-mono text-muted-foreground text-[11px]">
              "...that you use to <span className="text-foreground font-semibold">{task.differentia || task.hints.functionHint || "..."}</span>"
            </p>
          </div>
        </div>

        {/* 4-Tier Property Ladder Hints Accordion */}
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowHints((prev) => !prev)}
              className="flex items-center gap-2 text-xs font-bold text-primary hover:underline"
            >
              <HelpCircle className="size-4" />
              <span>Thang 4 bậc gợi ý đặc tính (Property Ladder Hints)</span>
              {showHints ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
            <span className="text-[11px] text-muted-foreground italic">
              {showHints ? "Đang mở gợi ý" : "Bấm nếu bị đơ ý"}
            </span>
          </div>

          {showHints && (
            <div className="space-y-2.5 pt-2 border-t border-border/40 text-xs animate-in fade-in-0 duration-200">
              {task.hints.functionHint && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-950 dark:text-blue-200">
                  <b>1. Chức năng (Function):</b> {task.hints.functionHint}
                </div>
              )}
              {task.hints.categoryHint && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                  <b>2. Chủng loại (Category):</b> {task.hints.categoryHint}
                </div>
              )}
              {task.hints.contextHint && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200">
                  <b>3. Bối cảnh (Context):</b> {task.hints.contextHint}
                </div>
              )}
              {task.hints.starterHint && (
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-950 dark:text-purple-200 flex items-center justify-between">
                  <span><b>4. Câu mở đầu (Starter):</b> "{task.hints.starterHint}"</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => tts.speak(task.hints.starterHint || "")}
                    className="size-6 p-0 text-purple-600 dark:text-purple-400"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
