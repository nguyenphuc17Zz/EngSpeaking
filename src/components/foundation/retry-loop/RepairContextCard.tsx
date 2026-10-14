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
  RotateCcw,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Layers,
  ChevronDown,
  Quote,
  ShieldCheck,
  ArrowRight,
  Lock,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type { RetrySession, TargetedCorrection } from "@/types/retry-loop";

interface RepairContextCardProps {
  session: RetrySession;
  currentHintTier: number;
  onSelectHintTier: (tier: number) => void;
}

export function RepairContextCard({
  session,
  currentHintTier,
  onSelectHintTier,
}: RepairContextCardProps) {
  const tts = useBrowserTTS();
  const [isHintsExpanded, setIsHintsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const correction = session.targetCorrection;

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

  // Build the 4-tier hints
  const hints =
    correction.hints && correction.hints.length > 0
      ? correction.hints
      : [
          { tier: 0, title: "Không gợi ý", content: "Tự phát hiện và sửa lại ngay." },
          {
            tier: 1,
            title: "Chỉ điểm lỗi tối thiểu",
            content: `Lỗi: "${correction.userErroneousText}" ➔ Cần sửa thành: "${correction.minimalCorrection}".`,
          },
          {
            tier: 2,
            title: "Gợi ý cấu trúc & nguyên tắc",
            content: correction.explanationVi || "Sửa lỗi để câu nói tự nhiên và chuẩn xác hơn.",
          },
          {
            tier: 3,
            title: "Khung câu điền khuyết",
            content:
              correction.skeletonHint ||
              correction.betterSentence.replace(correction.minimalCorrection, "______"),
          },
          {
            tier: 4,
            title: "Câu mẫu chuẩn hoàn chỉnh",
            content: correction.betterSentence,
          },
        ];

  return (
    <Card className="rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Header: Title + Tier Jump Selectors (JapSpeak BuilderContextCard Style) */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-border pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2.5 bg-accent border border-border shrink-0" />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground truncate">
              2. KHUNG SỬA LỖI &amp; THANG GỢI Ý
            </span>
          </div>

          <div className="flex items-center gap-0.5 bg-secondary p-0.5 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] shrink-0">
            {[0, 1, 2, 3, 4].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSelectHintTier(t)}
                className={`text-[10px] font-mono px-2 py-0.5 font-extrabold transition-all cursor-pointer ${
                  currentHintTier === t
                    ? "bg-primary text-primary-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
                title={`Nấc gợi ý T${t} (Bấm phím H để tăng nấc)`}
              >
                T{t}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Middle Container */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3">
          {/* Repair Differential Focus Box */}
          <div className="p-3 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-2">
            <div className="flex items-center justify-between border-b border-dashed border-border pb-1">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary flex items-center gap-1">
                <RotateCcw className="size-3 stroke-[2.5]" />
                <span>TRỌNG TÂM SỬA LỖI: {correction.whatToFix}</span>
              </span>
              <Badge
                variant="outline"
                className="text-[9px] border border-border bg-secondary text-foreground font-mono font-extrabold uppercase"
              >
                {correction.errorType} • P{correction.priority}
              </Badge>
            </div>

            {/* Before vs After comparison pill */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-0.5">
                <span className="text-[10px] font-mono uppercase font-extrabold text-destructive flex items-center gap-1">
                  <XCircle className="size-3" />
                  <span>CỤM TỪ LỖI:</span>
                </span>
                <span className="text-foreground font-mono font-extrabold line-through decoration-destructive">
                  &ldquo;{correction.userErroneousText}&rdquo;
                </span>
              </div>

              {currentHintTier >= 1 ? (
                <div className="p-2 bg-card border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-0.5">
                  <span className="text-[10px] font-mono uppercase font-extrabold text-[#00A854] flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    <span>SỬA TỐI THIỂU THÀNH:</span>
                  </span>
                  <span className="text-[#00A854] font-mono font-extrabold">
                    &ldquo;{correction.minimalCorrection}&rdquo;
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectHintTier(1)}
                  className="p-2 bg-card hover:bg-accent border-2 border-dashed border-border text-left space-y-0.5 cursor-pointer transition-colors"
                >
                  <span className="text-[10px] font-mono uppercase font-extrabold text-primary flex items-center gap-1">
                    <Lock className="size-2.5" />
                    <span>SỬA TỐI THIỂU THÀNH:</span>
                  </span>
                  <span className="text-muted-foreground font-mono font-bold text-[11px] block">
                    Bấm mở T1 để xem cụm từ đúng
                  </span>
                </button>
              )}
            </div>

            {/* Explanation (revealed from T2+) */}
            {correction.explanationVi && currentHintTier >= 2 && (
              <p className="text-xs font-mono text-foreground font-bold leading-relaxed pt-1 border-t border-dashed border-border">
                💡 <span className="text-primary uppercase">QUY TẮC:</span> {correction.explanationVi}
              </p>
            )}
          </div>

          {/* Model Answer Showcase (Gated behind T4) */}
          {currentHintTier >= 4 ? (
            <div className="p-3 bg-accent/35 border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] space-y-1.5">
              <div className="flex items-center justify-between border-b border-border pb-1">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground flex items-center gap-1">
                  <Quote className="size-3 text-primary" />
                  <span>CÂU CHUẨN BẢN XỨ (T4 UNLOCKED):</span>
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(correction.betterSentence, "model-answer")}
                    className="size-6 p-0 bg-card border border-border"
                    title="Sao chép câu mẫu chuẩn"
                  >
                    {copiedId === "model-answer" ? (
                      <Check className="size-3 text-[#00A854]" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayAudio(correction.betterSentence)}
                    className="h-6 px-2 text-[10px] font-mono font-extrabold gap-1 bg-card border border-border hover:bg-primary hover:text-primary-foreground"
                    title="Nghe phát âm chuẩn"
                  >
                    <Volume2 className="size-3" />
                    <span>NGHE CÂU</span>
                  </Button>
                </div>
              </div>
              <p className="font-serif text-sm sm:text-base font-extrabold text-foreground leading-relaxed select-text cursor-text">
                &ldquo;{correction.betterSentence}&rdquo;
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
          )}

          {/* 4-Tier Ladder (JapSpeak Color-Coded Badges) */}
          <div className="bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] p-3 space-y-2">
            <div className="flex items-center justify-between border-b border-dashed border-border pb-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground">
                <Sparkles className="size-3.5 text-primary stroke-[2.5]" />
                <span>GỢI Ý NẤC THANG (T1 → T4):</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHintsExpanded(!isHintsExpanded)}
                className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{isHintsExpanded ? "[THU GỌN]" : "[MỞ RỘNG]"}</span>
                <ChevronDown
                  className={`size-3 transition-transform duration-200 ${
                    isHintsExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {isHintsExpanded && (
              <div className="space-y-2 pt-0.5 animate-in fade-in-0 duration-150">
                {hints
                  .filter((h) => h.tier >= 1 && h.tier <= 4)
                  .map((h) => {
                    const tierBadgeStyles = [
                      "bg-foreground text-background border-border", // T1: Deep Ink
                      "bg-primary text-primary-foreground border-border", // T2: Signal Orange
                      "bg-accent text-accent-foreground border-border", // T3: Volt Lime
                      "bg-[#00E676] text-[#0D0E0D] border-border", // T4: Emerald
                    ];
                    const badgeClass = tierBadgeStyles[h.tier - 1] || tierBadgeStyles[0];
                    const isUnlocked = h.tier <= currentHintTier;
                    const tierAudioText =
                      h.tier === 4
                        ? correction.betterSentence
                        : !h.content.includes("______") && !h.content.includes("➔")
                        ? h.content
                        : correction.minimalCorrection;

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
                            <span className="text-xs font-mono font-bold text-foreground">
                              {h.title}
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
                            <span className="text-xs font-mono font-extrabold uppercase text-foreground">
                              {h.title}
                            </span>
                          </div>

                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleCopy(h.content, `hint-${h.tier}`)}
                              className="text-muted-foreground hover:text-foreground p-1 bg-secondary border border-border cursor-pointer transition-colors"
                              title="Sao chép nội dung gợi ý"
                            >
                              {copiedId === `hint-${h.tier}` ? (
                                <Check className="size-3 text-[#00A854]" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlayAudio(tierAudioText)}
                              className="h-6 px-2 text-[9px] font-mono font-extrabold gap-1 border border-border bg-secondary hover:bg-accent shrink-0 cursor-pointer"
                              title="Nghe âm thanh"
                            >
                              <Volume2 className="size-2.5" />
                              <span>NGHE</span>
                            </Button>
                          </div>
                        </div>

                        <p className="font-mono text-xs font-bold text-foreground pl-0.5 leading-relaxed select-text cursor-text">
                          {h.content}
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
