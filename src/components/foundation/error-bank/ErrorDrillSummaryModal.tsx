"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Timer,
  Brain,
  Sparkles,
} from "lucide-react";
import { soundEffects } from "@/lib/audio/audio-chimes";
import type { DrillSessionSummary } from "@/types/error-bank";

interface ErrorDrillSummaryModalProps {
  isOpen: boolean;
  summary: DrillSessionSummary | null;
  onDrillAgain: () => void;
  onBackToOverview: () => void;
}

function triggerConfetti() {
  try {
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];
    const confettiEl = document.createElement("div");
    confettiEl.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden`;
    document.body.appendChild(confettiEl);
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement("div");
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 6;
      piece.style.cssText = `
        position:absolute;width:${size}px;height:${size}px;background:${color};
        border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
        left:${Math.random() * 100}%;top:-${size}px;
        animation:confettiFall ${1.5 + Math.random() * 2}s linear ${Math.random() * 0.8}s forwards;
        opacity:0.9;
      `;
      confettiEl.appendChild(piece);
    }
    const style = document.createElement("style");
    style.textContent = `@keyframes confettiFall { to { transform: translateY(100vh) rotate(${Math.random() > 0.5 ? "" : "-"}${Math.random() * 540}deg); opacity:0; } }`;
    document.head.appendChild(style);
    setTimeout(() => {
      confettiEl.remove();
      style.remove();
    }, 4000);
  } catch { }
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}p ${sec}s` : `${sec}s`;
}

export function ErrorDrillSummaryModal({
  isOpen,
  summary,
  onDrillAgain,
  onBackToOverview,
}: ErrorDrillSummaryModalProps) {
  useEffect(() => {
    if (isOpen && summary) {
      if (summary.correctionRate >= 70) {
        setTimeout(() => {
          try { soundEffects.playSuccessFanfare?.(); } catch { }
          triggerConfetti();
        }, 300);
      } else {
        setTimeout(() => {
          try { soundEffects.playAIReady?.(); } catch { }
        }, 300);
      }
    }
  }, [isOpen, summary]);

  if (!summary) return null;

  const isExcellent = summary.correctionRate >= 80;
  const isGood = summary.correctionRate >= 60 && summary.correctionRate < 80;

  const performanceBadge = isExcellent
    ? { label: "Xuất sắc 🏆", color: "bg-emerald-500 text-white" }
    : isGood
      ? { label: "Khá tốt 👍", color: "bg-amber-500 text-white" }
      : { label: "Cần luyện thêm 💪", color: "bg-rose-500 text-white" };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onBackToOverview(); }}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 bg-card border border-border/80 shadow-2xl overflow-hidden">
        <DialogTitle className="sr-only">Tổng kết buổi Drill lỗi</DialogTitle>

        {/* Header */}
        <div className={`p-6 pb-4 space-y-3 ${isExcellent
            ? "bg-gradient-to-br from-emerald-500/15 via-card to-card"
            : isGood
              ? "bg-gradient-to-br from-amber-500/15 via-card to-card"
              : "bg-gradient-to-br from-rose-500/10 via-card to-card"
          }`}>
          <div className="flex items-center justify-between">
            <div className={`size-14 rounded-2xl flex items-center justify-center shadow-xs ${isExcellent ? "bg-emerald-500/20" : isGood ? "bg-amber-500/20" : "bg-rose-500/20"
              }`}>
              <Trophy className={`size-7 ${isExcellent ? "text-emerald-500" : isGood ? "text-amber-500" : "text-rose-500"
                }`} />
            </div>
            <Badge className={`${performanceBadge.color} text-sm font-bold px-4 py-1.5 rounded-full`}>
              {performanceBadge.label}
            </Badge>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Kết quả Drill Lỗi Cá nhân</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bạn đã drill {summary.totalDrilled} lỗi từ SB · VN→EN · Survival trong {formatDuration(summary.durationMs)}
              {summary.firstAttemptAccuracy !== undefined && (
                <> · Đúng lần đầu {summary.firstAttemptAccuracy}% · Tự lập {summary.averageIndependence ?? 100}%</>
              )}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-6 py-3 grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/50 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Đã sửa được
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold font-mono text-emerald-600">{summary.totalCorrected}</span>
              <span className="text-sm text-muted-foreground font-mono">/ {summary.totalDrilled} lỗi</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/50 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              <TrendingUp className="size-3.5 text-primary" />
              Tỉ lệ sửa đúng
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold font-mono ${summary.correctionRate >= 70 ? "text-emerald-600" : summary.correctionRate >= 50 ? "text-amber-600" : "text-rose-600"
                }`}>
                {summary.correctionRate}%
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/50 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              <Brain className="size-3.5 text-indigo-500" />
              Điểm trung bình
            </div>
            <span className="text-3xl font-bold font-mono text-indigo-600">{summary.averageScore}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/50 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              <Timer className="size-3.5 text-amber-500" />
              Độ trễ TB
            </div>
            <span className="text-3xl font-bold font-mono text-amber-600">
              {(summary.averageLatencyMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Mastery + weakness (SB/VN-EN/Survival aligned) */}
        {(summary.masteryDelta !== undefined || summary.topWeaknessIdentified) && (
          <div className="px-6 py-1 space-y-2">
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Mastery tăng</span>
              <span className="font-mono font-bold text-primary">+{summary.masteryDelta ?? 2}</span>
            </div>
            {summary.topWeaknessIdentified && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  Tiêu điểm: {summary.topWeaknessIdentified}
                </span>
                {summary.recommendedNextAction && (
                  <p className="text-muted-foreground text-[11px] pt-0.5">{summary.recommendedNextAction}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Top improved & Still needs work */}
        {(summary.topImproved.length > 0 || summary.stillNeedsWork.length > 0) && (
          <div className="px-6 py-2 space-y-3">
            {summary.topImproved.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Đã tiến bộ
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {summary.topImproved.map((r) => (
                    <Badge key={r.id} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[11px]">
                      ✓ {r.labelVi.slice(0, 24)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {summary.stillNeedsWork.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="size-3.5" />
                  Cần luyện thêm
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {summary.stillNeedsWork.map((r) => (
                    <Badge key={r.id} variant="outline" className="border-rose-500/30 text-rose-600 text-[11px]">
                      ✗ {r.labelVi.slice(0, 24)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-6 py-4 flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToOverview}
            className="flex-1 rounded-2xl h-10 font-bold text-xs gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            Về tổng quan
          </Button>
          <Button
            size="sm"
            onClick={onDrillAgain}
            className="flex-1 rounded-2xl h-10 font-bold text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
          >
            <RotateCcw className="size-3.5" />
            Drill tiếp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
