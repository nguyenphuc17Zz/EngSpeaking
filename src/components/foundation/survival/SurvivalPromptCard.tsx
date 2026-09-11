"use client";

import { useState } from "react";
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
  ChevronDown,
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
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  const cleanSurvivalPrefix = (text?: string | null): string => {
    if (!text) return "";
    return text
      .replace(/^(câu diễn giải mẫu|câu mẫu chuẩn|câu mẫu|câu hoàn chỉnh|sample sentence|model answer):\s*/i, "")
      .trim();
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

          {/* 4-Tier Progressive Hints (Stack List - Open by Default) */}
          {activeHints && activeHints.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-2.5 mt-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Gợi ý nấc thang cứu cánh (T1 - T4):</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHintsExpanded(!isHintsExpanded)}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isHintsExpanded ? "Thu gọn gợi ý" : "Hiện tất cả (T1 - T4)"}</span>
                  <ChevronDown className={`size-3.5 transition-transform duration-200 ${isHintsExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>

              {isHintsExpanded && (
                <div className="space-y-1.5 pt-0.5 animate-in fade-in-0 duration-150">
                  {activeHints
                    .filter((h) => h.tier >= 1 && h.tier <= 4)
                    .map((h) => {
                      const tierStyles = [
                        { badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30", border: "border-sky-500/20 bg-card/90" },
                        { badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", border: "border-indigo-500/20 bg-card/90" },
                        { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", border: "border-amber-500/20 bg-card/90" },
                        { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", border: "border-emerald-500/20 bg-card/90" },
                      ];
                      const style = tierStyles[h.tier - 1] || tierStyles[0];
                      const isFullSentenceTier = h.tier === 3 || h.tier === 4;
                      const cleanContent = cleanSurvivalPrefix(h.content);
                      let sampleAudio = "";
                      if (mode === "circumlocution") {
                        sampleAudio =
                          cleanSurvivalPrefix(circumTask?.sampleExplanations?.[0]) ||
                          (!cleanContent.includes("______") ? cleanContent : "");
                      } else {
                        sampleAudio =
                          cleanSurvivalPrefix(scenarioTask?.suggestedRepairPhrases?.[0]) ||
                          (!cleanContent.includes("______") ? cleanContent : "");
                      }

                      return (
                        <div key={h.tier} className={`p-2.5 rounded-xl border ${style.border} shadow-2xs space-y-1`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${style.badge}`}>
                                T{h.tier}
                              </span>
                              <span className="text-xs font-bold text-foreground">{h.title}</span>
                            </div>

                            {isFullSentenceTier && sampleAudio && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePlayAudio(sampleAudio)}
                                className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold btn-spring"
                                title="Nghe câu mẫu hoàn chỉnh"
                              >
                                <Volume2 className="size-3" />
                                <span>{h.tier === 3 ? "Nghe câu hoàn chỉnh" : "Nghe mẫu chuẩn"}</span>
                              </Button>
                            )}
                          </div>

                          <p className="font-mono text-xs md:text-sm font-medium text-foreground/90 pl-0.5 leading-relaxed">
                            {h.content}
                          </p>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Bar: Quick Hint Status */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
            <Layers className="size-3 text-primary" />
            <span>Nấc thang ứng biến (T1 - T4)</span>
          </span>
          <button
            type="button"
            onClick={() => setIsHintsExpanded(!isHintsExpanded)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
            title="Bấm để ẩn hoặc hiện toàn bộ gợi ý T1-T4"
          >
            <Sparkles className="size-3 text-amber-500" />
            <span>{isHintsExpanded ? "Gợi ý T1-T4: Đang hiện" : "Gợi ý T1-T4: Đã ẩn (Bấm mở)"}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
