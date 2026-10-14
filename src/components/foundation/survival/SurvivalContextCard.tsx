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
  Lock,
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
    <Card className="rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Header: Title + Tier Jump Selectors */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-border pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2.5 bg-accent border border-border shrink-0" />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground truncate">
              2. KHUNG DIỄN GIẢI &amp; GỢI Ý
            </span>
          </div>

          <div className="flex items-center gap-0.5 bg-secondary p-0.5 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] shrink-0">
            {[0, 1, 2, 3, 4].map((t) => {
              const penalty = [0, 0.1, 0.25, 0.5, 0.85][t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSelectHintTier(t)}
                  className={`text-[10px] font-mono px-2 py-0.5 font-extrabold transition-all cursor-pointer ${
                    currentHintTier === t
                      ? "bg-primary text-primary-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-card"
                  }`}
                  title={`Nấc gợi ý T${t} (trừ ${Math.round(penalty * 100)}% tự lập)`}
                >
                  T{t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Middle Container */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3">
          {/* Framework / Scaffolding Formula */}
          {mode === "circumlocution" && circumTask ? (
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Target className="size-3 stroke-[2.5]" />
                  <span>CẤU TRÚC ARISTOTELIAN DEFINITION:</span>
                </span>
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-secondary text-foreground border border-border uppercase">
                  GENUS + DIFFERENTIA
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                <div className="p-2 bg-card border-2 border-border">
                  <span className="text-[10px] uppercase font-extrabold text-muted-foreground block">
                    1. PHÂN LOẠI (GENUS):
                  </span>
                  <span className="text-foreground font-extrabold">
                    {currentHintTier >= 2
                      ? `"It is a kind of ${circumTask.genus || circumTask.category || "object / concept"}..."`
                      : `"It is a kind of [nhóm / chủng loại]..."`}
                  </span>
                </div>
                <div className="p-2 bg-card border-2 border-border">
                  <span className="text-[10px] uppercase font-extrabold text-muted-foreground block">
                    2. ĐẶC TÍNH KHÁC BIỆT (DIFFERENTIA):
                  </span>
                  <span className="text-foreground font-extrabold">
                    {currentHintTier >= 1
                      ? `"...that people use to ${circumTask.differentia || circumTask.hints.functionHint || "perform a specific task"}."`
                      : `"...that people use to [công dụng / chức năng chính]."`}
                  </span>
                </div>
              </div>
            </div>
          ) : mode === "scenarios" && scenarioTask ? (
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
              <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Lightbulb className="size-3 stroke-[2.5]" />
                  <span>CHIẾN LƯỢC CỨU CÁNH:</span>
                </span>
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-accent text-accent-foreground border border-border uppercase">
                  {scenarioTask.recommendedSkill}
                </span>
              </div>
              <p className="text-xs font-mono text-foreground leading-relaxed font-bold">
                Giữ phong thái tự tin, xác nhận thông tin tức thì và yêu cầu đối phương lặp lại hoặc làm rõ mà không gây ngắt quãng buổi hội thoại.
              </p>
            </div>
          ) : null}

          {/* Model Answer Showcase (Gated behind T4) */}
          {modelAnswer &&
            (currentHintTier >= 4 ? (
              <div className="p-3 bg-accent/35 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
                <div className="flex items-center justify-between border-b border-border pb-1">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1">
                    <Quote className="size-3 text-primary" />
                    <span>
                      {mode === "circumlocution"
                        ? "DIỄN GIẢI MẪU CHUẨN (T4 UNLOCKED):"
                        : "CÂU CỨU CÁNH MẪU (T4 UNLOCKED):"}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(modelAnswer, "model-answer")}
                      className="size-6 p-0 bg-card border border-border shrink-0"
                      title="Sao chép câu mẫu"
                    >
                      {copiedId === "model-answer" ? (
                        <Check className="size-3 text-[#00A854]" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayAudio(modelAnswer)}
                      className="h-6 px-2 text-[10px] font-mono font-extrabold gap-1 bg-card border border-border hover:bg-primary hover:text-primary-foreground shrink-0"
                      title="Nghe phát âm chuẩn"
                    >
                      <Volume2 className="size-3" />
                      <span>NGHE</span>
                    </Button>
                  </div>
                </div>
                <p className="font-serif text-sm sm:text-base font-extrabold text-foreground leading-relaxed select-text cursor-text">
                  &ldquo;{modelAnswer}&rdquo;
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectHintTier(4)}
                className="w-full text-left p-2.5 bg-background hover:bg-accent hover:text-accent-foreground border-2 border-dashed border-border transition-all flex items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-foreground">
                  <Lock className="size-3.5 text-primary shrink-0" />
                  <span>Mở gợi ý T4 (hoặc bấm [H] 4 lần) để xem câu mẫu hoàn chỉnh</span>
                </div>
                <span className="px-2 py-0.5 bg-foreground text-accent border border-border text-[10px] font-mono font-extrabold shrink-0 uppercase">
                  MỞ T4
                </span>
              </button>
            ))}

          {/* Say It Better trio (Gated behind T4) */}
          {currentHintTier >= 4 && (circumTask?.sayItBetter || scenarioTask?.sayItBetter) && (
            <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
              <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-dashed border-border pb-1">
                <Layers className="size-3.5 text-primary" />
                <span>BỘ 3 CÁCH NÓI BẢN XỨ (SAY IT BETTER):</span>
              </div>
              <div className="grid gap-1.5 text-xs font-mono">
                {(
                  [
                    { k: "ĐỜI THƯỜNG", v: (circumTask?.sayItBetter || scenarioTask?.sayItBetter)?.casual },
                    { k: "CÔNG SỞ", v: (circumTask?.sayItBetter || scenarioTask?.sayItBetter)?.professional },
                    { k: "KHẨU NGỮ", v: (circumTask?.sayItBetter || scenarioTask?.sayItBetter)?.idiomatic },
                  ] as Array<{ k: string; v?: string }>
                )
                  .filter((x) => x.v)
                  .map((x) => (
                    <div
                      key={x.k}
                      className="flex items-start justify-between gap-2 p-2 bg-card border-2 border-border"
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold text-primary block uppercase">{x.k}:</span>
                        <span className="text-foreground text-xs font-bold leading-snug block">&ldquo;{x.v}&rdquo;</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(x.v || "", `sib-${x.k}`)}
                          className="text-muted-foreground hover:text-foreground p-1 bg-secondary border border-border cursor-pointer"
                          title="Sao chép"
                        >
                          {copiedId === `sib-${x.k}` ? (
                            <Check className="size-3 text-[#00A854]" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(x.v || "")}
                          className="text-muted-foreground hover:text-primary p-1 bg-secondary border border-border cursor-pointer"
                          title="Nghe mẫu"
                        >
                          <Volume2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 4-Tier Ladder */}
          <div className="bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-dashed border-border pb-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground">
                <Sparkles className="size-3.5 text-primary stroke-[2.5]" />
                <span>NẤC THANG HỖ TRỢ (T1 → T4):</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHintsExpanded(!isHintsExpanded)}
                className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{isHintsExpanded ? "[THU GỌN]" : "[MỞ RỘNG]"}</span>
                <ChevronDown
                  className={`size-3 transition-transform ${
                    isHintsExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {isHintsExpanded && (
              <div className="space-y-2 pt-0.5">
                {activeHints
                  .filter((h) => h.tier > 0)
                  .map((h) => {
                    const tierBadgeStyles = [
                      "bg-foreground text-background border-border", // T1: Deep Ink
                      "bg-primary text-primary-foreground border-border", // T2: Signal Orange
                      "bg-accent text-accent-foreground border-border", // T3: Volt Lime
                      "bg-[#00E676] text-[#0D0E0D] border-border", // T4: Emerald
                    ];
                    const badgeClass = tierBadgeStyles[h.tier - 1] || tierBadgeStyles[0];
                    const isUnlocked = h.tier <= currentHintTier;
                    const cleanText = cleanSurvivalPrefix(h.content);
                    const penaltyPct = Math.round(
                      (h.penaltyWeight ?? [0, 0.1, 0.25, 0.5, 0.85][h.tier] ?? 0) * 100
                    );

                    if (!isUnlocked) {
                      return (
                        <button
                          key={h.tier}
                          type="button"
                          onClick={() => onSelectHintTier(h.tier)}
                          className="w-full text-left p-2.5 border-2 border-dashed border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all flex items-center justify-between gap-2 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-extrabold border ${badgeClass}`}
                            >
                              T{h.tier}
                            </span>
                            <span className="font-mono font-bold text-xs text-foreground">
                              {h.title}
                            </span>
                            <span className="text-[9px] font-mono font-extrabold text-muted-foreground">
                              -{penaltyPct}%
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-extrabold text-muted-foreground group-hover:text-accent-foreground flex items-center gap-1 uppercase">
                            <Lock className="size-3" />
                            <span>BẤM ĐỂ MỞ T{h.tier}</span>
                          </span>
                        </button>
                      );
                    }

                    return (
                      <div
                        key={h.tier}
                        onClick={() => onSelectHintTier(h.tier)}
                        className="p-2.5 bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-extrabold border ${badgeClass}`}
                            >
                              T{h.tier}
                            </span>
                            <span className="font-mono font-extrabold uppercase text-xs text-foreground">
                              {h.title}
                            </span>
                            <span className="text-[9px] font-mono font-extrabold text-muted-foreground">
                              -{penaltyPct}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleCopy(cleanText, `hint-${h.tier}`)}
                              className="text-muted-foreground hover:text-foreground p-1 bg-secondary border border-border cursor-pointer transition-colors"
                              title="Sao chép nội dung gợi ý"
                            >
                              {copiedId === `hint-${h.tier}` ? (
                                <Check className="size-3 text-[#00A854]" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePlayAudio(cleanText)}
                              className="text-muted-foreground hover:text-primary p-1 bg-secondary border border-border cursor-pointer transition-colors"
                              title="Nghe âm thanh"
                            >
                              <Volume2 className="size-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-foreground font-mono font-bold leading-relaxed pl-0.5 select-text cursor-text">
                          {cleanText}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 font-mono font-extrabold uppercase">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>BẤM PHÍM [H] ĐỂ MỞ TỪNG NẤC GỢI Ý</span>
          </span>
          <span className="px-1.5 py-0.5 bg-secondary text-foreground border border-border">
            TIER T{currentHintTier}/4
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
