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
        "rounded-3xl border transition-all overflow-hidden paper-shadow-sm",
        primary
          ? "border-primary/40 bg-gradient-to-br from-primary/[0.05] via-card to-card"
          : "border-border/80 bg-card"
      )}
    >
      <CardHeader className="p-5 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "size-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0",
                primary
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-secondary text-muted-foreground border border-border/60"
              )}
            >
              {primary ? "1" : "2"}
            </div>
            <CardTitle className="text-sm font-serif font-bold truncate text-foreground">
              {primary ? "Điểm nghẽn ưu tiên số 1" : "Điểm nghẽn thứ hai"}
            </CardTitle>
          </div>

          <Badge
            variant={primary ? "default" : "secondary"}
            className={cn(
              "text-[11px] rounded-full px-2.5 py-0.5 font-medium",
              primary
                ? "bg-primary/15 text-primary border border-primary/25 hover:bg-primary/20"
                : "bg-secondary text-foreground/80 border border-border/60"
            )}
          >
            {bottleneck.category}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-3.5">
        <p className="text-sm text-foreground leading-relaxed font-sans">{bottleneck.reason}</p>

        {/* Diagnostic Meta Metrics */}
        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-muted-foreground pt-2 border-t border-border/60">
          <span className="bg-secondary/70 border border-border/50 px-2 py-0.5 rounded-lg">
            Mức độ: {bottleneck.severity}/100
          </span>
          <span className="bg-secondary/70 border border-border/50 px-2 py-0.5 rounded-lg">
            Tần suất: {bottleneck.recurrence}×
          </span>
          <span className="bg-secondary/70 border border-border/50 px-2 py-0.5 rounded-lg">
            Độ tin cậy: {bottleneck.confidence}
          </span>
        </div>

        {/* Direct Action Link to Practice */}
        <Link href="/foundation/practice" className="block pt-1">
          <Button
            size="sm"
            variant={primary ? "default" : "outline"}
            className={cn(
              "w-full gap-2 rounded-xl text-xs font-semibold h-9.5",
              primary ? "btn-spring shadow-xs" : "border-border/80 hover:bg-secondary/60"
            )}
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
