"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Eye,
  Volume2,
  Brain,
  Timer,
  Flame,
  Target,
  Mic,
  Layers,
} from "lucide-react";
import type { MasterErrorRecord } from "@/types/error-bank";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface ErrorCardProps {
  record: MasterErrorRecord;
  onOpenDetail: (record: MasterErrorRecord) => void;
  onDrillNow: (record: MasterErrorRecord) => void;
}

const SOURCE_MODULE_BADGE: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sentence_builder: {
    label: "SB",
    icon: <Layers className="size-2.5" />,
    color: "bg-primary/10 text-primary border-primary/30",
  },
  vn_to_en: {
    label: "VN→EN",
    icon: <Mic className="size-2.5" />,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  survival: {
    label: "Survival",
    icon: <Target className="size-2.5" />,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  retry_lab: {
    label: "Repair",
    icon: <RotateCcw className="size-2.5" />,
    color: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  },
  latency: {
    label: "Latency",
    icon: <Timer className="size-2.5" />,
    color: "bg-violet-500/10 text-violet-600 border-violet-500/30",
  },
  shadowing: {
    label: "Shadow",
    icon: <Mic className="size-2.5" />,
    color: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  },
  conversation: {
    label: "Convo",
    icon: <Mic className="size-2.5" />,
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  },
};

export function ErrorCard({ record, onOpenDetail, onDrillNow }: ErrorCardProps) {
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };
  const latestExample = record.examples[record.examples.length - 1];
  const sourceModule = latestExample?.sourceModule || "sentence_builder";
  const sourceBadgeMeta = SOURCE_MODULE_BADGE[sourceModule] || SOURCE_MODULE_BADGE["sentence_builder"];

  const getTrendBadge = (trend: MasterErrorRecord["trend"]) => {
    switch (trend) {
      case "improving":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] gap-1 font-mono">
            <TrendingUp className="size-3" />
            <span>Đang tiến bộ</span>
          </Badge>
        );
      case "worsening":
        return (
          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px] gap-1 font-mono">
            <TrendingDown className="size-3" />
            <span>Cần chú ý</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] font-mono">
            <span>Ổn định</span>
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: MasterErrorRecord["status"]) => {
    switch (status) {
      case "persistent":
        return <Badge variant="destructive" className="text-[10px]">Tái phát nhiều lần</Badge>;
      case "recovering":
        return <Badge className="bg-amber-500 text-white text-[10px]">Đang phục hồi</Badge>;
      case "mastered":
        return <Badge className="bg-emerald-600 text-white text-[10px]">Đã làm chủ</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>;
    }
  };

  const getFossilizationBadge = () => {
    const level = record.fossilizationLevel || (record.fossilizationScore >= 65 ? "fossilized" : record.fossilizationScore >= 35 ? "habitual" : "emerging");
    const score = record.fossilizationScore ?? (level === "fossilized" ? 72 : level === "habitual" ? 48 : 22);

    if (level === "fossilized") {
      return (
        <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] gap-1 font-mono">
          <Flame className="size-3" />
          <span>Hóa đá: {score}%</span>
        </Badge>
      );
    }
    if (level === "habitual") {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] gap-1 font-mono">
          <span>Thói quen: {score}%</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground text-[10px] font-mono">
        <span>Mới chớm: {score}%</span>
      </Badge>
    );
  };

  const currentR = record.retrievability ?? 90;
  const pMastery = Math.round((record.pMastery ?? 0.3) * 100);
  const isDrillable = record.status !== "mastered";

  return (
    <Card className="rounded-3xl border border-border/80 bg-card hover:border-primary/50 transition-all p-5 space-y-4 shadow-xs flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top Badges row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Source module badge */}
            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${sourceBadgeMeta.color}`}>
              {sourceBadgeMeta.icon}
              {sourceBadgeMeta.label}
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {record.category}
            </Badge>
            {getStatusBadge(record.status)}
            {getFossilizationBadge()}
          </div>
          {getTrendBadge(record.trend)}
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground leading-snug">
            {record.labelVi}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {record.descriptionVi}
          </p>
        </div>

        {/* Representative Example */}
        {latestExample && (
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1.5 flex-1 overflow-hidden text-ellipsis">
                <span className="line-through text-red-500 font-semibold">&ldquo;{latestExample.userText}&rdquo;</span>
                <span className="text-muted-foreground text-[11px]">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">&ldquo;{latestExample.correction}&rdquo;</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePlayAudio(latestExample.correction)}
                className="size-6 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-md shrink-0"
                title="Nghe phát âm chuẩn"
              >
                <Volume2 className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* FSRS Retrievability Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <Timer className="size-3 text-violet-500" />
              Trí nhớ FSRS
            </span>
            <span className={`font-bold ${
              currentR < 80 ? "text-rose-600" : currentR < 90 ? "text-amber-600" : "text-emerald-600"
            }`}>
              {Math.round(currentR)}%
            </span>
          </div>
          <Progress
            value={currentR}
            className={`h-1.5 rounded-full ${
              currentR < 80 ? "[&>div]:bg-rose-500" : currentR < 90 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
            }`}
          />
        </div>

        {/* Algorithm Telemetry */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between text-[11px] font-mono">
            <span className="text-muted-foreground flex items-center gap-1">
              <Brain className="size-3 text-primary" /> BKT:
            </span>
            <span className="font-bold text-foreground">{pMastery}%</span>
          </div>
          <div className="p-2 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between text-[11px] font-mono">
            <span className="text-muted-foreground">Tần suất:</span>
            <span className="font-bold text-foreground">{record.frequency}×</span>
          </div>
        </div>
      </div>

      {/* Bottom Metrics & Actions */}
      <div className="pt-3 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>Khôi phục: <span className="font-bold text-foreground">{record.recoveryRate}%</span></span>
          <span>Trễ TB: <span className="font-bold text-foreground">{(record.averageLatencyMs / 1000).toFixed(1)}s</span></span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenDetail(record)}
            className="rounded-xl text-xs font-semibold h-9 gap-1 border-border/80 px-3"
          >
            <Eye className="size-3.5" />
            <span>Chi tiết</span>
          </Button>

          {isDrillable ? (
            <Button
              size="sm"
              onClick={() => onDrillNow(record)}
              className="flex-1 rounded-xl text-xs font-bold h-9 gap-1.5 btn-spring shadow-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Target className="size-3.5" />
              <span>Drill ngay</span>
            </Button>
          ) : (
            <Badge className="flex-1 justify-center h-9 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 text-xs font-bold">
              ✓ Đã làm chủ
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
