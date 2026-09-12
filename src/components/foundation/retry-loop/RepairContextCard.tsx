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
    <Card className="rounded-3xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-4 flex flex-col h-full space-y-3 overflow-hidden">
        {/* Header: Title + Tier Jump Selectors */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <ShieldCheck className="size-4 text-amber-500" />
            <span>Khung Sửa Lỗi & Thang Gợi Ý</span>
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
          {/* Repair Differential Focus Box */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <RotateCcw className="size-3" />
                <span>Trọng tâm sửa lỗi: {correction.whatToFix}</span>
              </span>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400 font-mono capitalize">
                {correction.errorType} • P{correction.priority}
              </Badge>
            </div>

            {/* Before vs After comparison pill */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                  <XCircle className="size-3" />
                  <span>Cụm từ lỗi:</span>
                </span>
                <span className="text-foreground font-mono font-bold line-through decoration-red-500/70">
                  "{correction.userErroneousText}"
                </span>
              </div>

              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  <span>Sửa tối thiểu thành:</span>
                </span>
                <span className="text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                  "{correction.minimalCorrection}"
                </span>
              </div>
            </div>

            {/* Explanation */}
            {correction.explanationVi && (
              <p className="text-xs text-foreground/90 font-medium leading-relaxed pt-0.5">
                💡 <span className="font-semibold">Quy tắc:</span> {correction.explanationVi}
              </p>
            )}
          </div>

          {/* Model Answer Showcase */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Quote className="size-3 text-amber-500" />
                <span>Câu chuẩn bản xứ (Model Sentence):</span>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(correction.betterSentence, "model-answer")}
                  className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                  title="Sao chép câu mẫu chuẩn"
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
                  onClick={() => handlePlayAudio(correction.betterSentence)}
                  className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-primary"
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 className="size-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed select-text cursor-text">
              "{correction.betterSentence}"
            </p>
          </div>

          {/* 4-Tier Ladder */}
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Nấc thang gợi ý sửa lỗi (T1 - T4):</span>
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
                {hints
                  .filter((h) => h.tier > 0)
                  .map((h) => {
                    const isSelected = currentHintTier === h.tier;
                    const tierAudioText =
                      h.tier === 4
                        ? correction.betterSentence
                        : !h.content.includes("______") && !h.content.includes("➔")
                        ? h.content
                        : correction.betterSentence;

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
                                isSelected
                                  ? "text-amber-700 dark:text-amber-400 font-bold"
                                  : "text-foreground"
                              }`}
                            >
                              {h.title}
                            </span>
                          </div>

                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleCopy(h.content, `hint-${h.tier}`)}
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
                              onClick={() => handlePlayAudio(tierAudioText)}
                              className="text-muted-foreground hover:text-primary p-1 rounded-sm transition-colors"
                              title="Nghe âm thanh"
                            >
                              <Volume2 className="size-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground font-mono leading-relaxed pl-6 select-text cursor-text">
                          {h.content}
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
