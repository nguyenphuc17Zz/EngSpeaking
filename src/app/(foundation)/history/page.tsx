"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFoundationStore } from "@/stores/foundation-store";
import { ExerciseCard } from "@/components/foundation/ExerciseCard";
import { ArrowLeft, ChevronRight, Clock, Database, History as HistoryIcon } from "lucide-react";

interface SqliteSessionItem {
  id: string;
  skill: string;
  exercise_type: string;
  difficulty: number;
  status: string;
  started_at: string;
}

export default function HistoryPage() {
  const { history } = useFoundationStore();
  const [sessions, setSessions] = useState<SqliteSessionItem[]>([]);

  useEffect(() => {
    fetch("/api/foundation/sessions?limit=30")
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in-0 duration-200 pb-12">
      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="size-8 rounded-xl" title="Quay lại Trang chủ">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <HistoryIcon className="size-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Lịch Sử Luyện Nói Foundation</h1>
              <p className="text-xs text-muted-foreground">Các bài tập phản xạ, bản ghi âm và báo cáo chi tiết</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SERVER SQLITE SESSIONS ── */}
      <Card className="rounded-2xl border-border/80 shadow-2xs">
        <CardHeader className="py-3.5 px-4 border-b border-border/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              Phiên Luyện Tập Cơ Sở Dữ Liệu (SQLite)
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {sessions.length} sessions
          </Badge>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Chưa có phiên luyện tập nào được lưu trên SQLite database.</p>
          ) : (
            sessions.map((s) => (
              <Link
                key={s.id}
                href={`/history/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/50 hover:bg-muted/30 transition-all group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                      {s.skill.replace(/_/g, " ").toUpperCase()} • {s.exercise_type.replace(/_/g, " ")}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Level {s.difficulty}
                    </Badge>
                    <Badge
                      variant={s.status === "completed" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px]">ID: {s.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(s.started_at).toLocaleString("vi-VN")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 ml-3">
                  <span className="hidden sm:inline">Chi tiết</span>
                  <ChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* ── LOCAL PERSISTED EXERCISES ── */}
      <Card className="rounded-2xl border-border/80 shadow-2xs">
        <CardHeader className="py-3.5 px-4 border-b border-border/60">
          <CardTitle className="text-sm font-bold text-foreground">Lịch Sử Cục Bộ (Local Persisted)</CardTitle>
          <CardDescription className="text-xs">
            Lịch sử các câu luyện tập gần nhất lưu trong trình duyệt của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Chưa có bài luyện nào trong bộ nhớ cục bộ.</p>
          ) : (
            history.slice().reverse().map((h, i) => (
              <div key={i} className="rounded-xl border border-border/70 p-3.5 space-y-2 bg-card/60">
                <ExerciseCard exercise={h.exercise} />
                <div className="text-xs space-y-1.5 pt-1">
                  <div className="p-2 rounded-lg bg-muted/40 text-foreground font-medium">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block mb-0.5">Transcript:</span>
                    &ldquo;{h.attempt.transcript}&rdquo;
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-muted-foreground text-[11px]">
                    <span className="font-bold text-foreground">Điểm: {h.evaluation.score.overall}/100</span>
                    <span>•</span>
                    <span>{h.evaluation.classification}</span>
                    <span>•</span>
                    <span>TTFW {h.evaluation.timeToFirstWordMs ?? "?"}ms</span>
                    <span>•</span>
                    <span>Thời lượng {h.evaluation.durationMs ?? "?"}ms</span>
                    <span>•</span>
                    <span>Gợi ý {h.evaluation.hintsUsed}</span>
                  </div>
                  {h.evaluation.feedback.whatWentWell && (
                    <p className="text-[11px] text-muted-foreground">
                      💡 {h.evaluation.feedback.whatWentWell}
                      {h.evaluation.feedback.mainIssue ? ` • Cần chú ý: ${h.evaluation.feedback.mainIssue}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
