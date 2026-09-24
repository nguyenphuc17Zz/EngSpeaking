"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  HelpCircle,
  Loader2,
} from "lucide-react";

interface FoundationSessionRecord {
  id: string;
  exercise_id: string;
  mode: string;
  skill: string;
  difficulty: number;
  exercise_type: string;
  started_at: string;
  completed_at?: string;
  status: string;
  created_at: string;
}

interface FoundationAttemptRecord {
  id: string;
  session_id: string;
  exercise_id: string;
  transcript: string;
  raw_transcript: string;
  duration_ms?: number;
  time_to_first_word_ms?: number;
  hints_used: number;
  hint_level: number;
  score_overall?: number;
  completed: number;
  created_at: string;
}

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.sessionId;
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [session, setSession] = useState<FoundationSessionRecord | null>(null);
  const [attempts, setAttempts] = useState<FoundationAttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setIsLoading(true);
    fetch(`/api/foundation/sessions/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải thông tin session");
        return res.json();
      })
      .then((data) => {
        if (!data.session) {
          setError("Không tìm thấy phiên luyện tập này trong cơ sở dữ liệu.");
        } else {
          setSession(data.session);
          setAttempts(data.attempts || []);
        }
      })
      .catch((err) => {
        setError(err.message || "Lỗi kết nối");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [sessionId]);

  const getStudioRoute = (skill?: string, exerciseType?: string) => {
    const s = (skill || "").toLowerCase();
    const e = (exerciseType || "").toLowerCase();
    if (s.includes("sentence") || e.includes("sentence")) return "/sentence-builder";
    if (s.includes("vn") || e.includes("vn") || s.includes("translation")) return "/vn-to-en";
    if (s.includes("shadowing") || e.includes("shadowing")) return "/shadowing";
    if (s.includes("survival") || e.includes("survival")) return "/survival";
    if (s.includes("vocab") || e.includes("vocab")) return "/vocabulary";
    return "/sentence-builder";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">Đang tải báo cáo chi tiết session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="size-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="size-7" />
        </div>
        <h2 className="text-lg font-bold font-serif text-foreground">Không tìm thấy Session</h2>
        <p className="text-sm text-muted-foreground">{error || "Phiên luyện tập không tồn tại hoặc đã bị xóa."}</p>
        <Link href="/history">
          <Button variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="size-4" />
            <span>Quay lại Lịch sử</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate aggregates
  const bestAttempt = attempts.reduce<FoundationAttemptRecord | null>((best, cur) => {
    if (!best) return cur;
    return (cur.score_overall || 0) > (best.score_overall || 0) ? cur : best;
  }, null);

  const avgTtfw = attempts.length
    ? Math.round(
        attempts.reduce((acc, a) => acc + (a.time_to_first_word_ms || 0), 0) / attempts.length
      )
    : null;

  const totalHints = attempts.reduce((acc, a) => acc + (a.hints_used || 0), 0);

  const targetStudio = getStudioRoute(session.skill, session.exercise_type);

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in-0 duration-200 pb-12">
      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/history">
            <Button variant="ghost" size="icon" className="size-8 rounded-xl" title="Quay lại danh sách">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">Chi Tiết Phiên Luyện Tập</h1>
              <Badge variant="outline" className="text-[10px] font-mono">
                {session.id.slice(0, 8)}
              </Badge>
              <Badge
                variant={session.status === "completed" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {session.status === "completed" ? "Hoàn thành" : session.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(session.started_at).toLocaleString("vi-VN")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={targetStudio}>
            <Button size="sm" className="rounded-xl font-bold text-xs gap-1.5 shadow-xs">
              <RotateCcw className="size-3.5" />
              <span>Luyện lại bài này</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── METRICS OVERVIEW CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Overall Score */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Điểm cao nhất</span>
              <Award className="size-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {bestAttempt?.score_overall ?? "--"}/100
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {bestAttempt && (bestAttempt.score_overall || 0) >= 80 ? "Đạt chuẩn tự nhiên" : "Cần rèn luyện thêm"}
            </p>
          </CardContent>
        </Card>

        {/* TTFW Latency */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Độ trễ bật câu</span>
              <Zap className="size-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {avgTtfw ? `${avgTtfw}ms` : "--"}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {avgTtfw && avgTtfw <= 2000 ? "Phản xạ nhanh (<2s)" : "Thời gian tìm từ"}
            </p>
          </CardContent>
        </Card>

        {/* Total Attempts */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Số lượt thử</span>
              <RotateCcw className="size-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {attempts.length} lượt
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              Vòng lặp sửa sai & rèn luyện
            </p>
          </CardContent>
        </Card>

        {/* Hints Used */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Gợi ý đã xem</span>
              <HelpCircle className="size-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {totalHints} gợi ý
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {totalHints === 0 ? "100% Tự chủ phản xạ" : `Trung bình ${(totalHints / Math.max(1, attempts.length)).toFixed(1)}/lượt`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── SESSION INFO BANNER ── */}
      <Card className="rounded-2xl border-border/80">
        <CardHeader className="py-3 px-4 border-b border-border/60 bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Thông Tin Bài Tập
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Kỹ năng:</span>
            <span className="font-semibold text-foreground capitalize">{session.skill.replace(/_/g, " ")}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Dạng bài:</span>
            <span className="font-semibold text-foreground capitalize">{session.exercise_type.replace(/_/g, " ")}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Độ khó:</span>
            <Badge variant="outline" className="font-mono text-[10px]">Level {session.difficulty}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Mã bài tập:</span>
            <span className="font-mono text-[11px] text-foreground truncate block">{session.exercise_id || "N/A"}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── ATTEMPTS TRANSCRIPT & SCORING BREAKDOWN ── */}
      <Card className="rounded-2xl border-border/80">
        <CardHeader className="py-3.5 px-4 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Lịch Sử Các Lượt Nói (Attempts)</CardTitle>
            <CardDescription className="text-xs">
              Bản ghi âm thanh được chuyển ngữ và đánh giá theo từng lần thử
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs font-mono">
            {attempts.length} attempts
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Không có bản ghi lượt nói nào trong phiên này.
            </p>
          ) : (
            attempts.map((att, idx) => (
              <div
                key={att.id}
                className="rounded-xl border border-border/70 p-3.5 bg-card/60 space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono">
                      #{idx + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(att.created_at).toLocaleTimeString("vi-VN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {att.score_overall !== undefined && (
                      <Badge
                        variant={att.score_overall >= 80 ? "default" : "outline"}
                        className="text-xs font-mono font-bold"
                      >
                        {att.score_overall} pts
                      </Badge>
                    )}
                    {att.time_to_first_word_ms && (
                      <Badge variant="outline" className="text-[10px] font-mono text-sky-600 dark:text-sky-400">
                        ⚡ {att.time_to_first_word_ms}ms
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Spoken Transcript */}
                <div className="bg-muted/40 rounded-lg p-2.5 border border-border/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                    Câu bạn đã nói:
                  </span>
                  <p className="text-sm font-medium text-foreground">
                    &ldquo;{att.transcript}&rdquo;
                  </p>
                </div>

                {/* Raw vs hints */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>
                    Thời lượng nói: {att.duration_ms ? `${(att.duration_ms / 1000).toFixed(1)}s` : "--"}
                  </span>
                  <span>
                    Gợi ý đã xem: {att.hints_used} (Tier {att.hint_level})
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
