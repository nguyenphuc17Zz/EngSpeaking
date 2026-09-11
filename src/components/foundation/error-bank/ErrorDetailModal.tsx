"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import {
  RotateCcw,
  Flag,
  ArrowRight,
  Target,
  Volume2,
  Brain,
  Timer,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { MasterErrorRecord } from "@/types/error-bank";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface ErrorDetailModalProps {
  record: MasterErrorRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onFlagFalsePositive: (recordId: string) => void;
}

export function ErrorDetailModal({
  record,
  isOpen,
  onClose,
  onFlagFalsePositive,
}: ErrorDetailModalProps) {
  const tts = useBrowserTTS();
  if (!record) return null;

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };

  const handleFlag = () => {
    onFlagFalsePositive(record.id);
    toast.success("Đã gắn cờ nhận diện sai", "Hệ thống sẽ hạ điểm ưu tiên và không tính lỗi này vào thống kê.");
  };

  const getGapTypeBadge = (gap: MasterErrorRecord["gapType"]) => {
    switch (gap) {
      case "retrieval_gap":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs">⚡ Retrieval Gap (Truy xuất chậm)</Badge>;
      case "production_gap":
        return <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs">⚠️ Production Gap (Áp lực tạo câu)</Badge>;
      case "pronunciation_gap":
        return <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs">🎧 Pronunciation Gap (Phát âm)</Badge>;
      default:
        return <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs">📚 Knowledge Gap (Kiến thức)</Badge>;
    }
  };

  const pMastery = Math.round((record.pMastery ?? 0.3) * 100);
  const currentR = record.retrievability ?? 90;
  const fossilScore = record.fossilizationScore ?? 45;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 md:p-8 bg-card border border-border/80 shadow-2xl space-y-6">
        {/* Header */}
        <div className="space-y-2 border-b border-border/40 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-mono uppercase">
                {record.category}
              </Badge>
              {getGapTypeBadge(record.gapType)}
            </div>

            <Badge variant="outline" className="text-[11px] font-mono">
              Độ nghiêm trọng: <span className="font-bold capitalize ml-1">{record.severity}</span>
            </Badge>
          </div>

          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {record.labelVi}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {record.descriptionVi}
          </DialogDescription>
        </div>

        {/* Math Engine Insights Cards */}
        <div className="grid sm:grid-cols-3 gap-3">
          {/* 1. BKT Mastery */}
          <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-primary">
              <span className="flex items-center gap-1.5">
                <Brain className="size-3.5" /> BKT Mastery
              </span>
              <span>{pMastery}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {pMastery >= 75
                ? "Bạn đã làm chủ quy tắc vững vàng. Vấp lỗi chủ yếu do tốc độ nói."
                : "Đang củng cố nền tảng nhận thức cho quy tắc này."}
            </p>
          </div>

          {/* 2. FSRS Spaced Memory */}
          <div className="p-3.5 rounded-2xl bg-violet-500/5 border border-violet-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
              <span className="flex items-center gap-1.5">
                <Timer className="size-3.5" /> FSRS Trí nhớ
              </span>
              <span>{currentR}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Độ bền S: {record.fsrsStability?.toFixed(1) || "1.0"} ngày. {currentR < 90 ? "Đến hạn ôn tập!" : "Ký ức còn tươi mới."}
            </p>
          </div>

          {/* 3. Fossilization Risk */}
          <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
              <span className="flex items-center gap-1.5">
                <Flame className="size-3.5" /> Hóa đá L1
              </span>
              <span>{fossilScore}%</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {fossilScore >= 65
                ? "Thói quen mẹ đẻ ăn sâu, cần phản xạ tốc độ để bẻ gãy."
                : "Thói quen đang được điều chỉnh tích cực."}
            </p>
          </div>
        </div>

        {/* 4 Quantitative Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Tần suất gặp</span>
            <span className="font-mono text-base font-bold text-foreground">{record.frequency} lần</span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Tỉ lệ sửa đúng</span>
            <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
              {record.recoveryRate}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Tự sửa lỗi (Self-fix)</span>
            <span className="font-mono text-base font-bold text-amber-500">
              {record.selfCorrectionCount} lần
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground font-semibold block">Độ trễ trung bình</span>
            <span className="font-mono text-base font-bold text-primary">
              {(record.averageLatencyMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Representative Error Occurrences */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Target className="size-3.5 text-primary" />
            <span>Lịch sử các lần nói thực tế:</span>
          </span>

          <div className="space-y-2">
            {record.examples.map((ex, i) => (
              <div
                key={ex.id || i}
                className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="font-mono">Nguồn: {ex.sourceModule}</span>
                  <span>{new Date(ex.timestamp).toLocaleDateString("vi-VN")}</span>
                </div>

                <div className="flex items-center justify-between font-mono">
                  <div className="flex items-baseline gap-2 flex-1">
                    <span className="line-through text-red-500 font-semibold">&ldquo;{ex.userText}&rdquo;</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">&ldquo;{ex.correction}&rdquo;</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayAudio(ex.correction)}
                    className="size-6 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-md shrink-0"
                    title="Nghe câu sửa chuẩn"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFlag}
            className="text-xs text-muted-foreground hover:text-red-500 gap-1.5"
          >
            <Flag className="size-3.5" />
            <span>Báo nhận diện sai (STT Error)</span>
          </Button>

          <Link href={`/foundation/retry-lab?recordId=${record.id}`} className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto h-11 px-6 rounded-2xl font-bold gap-2 btn-spring shadow-md shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <RotateCcw className="size-4" />
              <span>Vào Studio sửa câu này ngay</span>
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
