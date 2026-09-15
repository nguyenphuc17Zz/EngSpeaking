"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
  Brain,
  AlertTriangle,
  Lightbulb,
  Clock,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import type { SpokenDiagnosticReport } from "@/types/error-bank";

interface Props {
  report: SpokenDiagnosticReport;
}

export function DiagnosticReportCard({ report }: Props) {
  const getModuleHref = (mod: string) => {
    switch (mod) {
      case "retry_lab":
        return "/foundation/retry-lab";
      case "latency":
        return "/foundation/latency";
      case "sentence_builder":
        return "/foundation/sentence-builder";
      case "vn_to_en":
        return "/foundation/vn-to-en";
      default:
        return "/";
    }
  };

  const getModuleLabel = (mod: string) => {
    switch (mod) {
      case "retry_lab":
        return "Spoken Repair Lab";
      case "latency":
        return "Response Latency Gym";
      case "sentence_builder":
        return "Sentence Builder";
      case "vn_to_en":
        return "VN → EN Speaking";
      default:
        return "Luyện nói";
    }
  };

  return (
    <Card className="rounded-3xl border-2 border-indigo-500/40 bg-gradient-to-br from-card via-card to-indigo-500/10 shadow-lg overflow-hidden animate-in fade-in-0 duration-300">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
              <Brain className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-foreground">
                  Hồ Sơ Chẩn Đoán & Kê Đơn Khẩu Ngữ AI
                </h2>
                <Badge className="bg-indigo-600 text-white font-mono text-[10px]">
                  Real AI Diagnostics
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chẩn đoán chuyên sâu từ toàn bộ dữ liệu lịch sử nói của bạn
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-muted-foreground">
            Cập nhật: {new Date(report.generatedAt).toLocaleDateString("vi-VN")}
          </div>
        </div>

        {/* Primary Bottleneck Callout */}
        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
            <AlertTriangle className="size-4" />
            <span>Điểm nghẽn khẩu ngữ lớn nhất hiện tại:</span>
          </div>
          <p className="text-xs md:text-sm font-semibold text-foreground leading-relaxed">
            {report.primaryBottleneckVi}
          </p>
        </div>

        {/* Retrieval Gap vs Knowledge Gap Analysis */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="size-4 text-amber-500 fill-amber-500" />
                <span>Bản chất điểm nghẽn: Retrieval Gap vs Knowledge Gap</span>
              </span>
              <p className="text-xs text-muted-foreground">
                Đo lường nguyên nhân gây lỗi khi mở miệng nói tiếng Anh
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                <span className="size-2 rounded-full bg-amber-500" />
                {report.retrievalVsKnowledgeRatio.retrievalGapPercent}% Độ trễ phản xạ (Retrieval)
              </span>
              <span className="flex items-center gap-1 text-primary font-bold">
                <span className="size-2 rounded-full bg-primary" />
                {report.retrievalVsKnowledgeRatio.knowledgeGapPercent}% Hổng kiến thức (Knowledge)
              </span>
            </div>
          </div>

          <Progress
            value={report.retrievalVsKnowledgeRatio.retrievalGapPercent}
            className="h-2.5 rounded-full [&>div]:bg-amber-500"
          />

          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            💡 {report.retrievalVsKnowledgeRatio.explanationVi}
          </p>
        </div>

        {/* L1 Interference Callouts (Vietnamese habits -> Natural English) */}
        {report.l1InterferencePatterns && report.l1InterferencePatterns.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="size-4 text-amber-500" />
              <span>Thói quen dịch thô tiếng Việt cần triệt tiêu (L1 Interference):</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-3">
              {report.l1InterferencePatterns.map((pat, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-1.5 text-xs"
                >
                  <div className="font-mono">
                    <span className="line-through text-red-500 font-semibold">
                      "{pat.vietnameseHabit}"
                    </span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      "{pat.naturalEnglishAlternative}"
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {pat.explanationVi}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-Day Prescription (3 high leverage action cards) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="size-4 text-indigo-500" />
              <span>Đơn thuốc khẩu ngữ 7 ngày (7-Day Prescription):</span>
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground">3 nhiệm vụ trọng tâm</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {report.prescriptions.map((rx) => (
              <Card
                key={rx.id}
                className="rounded-2xl border border-border/80 bg-background/80 p-4 space-y-3 shadow-2xs flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {rx.dailyMinutes} phút/ngày
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                      {getModuleLabel(rx.targetModule)}
                    </Badge>
                  </div>

                  <h4 className="text-xs font-bold text-foreground leading-snug">
                    {rx.titleVi}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {rx.actionDescriptionVi}
                  </p>
                </div>

                <div className="pt-2">
                  <Link href={getModuleHref(rx.targetModule)}>
                    <Button
                      size="sm"
                      className="w-full h-8 rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white btn-spring shadow-2xs"
                    >
                      <span>Vào luyện ngay</span>
                      <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Motivational Quote */}
        {report.motivationalQuoteVi && (
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-center text-xs font-medium text-primary">
            "{report.motivationalQuoteVi}"
          </div>
        )}
      </CardContent>
    </Card>
  );
}
