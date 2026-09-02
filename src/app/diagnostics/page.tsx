"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Play,
  BarChart3,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  Target,
  RefreshCw,
  Zap,
} from "lucide-react";
import { ScoreBars } from "@/components/diagnostics/ScoreBars";
import { BottleneckCard } from "@/components/diagnostics/BottleneckCard";
import type { SpeakingEvaluation } from "@/types/diagnostics";
import Link from "next/link";

export default function DiagnosticsOverview() {
  const [latest, setLatest] = useState<SpeakingEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [snapshot, setSnapshot] = useState<unknown | null>(null);

  const loadLatest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/evaluation/latest");
      const data = await res.json();
      setLatest(data.evaluation);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatest();
  }, []);

  const handleEvaluateLastSession = async () => {
    setEvaluating(true);
    try {
      const res = await fetch("/api/conversation/worlds?limit=1");
      const worldsData = await res.json();
      const world = worldsData.worlds?.[0];
      if (!world) {
        const sRes = await fetch("/api/sessions?limit=1");
        const sData = await sRes.json();
        const sess = sData.sessions?.[0];
        if (!sess) {
          alert("Không tìm thấy session nào để đánh giá. Hãy tạo một phiên nói trước.");
          return;
        }
        const tRes = await fetch(`/api/sessions/${sess.id}`);
        const tData = await tRes.json();
        const turns = (tData.turns || [])
          .filter((t: { role: string }) => t.role === "user")
          .map((t: { id: string; text: string; timestamp: string; duration_ms?: number }) => ({
            turnId: t.id,
            transcript: t.text,
            durationMs: t.duration_ms,
          }));
        const eRes = await fetch("/api/evaluation/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sess.id,
            sessionType: "session",
            turns,
            provider: "mock",
            hasAudio: false,
          }),
        });
        const eData = await eRes.json();
        if (eData.evaluation) {
          setLatest(eData.evaluation);
          setSnapshot(eData.snapshot);
        } else alert(eData.error?.message || "Evaluation failed");
        return;
      }

      const detail = await fetch(`/api/conversation/worlds?id=${world.id}`).then((r) => r.json());
      const turns = (detail.turns || [])
        .filter((t: { role: string }) => t.role === "user")
        .map(
          (t: {
            id: string;
            text: string;
            duration_ms?: number;
            time_to_first_word_ms?: number;
          }) => ({
            turnId: t.id,
            transcript: t.text,
            durationMs: t.duration_ms,
            timeToFirstWordMs: t.time_to_first_word_ms,
          })
        );
      if (turns.length < 2) {
        alert("Session quá ngắn — cần ít nhất 2 lượt nói của bạn để phân tích chính xác.");
        return;
      }
      const eRes = await fetch("/api/evaluation/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: world.id,
          sessionType: "conversation_worlds",
          turns,
          provider: "mock",
          hasAudio: false,
        }),
      });
      const eData = await eRes.json();
      if (eData.evaluation) {
        setLatest(eData.evaluation);
        setSnapshot(eData.snapshot);
      } else alert(eData.error?.message || "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span>Đang tải chẩn đoán năng lực...</span>
      </div>
    );

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <Card className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-xs overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>8-Dimension Diagnostics & Bottleneck Discovery</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Chẩn đoán năng lực nói 8 chiều
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Phân tích điểm mạnh, tìm điểm nghẽn cốt lõi đang kìm hãm phản xạ và đề xuất kế hoạch can thiệp tức thì.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            <Button
              size="lg"
              onClick={handleEvaluateLastSession}
              disabled={evaluating}
              className="w-full sm:w-auto gap-2 font-semibold shadow-md shadow-primary/25 rounded-2xl h-11 px-5"
            >
              {evaluating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Đang phân tích dữ liệu...</span>
                </>
              ) : (
                <>
                  <Play className="size-4 fill-current" />
                  <span>Đánh giá phiên gần nhất</span>
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={loadLatest}
              className="w-full sm:w-auto gap-2 rounded-2xl h-11 px-4"
            >
              <RefreshCw className="size-4" />
              <span>Làm mới</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!latest ? (
        <Card className="rounded-3xl border border-dashed border-border/80 bg-card">
          <CardContent className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <BarChart3 className="size-6" />
            </div>
            <h3 className="font-bold text-base text-foreground">Chưa có dữ liệu đánh giá</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hãy hoàn thành một phiên luyện nói tự do hoặc hội thoại AI (ít nhất 2 lượt nói) để hệ thống thu thập bằng chứng và phân tích 8 chiều.
            </p>
            <Link href="/session" className="inline-block pt-2">
              <Button size="sm" className="rounded-xl px-5 font-semibold">
                Bắt đầu luyện nói ngay
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall Practice Score Card */}
          <Card className="rounded-3xl border border-primary/20 bg-card shadow-xs">
            <CardHeader className="p-5 pb-3 border-b border-border/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>Điểm thực hành tổng thể:</span>
                    <span className="font-mono text-primary text-xl">
                      {latest.overallPracticeScore}/100
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Đánh giá dựa trên độ tự nhiên và phản xạ thực tế (không phải điểm thi lý thuyết)
                  </CardDescription>
                </div>

                <Badge variant="secondary" className="text-xs rounded-full px-3 py-1">
                  Độ tin cậy: {latest.confidence.overall}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-2">
              <Progress value={latest.overallPracticeScore} className="h-3 rounded-full" />
              {latest.confidence.reason && (
                <p className="text-xs text-muted-foreground italic">
                  Ghi chú: {latest.confidence.reason}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 8 Dimensions & Priority Bottlenecks */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
              <CardHeader className="p-5 pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <span>Chi tiết 8 chiều đánh giá</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Phân tách năng lực sản sinh câu và phản xạ
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ScoreBars dimensions={latest.dimensions} />
              </CardContent>
            </Card>

            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Target className="size-4 text-amber-500" />
                  <span>Điểm nghẽn cần ưu tiên can thiệp</span>
                </h3>
                <div className="space-y-3">
                  {latest.priorityBottlenecks[0] && (
                    <BottleneckCard bottleneck={latest.priorityBottlenecks[0]} primary />
                  )}
                  {latest.priorityBottlenecks[1] && (
                    <BottleneckCard bottleneck={latest.priorityBottlenecks[1]} />
                  )}
                </div>
              </div>

              {/* What to train next */}
              {latest.recommendations.length > 0 && (
                <Card className="rounded-3xl border-primary/20 bg-primary/5 shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Zap className="size-3.5" />
                      <span>Đề xuất bài tập tiếp theo</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {latest.recommendations.slice(0, 2).map((r) => (
                      <div
                        key={r.skill}
                        className="p-2.5 rounded-xl bg-card border border-border/60 text-xs flex items-center justify-between"
                      >
                        <span className="font-semibold text-foreground">{r.skill}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {r.suggestedExerciseTypes.slice(0, 2).join(", ")}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  <span>Điểm làm tốt (Strengths)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-2">
                {latest.strengths.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-card border border-emerald-500/20 text-xs leading-relaxed"
                  >
                    <span className="font-bold text-foreground">{s.category}:</span>{" "}
                    <span className="text-muted-foreground">{s.description}</span>
                  </div>
                ))}
                {latest.strengths.length === 0 && (
                  <p className="text-xs text-muted-foreground">Cần thêm dữ liệu phiên nói để phân tích thế mạnh.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-amber-500/30 bg-amber-500/5 shadow-xs">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  <span>Vấn đề cần lưu ý (Areas to improve)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-2">
                {latest.weaknesses.slice(0, 3).map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-2xl bg-card border border-amber-500/20 text-xs leading-relaxed flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-foreground">{w.category}:</span>{" "}
                      <span className="text-muted-foreground">{w.description}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {w.frequency}×
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
