"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, ArrowRight, AlertTriangle, TrendingUp } from "lucide-react";
import type { AdvancedSessionSummary } from "@/types/advanced";
import { TRACK_META } from "@/lib/advanced/track-map";
import { triggerConfetti } from "@/components/ui/confetti";
import { soundEffects } from "@/lib/audio/audio-chimes";

interface AdvSummaryModalProps {
  isOpen: boolean;
  summary: AdvancedSessionSummary | null;
  onRestart: () => void;
}

export function AdvSummaryModal({ isOpen, summary, onRestart }: AdvSummaryModalProps) {
  useEffect(() => {
    if (isOpen && summary) {
      soundEffects.playSuccessFanfare();
      triggerConfetti();
    }
  }, [isOpen, summary]);

  if (!summary) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border border-border/80 shadow-2xl space-y-5">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="size-14 rounded-3xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center shadow-lg animate-bounce">
            <Trophy className="size-7" />
          </div>
          <DialogTitle className="text-xl font-bold">Hoàn thành {TRACK_META[summary.track].labelVi} · {summary.level} 🎉</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {summary.completedTasks} thử thách · Toulmin TB {summary.averageToulminScore}% · Trễ TB {(summary.averageResponseLatencyMs / 1000).toFixed(1)}s
          </DialogDescription>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "Đúng lần đầu", value: `${summary.firstAttemptAccuracy}%`, color: "text-emerald-500" },
            { label: "Tự lập", value: `${summary.independentSuccessRate}%`, color: "text-amber-500" },
            { label: "Điểm TB", value: `${summary.averageOverallScore}`, color: "text-indigo-500" },
            { label: "Mastery +", value: `+${summary.masteryDelta}`, color: "text-primary" },
          ].map((m) => (
            <div key={m.label} className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold block">{m.label}</span>
              <span className={`font-mono text-base font-bold ${m.color}`}>{m.value}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-2 text-xs">
          <span className="font-bold flex items-center gap-1.5"><TrendingUp className="size-3.5 text-primary" /> Gợi ý tiếp theo:</span>
          <p className="text-muted-foreground">{summary.recommendedNextAction}</p>
          {summary.topWeaknessIdentified && (
            <p className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="size-3.5" /> Tiêu điểm: {summary.topWeaknessIdentified}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" size="lg" onClick={onRestart} className="flex-1 h-11 rounded-2xl gap-2 cursor-pointer">
            <RotateCcw className="size-4" /><span>Luyện tiếp</span>
          </Button>
          <Link href="/advanced" className="flex-1">
            <Button size="lg" className="w-full h-11 rounded-2xl gap-2 cursor-pointer"><span>Đổi track/level</span><ArrowRight className="size-4" /></Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
