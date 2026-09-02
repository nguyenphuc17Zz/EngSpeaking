"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Bottleneck } from "@/types/diagnostics";
import { AlertCircle, ArrowRight, Zap, Target } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BottleneckCard({
  bottleneck,
  primary,
}: {
  bottleneck: Bottleneck;
  primary?: boolean;
}) {
  return (
    <Card
      className={cn(
        "rounded-3xl border transition-all overflow-hidden shadow-xs",
        primary
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-background"
          : "border-border/80 bg-card"
      )}
    >
      <CardHeader className="p-5 pb-3 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                primary
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {primary ? "1" : "2"}
            </div>
            <CardTitle className="text-sm font-bold truncate">
              {primary ? "Điểm nghẽn ưu tiên số 1" : "Điểm nghẽn thứ hai"}
            </CardTitle>
          </div>

          <Badge
            variant={primary ? "default" : "secondary"}
            className="text-[11px] font-semibold rounded-full px-2.5"
          >
            {bottleneck.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-3.5">
        <p className="text-sm text-foreground leading-relaxed">{bottleneck.reason}</p>

        {/* Diagnostic Meta Metrics */}
        <div className="flex flex-wrap gap-2 text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
          <span className="bg-muted/40 px-2 py-0.5 rounded-md">Mức độ nghiêm trọng: {bottleneck.severity}/100</span>
          <span className="bg-muted/40 px-2 py-0.5 rounded-md">Tần suất lặp: {bottleneck.recurrence}×</span>
          <span className="bg-muted/40 px-2 py-0.5 rounded-md">Độ tin cậy: {bottleneck.confidence}</span>
        </div>

        {/* Direct Action Link to Practice */}
        <Link href="/foundation/practice" className="block pt-1">
          <Button
            size="sm"
            variant={primary ? "default" : "outline"}
            className="w-full gap-2 rounded-xl text-xs font-semibold h-9"
          >
            <Target className="size-3.5" />
            <span>Luyện bài tập khắc phục điểm nghẽn này</span>
            <ArrowRight className="size-3.5 ml-auto" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
