"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Sparkles,
  Ban,
  Clock,
  Copy,
  Check,
  Tag,
  Key,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalVocabularyItem,
} from "@/types/survival-speaking";

interface SurvivalPromptCardProps {
  mode: "circumlocution" | "scenarios";
  circumTask: CircumlocutionTask | null;
  scenarioTask: SurvivalScenarioTask | null;
  countdownSeconds: number;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
}

export function SurvivalPromptCard({
  mode,
  circumTask,
  scenarioTask,
  countdownSeconds,
}: SurvivalPromptCardProps) {
  const tts = useBrowserTTS();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Đã sao chép vào clipboard", text);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {
      toast.error("Không thể sao chép", "Vui lòng bôi đen chuột và nhấn phím Ctrl+C.");
    }
  }, []);

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 md:p-5 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            {mode === "circumlocution" ? (
              <Badge className="bg-primary/90 text-primary-foreground font-mono text-xs font-bold gap-1 px-2.5 py-0.5 rounded-full">
                <ShieldAlert className="size-3.5" />
                <span>Circumlocution Gym</span>
              </Badge>
            ) : (
              <Badge className="bg-amber-600 text-white font-mono text-xs font-bold gap-1 px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="size-3.5" />
                <span>Survival Scenario</span>
              </Badge>
            )}

            <Badge variant="outline" className="text-xs font-mono border-border/80">
              {mode === "circumlocution" ? circumTask?.category : scenarioTask?.contextTitleVi}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-3 py-0.5 rounded-full">
            <Clock className="size-3.5" />
            <span>Phản xạ: {countdownSeconds}s</span>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
          {mode === "circumlocution" && circumTask && (
            <div className="space-y-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block text-center">
                Mô tả đồ vật / khái niệm này bằng tiếng Anh (KHÔNG ĐƯỢC NÓI TỪ MỤC TIÊU):
              </span>

              {/* Target Word Display */}
              <div className="p-4 rounded-2xl bg-muted/40 border-2 border-dashed border-primary/40 text-center space-y-1 relative group">
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(circumTask.targetWord, "target-word")}
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Sao chép từ mục tiêu"
                  >
                    {copiedId === "target-word" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </div>

                <h2 className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
                  "{circumTask.targetWord}"
                </h2>
                <p className="text-xs font-medium text-muted-foreground">
                  (Ý nghĩa: {circumTask.vietnameseMeaning})
                </p>
              </div>

              {/* Forbidden Words Banner */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-500 font-semibold bg-red-500/10 py-2 px-3 rounded-xl border border-red-500/20 text-center flex-wrap">
                <Ban className="size-4 shrink-0" />
                <span>Từ cấm nói:</span>
                {circumTask.forbiddenWords.map((w, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-600 dark:text-red-400 font-mono font-bold text-[11px]"
                  >
                    "{w}"
                  </span>
                ))}
              </div>

              {/* Semantic Anchors (if available) */}
              {circumTask.semanticKeyAnchors && circumTask.semanticKeyAnchors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Key className="size-3 text-amber-500" />
                    <span>Ý tưởng từ khóa (Key Anchors):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {circumTask.semanticKeyAnchors.map((anchor, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-muted/60 text-foreground"
                      >
                        {anchor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Vocabulary / Circumlocution Connectors */}
              {circumTask.suggestedVocabulary && circumTask.suggestedVocabulary.length > 0 && (
                <div className="text-left space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <Sparkles className="size-3 text-primary" />
                    <span>Cụm từ diễn giải gợi ý (Bấm nghe):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {circumTask.suggestedVocabulary.map((item, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-xs text-foreground transition-all shadow-2xs"
                      >
                        <span className="font-semibold text-primary">{item.term}</span>
                        {item.meaningVi && (
                          <span className="text-[10px] text-muted-foreground">({item.meaningVi})</span>
                        )}
                        <button
                          onClick={() => handlePlayAudio(item.term)}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded-sm cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "scenarios" && scenarioTask && (
            <div className="space-y-3">
              {/* Problem Situation Description */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    <span>Sự cố giao tiếp thực tế:</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(scenarioTask.problemDescriptionVi, "scenario-desc")}
                    className="h-6 w-6 p-0 rounded-lg text-amber-700 hover:text-foreground"
                    title="Sao chép tình huống"
                  >
                    {copiedId === "scenario-desc" ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
                <p className="text-xs font-semibold text-foreground leading-relaxed">
                  {scenarioTask.problemDescriptionVi}
                </p>
              </div>

              {/* Incoming Dialogue Audio Prompt */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Câu đối phương vừa nói:
                  </span>
                  <p className="font-mono text-sm md:text-base font-bold text-foreground">
                    "{scenarioTask.audioPromptText}"
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(scenarioTask.audioPromptText, "dialog-prompt")}
                    className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                    title="Sao chép câu đối phương nói"
                  >
                    {copiedId === "dialog-prompt" ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(scenarioTask.audioPromptText)}
                    className="gap-1 text-xs font-bold rounded-xl h-8 px-2.5 border-primary/30 text-primary hover:bg-primary/10"
                    title="Nghe phát âm"
                  >
                    <Volume2 className="size-3.5" />
                    <span>Nghe</span>
                  </Button>
                </div>
              </div>

              {/* Survival Phrases Chips Bar */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Sparkles className="size-3 text-primary" />
                  <span>Cụm từ cứu cánh đề xuất (Bấm nghe):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    scenarioTask.suggestedVocabulary ||
                    scenarioTask.suggestedRepairPhrases.map((p) => ({ term: p, meaningVi: "" }))
                  ).map((item: SurvivalVocabularyItem, idx: number) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-xs text-foreground transition-all shadow-2xs"
                    >
                      <span className="font-semibold text-primary font-mono">"{item.term}"</span>
                      {item.meaningVi && (
                        <span className="text-[10px] text-muted-foreground">({item.meaningVi})</span>
                      )}
                      <button
                        onClick={() => handlePlayAudio(item.term)}
                        className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded-sm cursor-pointer"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
