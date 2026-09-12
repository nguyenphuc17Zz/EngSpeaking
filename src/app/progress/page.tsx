"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  Award,
  Calendar,
  Flame,
  Zap,
  Target,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from "lucide-react";

export default function ProgressOverviewPage() {
  const [range, setRange] = useState("30d");
  const [overview, setOverview] = useState<{
    totalSessions: number;
    avgScore: number;
    recentMilestones: Array<{ title: string; unlockedAt?: string }>;
  } | null>(null);
  const [history, setHistory] = useState<Array<{ captured_at: string; overall: number }>>([]);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    fetch(`/api/progress/overview?range=${range}`)
      .then((r) => r.json())
      .then((d) => setOverview(d.overview))
      .catch(() => {});
    fetch(`/api/progress/history?limit=30`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history || []))
      .catch(() => {});
  }, [range]);

  const chartData =
    history.length > 0
      ? history.slice(-20).map((h, i) => ({
          date: new Date(h.captured_at).toLocaleDateString("vi-VN", {
            month: "numeric",
            day: "numeric",
          }),
          overall: h.overall,
          smoothed: Math.round(
            history.slice(Math.max(0, i - 2), i + 1).reduce((s, x) => s + x.overall, 0) /
              Math.min(3, i + 1)
          ),
        }))
      : [
          { date: "Tuần 1", overall: 45, smoothed: 45 },
          { date: "Tuần 2", overall: 52, smoothed: 48 },
          { date: "Tuần 3", overall: 64, smoothed: 58 },
          { date: "Tuần 4", overall: 72, smoothed: 68 },
        ];

  const milestonesList = [
    { title: "Phiên nói đầu tiên (First Talk)", desc: "Hoàn thành phiên nói thử nghiệm", achieved: true },
    { title: "Nói liên tục 1 phút (1-Min Flow)", desc: "Duy trì phản xạ không gián đoạn", achieved: true },
    { title: "Streak 3 ngày liên tiếp", desc: "Duy trì thói quen luyện tập", achieved: true },
    { title: "Mastery 70% Sentence Retrieval", desc: "Gọi câu tức thì không cần dịch nhẩm", achieved: false },
    { title: "Vượt qua thử thách High Pressure", desc: "Phản xạ dưới áp lực dồn dập", achieved: false },
  ];

  return (
    <div className="space-y-7 pb-12">
      {/* Hero Header */}
      <div className="rounded-3xl border border-border/80 bg-card paper-shadow p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border/60 text-foreground/80 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Tiến Độ Dài Hạn • Speaking Journey & Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground leading-snug">
              Tiến độ & Xu hướng dài hạn
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed font-sans">
              Theo dõi sự cải thiện của tốc độ phản xạ và độ trôi chảy theo thời gian. Sự tiến bộ được tích luỹ và bảo toàn ngay cả khi bạn có một buổi luyện tập nhiều thử thách.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Select value={range} onValueChange={(v: string | null) => v && setRange(v)}>
              <SelectTrigger className="w-full sm:w-[140px] rounded-2xl h-11 text-xs border-border/80 bg-background hover:bg-secondary/60 font-semibold paper-shadow-sm">
                <span>
                  {range === "7d"
                    ? "7 ngày qua"
                    : range === "30d"
                    ? "30 ngày qua"
                    : range === "90d"
                    ? "90 ngày qua"
                    : "Toàn bộ"}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/80 bg-card paper-shadow">
                <SelectItem value="7d">7 ngày qua</SelectItem>
                <SelectItem value="30d">30 ngày qua</SelectItem>
                <SelectItem value="90d">90 ngày qua</SelectItem>
                <SelectItem value="all">Toàn bộ thời gian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-3xl border border-border/80 bg-card p-5 paper-shadow-sm hover:paper-shadow-hover transition-all">
          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Target className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground font-medium truncate">Điểm phản xạ TB</div>
              <div className="text-xl md:text-2xl font-bold font-mono text-foreground mt-0.5">
                {overview?.avgScore ? Math.round(overview.avgScore) : 68}
                <span className="text-xs text-muted-foreground font-normal">/100</span>
              </div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block truncate mt-1">
                ↑ +6% so với tháng trước
              </span>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/80 bg-card p-5 paper-shadow-sm hover:paper-shadow-hover transition-all">
          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-2xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Calendar className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground font-medium truncate">Tổng phiên hoàn thành</div>
              <div className="text-xl md:text-2xl font-bold font-mono text-foreground mt-0.5">
                {overview?.totalSessions || 12}
              </div>
              <span className="text-[11px] text-muted-foreground block truncate mt-1">
                142 phút nói thực tế
              </span>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/80 bg-card p-5 paper-shadow-sm hover:paper-shadow-hover transition-all">
          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Award className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground font-medium truncate">Cột mốc đã mở khoá</div>
              <div className="text-xl md:text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                3 / 5
              </div>
              <span className="text-[11px] text-muted-foreground block truncate mt-1">
                Sắp mở: 1-Min Flow
              </span>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/80 bg-card p-5 paper-shadow-sm hover:paper-shadow-hover transition-all">
          <div className="flex items-start gap-3.5">
            <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Zap className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground font-medium truncate">Xu hướng phát triển</div>
              <div className="text-xl md:text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                Tăng trưởng
              </div>
              <span className="text-[11px] text-muted-foreground block truncate mt-1">
                Độ ổn định phản xạ cao
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Line Chart */}
      <Card className="rounded-3xl border border-border/80 bg-card paper-shadow-sm">
        <CardHeader className="p-6 pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-serif font-bold flex items-center gap-2 text-foreground">
              <BarChart3 className="size-4.5 text-primary" />
              <span>Biểu đồ tiến bộ thực chất (Speaking Trend)</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Đường làm mịn (Smoothed Trend) thể hiện sự tiến bộ thực chất loại bỏ biến động nhất thời giữa các phiên tập khó
            </CardDescription>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none font-medium">
            <input
              type="checkbox"
              checked={showRaw}
              onChange={(e) => setShowRaw(e.target.checked)}
              className="rounded accent-primary"
            />
            <span>Hiện điểm từng phiên (Raw)</span>
          </label>
        </CardHeader>

        <CardContent className="p-6">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Area
                  type="monotone"
                  dataKey="smoothed"
                  stroke="var(--primary)"
                  strokeWidth={2.8}
                  fillOpacity={1}
                  fill="url(#colorOverall)"
                  name="Tiến bộ thực chất (Smoothed)"
                />
                {showRaw && (
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                    name="Điểm phiên cụ thể (Raw)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Speaking Journey Milestones */}
      <Card className="rounded-3xl border border-border/80 bg-card paper-shadow-sm">
        <CardHeader className="p-6 pb-4 border-b border-border/60">
          <CardTitle className="text-base font-serif font-bold flex items-center gap-2 text-foreground">
            <Award className="size-4.5 text-primary" />
            <span>Hành trình phản xạ (Speaking Milestones)</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Các mốc năng lực quan trọng đã được hệ thống ghi nhận trong quá trình luyện tập
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {milestonesList.map((m, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all paper-shadow-sm ${
                m.achieved
                  ? "border-emerald-500/30 bg-emerald-500/[0.04] text-foreground"
                  : "border-border/60 bg-secondary/30 opacity-70"
              }`}
            >
              <div
                className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  m.achieved
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-secondary text-muted-foreground border border-border/50"
                }`}
              >
                <CheckCircle2 className="size-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-xs font-serif font-bold block truncate">{m.title}</span>
                <span className="text-[11px] text-muted-foreground leading-relaxed block">
                  {m.desc}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono rounded-full px-2 py-0 mt-1 border ${
                    m.achieved
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  {m.achieved ? "Đã mở khoá" : "Đang tiến hành"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
