"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  AlertCircle,
  HelpCircle,
  Eye,
  Volume2,
} from "lucide-react";
import type { MasterErrorRecord } from "@/types/error-bank";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

interface ErrorCardProps {
  record: MasterErrorRecord;
  onOpenDetail: (record: MasterErrorRecord) => void;
}

export function ErrorCard({ record, onOpenDetail }: ErrorCardProps) {
  const tts = useBrowserTTS();

  const handlePlayAudio = (text: string) => {
    tts.speak(sanitizeTextForTTS(text));
  };
  const latestExample = record.examples[record.examples.length - 1];

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

  return (
    <Card className="rounded-3xl border border-border/80 bg-card hover:border-primary/50 transition-all p-5 space-y-4 shadow-xs flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] font-mono capitalize">
              {record.category}
            </Badge>
            {getStatusBadge(record.status)}
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
                <span className="line-through text-red-500 font-semibold">"{latestExample.userText}"</span>
                <span className="text-muted-foreground text-[11px]">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">"{latestExample.correction}"</span>
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
      </div>

      {/* Bottom Metrics & Actions */}
      <div className="pt-3 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>Gặp {record.frequency} lần</span>
          <span>
            Sửa đúng: <span className="font-bold text-foreground">{record.recoveryRate}%</span>
          </span>
          <span>
            Độ trễ: <span className="font-bold text-foreground">{(record.averageLatencyMs / 1000).toFixed(1)}s</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenDetail(record)}
            className="flex-1 rounded-xl text-xs font-semibold h-8 gap-1 border-border/80"
          >
            <Eye className="size-3.5" />
            <span>Chi tiết</span>
          </Button>

          <Link href={`/foundation/retry-lab?recordId=${record.id}`} className="flex-1">
            <Button
              size="sm"
              className="w-full rounded-xl text-xs font-bold h-8 gap-1.5 btn-spring shadow-xs bg-amber-500 hover:bg-amber-600 text-white"
            >
              <RotateCcw className="size-3" />
              <span>Vào Studio sửa</span>
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
