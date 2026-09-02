"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Sparkles,
  Zap,
  Target,
  Clock,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Layers,
} from "lucide-react";
import type { SentenceBuilderSessionSummary, SentenceBuilderSkillMastery } from "@/types/sentence-builder";
import { triggerConfetti } from "@/components/ui/confetti";
import { soundEffects } from "@/lib/audio/audio-chimes";

interface SessionSummaryModalProps {
  isOpen: boolean;
  summary: SentenceBuilderSessionSummary | null;
  skillMastery: SentenceBuilderSkillMastery;
  onRestart: () => void;
}

export function SessionSummaryModal({
  isOpen,
  summary,
  skillMastery,
  onRestart,
}: SessionSummaryModalProps) {
  useEffect(() => {
    if (isOpen && summary) {
      soundEffects.playSuccessFanfare();
      triggerConfetti();
    }
  }, [isOpen, summary]);

  if (!summary) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 md:p-8 bg-card border border-border/80 shadow-2xl space-y-6">
        {/* Header with Trophy Icon */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="size-16 rounded-3xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 animate-bounce">
            <Trophy className="size-8" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Hoàn thành phiên luyện tạo câu! 🎉
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground max-w-sm">
            Bạn đã hoàn thành {summary.completedTasks} câu với phương pháp phản xạ khẩu ngữ có kiểm soát.
          </DialogDescription>
        </div>

        {/* 4 Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Đúng lần đầu</span>
            <span className="font-mono text-base font-bold text-emerald-500">
              {summary.firstAttemptAccuracy}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Độ trễ trung bình</span>
            <span className="font-mono text-base font-bold text-indigo-500">
              {(summary.averageResponseLatencyMs / 1000).toFixed(1)}s
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Tính tự lập</span>
            <span className="font-mono text-base font-bold text-amber-500">
              {summary.averageIndependence}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-1">
            <span className="text-[10px] text-primary font-semibold block">Mastery tăng</span>
            <span className="font-mono text-base font-bold text-primary">
              +{summary.masteryDelta}
            </span>
          </div>
        </div>

        {/* 5-D Skill Progression Radar */}
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-primary" />
              Chỉ số kỹ năng khẩu ngữ tích luỹ:
            </span>
            <span className="font-mono text-muted-foreground font-semibold">
              Tổng: {skillMastery.overallMastery}/100
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <SkillRow label="Ngữ pháp khẩu ngữ (Grammar)" value={skillMastery.grammar} />
            <SkillRow label="Khôi phục từ vựng (Vocab Retrieval)" value={skillMastery.vocabularyRetrieval} />
            <SkillRow label="Cấu trúc câu (Sentence Construction)" value={skillMastery.sentenceConstruction} />
            <SkillRow label="Độ trôi chảy (Fluency)" value={skillMastery.fluency} />
            <SkillRow label="Tính tự lập (Independence)" value={skillMastery.independence} />
          </div>
        </div>

        {/* Top Weakness & Next Recommendation */}
        {summary.topWeaknessIdentified && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-3.5" />
              <span>Tiêu điểm cần chú ý: {summary.topWeaknessIdentified}</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              {summary.recommendedNextAction || "Luyện thêm 5 phút bài tập phản xạ để củng cố."}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="lg"
            onClick={onRestart}
            className="w-full sm:w-1/2 h-11 rounded-2xl font-semibold gap-2 border-border/80"
          >
            <RotateCcw className="size-4" />
            <span>Luyện tiếp</span>
          </Button>

          <Link href="/foundation" className="w-full sm:w-1/2">
            <Button
              size="lg"
              className="w-full h-11 rounded-2xl font-bold gap-2 shadow-md shadow-primary/20"
            >
              <span>Về Foundation Hub</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SkillRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold text-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-1.5 rounded-full" />
    </div>
  );
}
