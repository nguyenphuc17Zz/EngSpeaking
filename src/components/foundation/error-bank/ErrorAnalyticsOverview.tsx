"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Zap,
  TrendingUp,
  Target,
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

  const topPriority = [...activeRecords].sort((a, b) => b.priorityScore - a.priorityScore)[0];
  const reviewDueCount = contextPack.reviewDueList.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Total Patterns */}
      <Card className="rounded-3xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Mẫu lỗi đang theo dõi
          </span>
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Brain className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-foreground">{totalCount}</span>
          <span className="text-[11px] text-muted-foreground font-mono">patterns</span>
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

      {/* 3. Top Priority Weakness */}
      <Card className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5 p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Ưu tiên cải thiện #1
          </span>
          <div className="size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Zap className="size-4" />
          </div>
        </div>
        <p className="text-xs font-bold text-foreground truncate" title={topPriority?.labelVi || "Chưa có"}>
          {topPriority?.labelVi || "Tất cả ổn định"}
        </p>
      </Card>

      {/* 4. Spaced Review Due */}
      <Card className="rounded-3xl border border-border/80 bg-card p-4 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Đến hạn ôn ngắt quãng
          </span>
          <div className="size-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Clock className="size-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-indigo-500">{reviewDueCount}</span>
          <span className="text-[11px] text-muted-foreground font-mono">cần review</span>
        </div>
      </Card>
    </div>
  );
}
