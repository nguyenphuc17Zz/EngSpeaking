"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  Sparkles,
  Volume2,
  Copy,
  Check,
  Lightbulb,
  ShieldCheck,
  Layers,
  ChevronDown,
  Quote,
  Target,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalHintTier,
} from "@/types/survival-speaking";

interface SurvivalContextCardProps {
  mode: "circumlocution" | "scenarios";
  circumTask: CircumlocutionTask | null;
  scenarioTask: SurvivalScenarioTask | null;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
}

export function SurvivalContextCard({
  mode,
  circumTask,
  scenarioTask,
  currentHintTier,
  onSelectHintTier,
}: SurvivalContextCardProps) {
  const tts = useBrowserTTS();
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
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

  const cleanSurvivalPrefix = (text?: string | null): string => {
    if (!text) return "";
    return text
      .replace(
        /^(câu diễn giải mẫu|câu mẫu chuẩn|câu mẫu|câu hoàn chỉnh|sample sentence|model answer):\s*/i,
        ""
      )
      .trim();
  };

  // Build 4-Tier hints for Circumlocution
  const circumHints: SurvivalHintTier[] =
    circumTask?.tierHints && circumTask.tierHints.length > 0
      ? circumTask.tierHints
      : [
          {
            tier: 0,
            title: "Không gợi ý",
            content: "Tự diễn giải trong 5 giây mà không dùng bất kỳ từ cấm nào.",
          },
          {
            tier: 1,
            title: "Chức năng (Function)",
            content:
              circumTask?.hints?.functionHint ||
              "Mô tả công dụng chính hoặc đặc điểm cốt lõi của khái niệm này.",
          },
          {
            tier: 2,
            title: "Chủng loại & Vị trí (Category)",
            content:
              `${circumTask?.hints?.categoryHint || ""} ${
                circumTask?.hints?.contextHint ? `— ${circumTask.hints.contextHint}` : ""
              }`.trim() || "Chủng loại và bối cảnh sử dụng",
          },
          {
            tier: 3,
            title: "Khung câu mở đầu (Starter)",
            content:
              circumTask?.hints?.starterHint ||
              "It's a kind of ______ that you use to ______ .",
          },
          {
            tier: 4,
            title: "Câu diễn giải mẫu hoàn chỉnh",
            content:
              circumTask?.sampleExplanations?.[0] ||
              "It's an item you use when you want to...",
          },
        ];

  // Build 4-Tier hints for Scenarios
  const scenarioHints: SurvivalHintTier[] =
    scenarioTask?.tierHints && scenarioTask.tierHints.length > 0
      ? scenarioTask.tierHints
      : [
          {
            tier: 0,
            title: "Không gợi ý",
            content: "Phản xạ cứu cánh ngay lập tức để giữ nhịp hội thoại.",
          },
          {
            tier: 1,
            title: "Chiến lược xử lý",
            content: `Chiến lược đề xuất: ${
              scenarioTask?.recommendedSkill || "Ứng biến nhanh"
            }`,
          },
          {
            tier: 2,
            title: "Cụm từ cứu cánh",
            content:
              scenarioTask?.suggestedRepairPhrases?.slice(0, 2).join(" / ") ||
              "Could you repeat that...",
          },
          {
            tier: 3,
            title: "Khung câu ứng biến",
            content: `Sorry, ${
              scenarioTask?.suggestedRepairPhrases?.[0]?.split(" ")[0] || "could you"
            } ______ ?`,
          },
          {
            tier: 4,
            title: "Câu mẫu chuẩn hoàn chỉnh",
            content:
              scenarioTask?.suggestedRepairPhrases?.[0] ||
              "Sorry, could you say that again a little more slowly?",
          },
        ];

  const activeHints = mode === "circumlocution" ? circumHints : scenarioHints;

  // Best model answer
  const modelAnswer =
    mode === "circumlocution"
      ? cleanSurvivalPrefix(circumTask?.sampleExplanations?.[0]) ||
        activeHints.find((h) => h.tier === 4)?.content ||
        ""
      : cleanSurvivalPrefix(scenarioTask?.suggestedRepairPhrases?.[0]) ||
        activeHints.find((h) => h.tier === 4)?.content ||
        "";

  return (
    <Card className="rounded-3xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Header: Title + Tier Jump Selectors */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <ShieldCheck className="size-4 text-amber-500" />
            <span>Khung Diễn Giải & Gợi Ý</span>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
            {[0, 1, 2, 3, 4].map((t) => (
              <button
                key={t}
                onClick={() => onSelectHintTier(t)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-lg font-bold transition-all ${
                  currentHintTier === t
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Nấc gợi ý T${t}`}
              >
                T{t}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Middle Container */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
          {/* Framework / Scaffolding Formula */}
          {mode === "circumlocution" && circumTask ? (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Target className="size-3" />
                  <span>Cấu trúc Aristotelian Definition:</span>
                </span>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono">
                  Genus + Differentia
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                <div className="p-2 rounded-xl bg-card/80 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    1. Phân loại (Genus):
                  </span>
                  <span className="text-foreground font-semibold">
                    "It is a kind of {circumTask.genus || circumTask.category || "object / concept"}..."
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card/80 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    2. Đặc tính khác biệt (Differentia):
                  </span>
                  <span className="text-foreground font-semibold">
                    "...that people use to {circumTask.differentia || circumTask.hints.functionHint || "perform a specific task"}."
                  </span>
                </div>
              </div>
            </div>
          ) : mode === "scenarios" && scenarioTask ? (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Lightbulb className="size-3" />
                  <span>Chiến lược cứu cánh:</span>
                </span>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono">
                  {scenarioTask.recommendedSkill}
                </Badge>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                Giữ phong thái tự tin, xác nhận thông tin tức thì và yêu cầu đối phương lặp lại hoặc làm rõ mà không gây ngắt quãng buổi hội thoại.
              </p>
            </div>
          ) : null}

          {/* Model Answer Showcase */}
          {modelAnswer && (
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Quote className="size-3 text-amber-500" />
                  <span>
                    {mode === "circumlocution" ? "Diễn giải mẫu chuẩn:" : "Câu cứu cánh mẫu:"}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(modelAnswer, "model-answer")}
                    className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    title="Sao chép câu mẫu"
                  >
                    {copiedId === "model-answer" ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(modelAnswer)}
                    className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-primary"
                    title="Nghe phát âm chuẩn"
                  >
                    <Volume2 className="size-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                "{modelAnswer}"
              </p>
            </div>
          )}

          {/* 4-Tier Ladder */}
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Nấc thang hỗ trợ (T1 - T4):</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHintsExpanded(!isHintsExpanded)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{isHintsExpanded ? "Thu gọn" : "Mở rộng"}</span>
                <ChevronDown
                  className={`size-3 transition-transform ${
                    isHintsExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {isHintsExpanded && (
              <div className="space-y-1.5 pt-1">
                {activeHints
                  .filter((h) => h.tier > 0)
                  .map((h) => {
                    const isSelected = currentHintTier === h.tier;
                    const cleanText = cleanSurvivalPrefix(h.content);

                    return (
                      <div
                        key={h.tier}
                        onClick={() => onSelectHintTier(h.tier)}
                        className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer space-y-1 ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/40 shadow-xs"
                            : "bg-card border-border/60 hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-[9px] px-1.5 py-0 h-4 font-mono font-bold ${
                                isSelected
                                  ? "bg-amber-600 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              T{h.tier}
                            </Badge>
                            <span
                              className={`font-semibold text-[11px] ${
                                isSelected ? "text-amber-700 dark:text-amber-400 font-bold" : "text-foreground"
                              }`}
                            >
                              {h.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleCopy(cleanText, `hint-${h.tier}`)}
                              className="text-muted-foreground hover:text-foreground p-1 rounded-sm transition-colors"
                              title="Sao chép nội dung gợi ý"
                            >
                              {copiedId === `hint-${h.tier}` ? (
                                <Check className="size-3 text-emerald-500" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handlePlayAudio(cleanText)}
                              className="text-muted-foreground hover:text-primary p-1 rounded-sm transition-colors"
                              title="Nghe âm thanh"
                            >
                              <Volume2 className="size-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground font-mono leading-relaxed pl-6">
                          {cleanText}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
