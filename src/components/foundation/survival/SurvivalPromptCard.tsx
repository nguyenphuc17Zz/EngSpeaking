"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Sparkles,
  Ban,
  Clock,
  HelpCircle,
  Lightbulb,
  X,
  Layers,
  Flame,
  MessageSquare,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalHintTier,
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
  currentHintTier,
  onSelectHintTier,
}: SurvivalPromptCardProps) {
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  // Build 4-Tier hints for Circumlocution
  const circumHints: SurvivalHintTier[] = circumTask?.tierHints && circumTask.tierHints.length > 0
    ? circumTask.tierHints
    : [
        { tier: 0, title: "Không gợi ý", content: "Tự diễn giải trong 5 giây mà không dùng từ cấm." },
        { tier: 1, title: "Chức năng", content: circumTask?.hints?.functionHint || "Mô tả công dụng chính của khái niệm này." },
        { tier: 2, title: "Chủng loại & Vị trí", content: `${circumTask?.hints?.categoryHint || ""} ${circumTask?.hints?.contextHint ? `— ${circumTask.hints.contextHint}` : ""}`.trim() || "Chủng loại và bối cảnh" },
        { tier: 3, title: "Khung câu mở đầu", content: circumTask?.hints?.starterHint || "It's a kind of ______ that you use to ______ ." },
        { tier: 4, title: "Câu diễn giải mẫu", content: circumTask?.sampleExplanations?.[0] || "It's an item you use when..." },
      ];

  // Build 4-Tier hints for Scenarios
  const scenarioHints: SurvivalHintTier[] = scenarioTask?.tierHints && scenarioTask.tierHints.length > 0
    ? scenarioTask.tierHints
    : [
        { tier: 0, title: "Không gợi ý", content: "Phản xạ cứu cánh ngay lập tức." },
        { tier: 1, title: "Chiến lược", content: `Chiến lược đề xuất: ${scenarioTask?.recommendedSkill || "Ứng biến nhanh"}` },
        { tier: 2, title: "Cụm từ cứu cánh", content: scenarioTask?.suggestedRepairPhrases?.slice(0, 2).join(" / ") || "Could you repeat that..." },
        { tier: 3, title: "Khung câu ứng biến", content: `Sorry, ${scenarioTask?.suggestedRepairPhrases?.[0]?.split(" ")[0] || "could you"} ______ ?` },
        { tier: 4, title: "Câu mẫu chuẩn", content: scenarioTask?.suggestedRepairPhrases?.[0] || "Sorry, could you say that again a little more slowly?" },
      ];

  const activeHints = mode === "circumlocution" ? circumHints : scenarioHints;
  const activeHint = currentHintTier > 0 ? activeHints.find((h) => h.tier === currentHintTier) : null;

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full space-y-3">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
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

        {/* Main Content Area */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
          {mode === "circumlocution" && circumTask && (
            <div className="space-y-3 text-center">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Mô tả đồ vật / khái niệm này bằng tiếng Anh (KHÔNG ĐƯỢC NÓI TỪ MỤC TIÊU):
              </span>

              {/* Target Word Display */}
              <div className="p-4 rounded-2xl bg-muted/40 border-2 border-dashed border-primary/40 space-y-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
                  "{circumTask.targetWord}"
                </h2>
                <p className="text-xs font-medium text-muted-foreground">
                  (Ý nghĩa: {circumTask.vietnameseMeaning})
                </p>
              </div>

              {/* Forbidden Words Banner */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-500 font-semibold bg-red-500/10 py-1.5 px-3 rounded-xl border border-red-500/20">
                <Ban className="size-4 shrink-0" />
                <span>Từ cấm nói: {circumTask.forbiddenWords.map((w) => `"${w}"`).join(", ")}</span>
              </div>

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
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded-sm"
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
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  <span>Sự cố giao tiếp thực tế:</span>
                </span>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePlayAudio(scenarioTask.audioPromptText)}
                  className="shrink-0 gap-1 text-xs font-bold rounded-xl h-8 px-2.5 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Volume2 className="size-3.5" />
                  <span>Nghe</span>
                </Button>
              </div>

              {/* Survival Phrases Chips Bar */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Sparkles className="size-3 text-primary" />
                  <span>Cụm từ cứu cánh đề xuất (Bấm nghe):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(scenarioTask.suggestedVocabulary || scenarioTask.suggestedRepairPhrases.map((p) => ({ term: p, meaningVi: "" }))).map(
                    (item: SurvivalVocabularyItem, idx: number) => (
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
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded-sm"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="size-3.5" />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4-Tier Inline Stepper Hint Dock */}
        <div className="pt-2 border-t border-border/40 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span>Nấc thang gợi ý ({currentHintTier === 0 ? "Tự phản xạ" : `Tầng ${currentHintTier}`}):</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-muted font-bold">H</kbd>
            </span>
          </div>

          {/* Stepper Buttons Row */}
          <div className="grid grid-cols-4 gap-1.5">
            {activeHints
              .filter((h) => h.tier > 0)
              .map((h) => {
                const isSelected = currentHintTier === h.tier;
                return (
                  <button
                    key={h.tier}
                    onClick={() => onSelectHintTier(isSelected ? 0 : h.tier)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all truncate text-center ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs scale-[1.02]"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    T{h.tier}: {h.title}
                  </button>
                );
              })}
          </div>

          {/* Active Hint Content Card */}
          {activeHint && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/25 space-y-1.5 animate-in fade-in-0 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                  <Lightbulb className="size-3.5 text-amber-500" />
                  <span>Tầng {activeHint.tier}: {activeHint.title}</span>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(activeHint.content)}
                    className="size-6 p-0 rounded-lg text-primary hover:bg-primary/20"
                    title="Nghe gợi ý"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectHintTier(0)}
                    className="size-6 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Đóng gợi ý"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {activeHint.content}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
