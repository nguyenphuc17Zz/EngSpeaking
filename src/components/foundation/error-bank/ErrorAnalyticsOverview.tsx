"use client";

import { Card } from "@/components/ui/card";
import {
  Brain,
  RotateCcw,
  Clock,
  Flame,
} from "lucide-react";
import type { CompactErrorContextPack, MasterErrorRecord } from "@/types/error-bank";

interface ErrorAnalyticsOverviewProps {
  records: MasterErrorRecord[];
  contextPack: CompactErrorContextPack;
}

export function ErrorAnalyticsOverview({
  records,
  contextPack,
}: ErrorAnalyticsOverviewProps) {
  const activeRecords = records.filter((r) => !r.userFlaggedAsFalsePositive);
  const totalCount = activeRecords.length;

  const totalRecovery = activeRecords.reduce((acc, r) => acc + r.recoveryRate, 0);
  const averageRecovery = totalCount > 0 ? Math.round(totalRecovery / totalCount) : 0;

  // BKT Average Mastery
  const totalMastery = activeRecords.reduce((acc, r) => acc + (r.pMastery || 0.3), 0);
  const averageMastery = totalCount > 0 ? Math.round((totalMastery / totalCount) * 100) : 0;

  // Fossilization Risk count
  const fossilizedCount = activeRecords.filter(
    (r) => r.fossilizationLevel === "fossilized" || (r.fossilizationScore && r.fossilizationScore >= 65)
  ).length;

  const reviewDueCount = contextPack.reviewDueList.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Patterns & BKT Mastery */}
      <Card className="rounded-3xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Mẫu lỗi đang theo dõi
          </span>
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Brain className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-foreground">{totalCount}</span>
            <span className="text-[11px] text-muted-foreground font-mono">patterns</span>
          </div>
          <span className="text-[11px] font-mono text-primary font-bold">
            BKT: {averageMastery}%
          </span>
        </div>
      </Card>

      {/* 2. Recovery Rate */}
      <Card className="rounded-3xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Tỉ lệ phục hồi (Recovery)
          </span>
          <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <RotateCcw className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {averageRecovery}%
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">qua Retry</span>
        </div>
      </Card>

      {/* 3. Fossilization Risk Warnings */}
      <Card className="rounded-3xl border-2 border-rose-500/30 bg-gradient-to-br from-card via-card to-rose-500/5 p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Nguy cơ Hóa đá L1
          </span>
          <div className="size-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Flame className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
              {fossilizedCount}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">lỗi cao</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Thói quen mẹ đẻ</span>
        </div>
      </Card>

      {/* 4. FSRS Spaced Review Due */}
      <Card className="rounded-3xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            FSRS Đến hạn ôn
          </span>
          <div className="size-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Clock className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-indigo-500">{reviewDueCount}</span>
            <span className="text-[11px] text-muted-foreground font-mono">cần review</span>
          </div>
          <span className="text-[10px] text-muted-foreground">R &lt; 90%</span>
        </div>
      </Card>
    </div>
  );
}
