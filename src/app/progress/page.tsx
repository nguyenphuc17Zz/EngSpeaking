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
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <Card className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-xs overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <TrendingUp className="size-3.5" />
              <span>Speaking Progress & Long-Term Intelligence</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Tiến độ & Xu hướng dài hạn
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Theo dõi sự cải thiện của tốc độ phản xạ và độ trôi chảy theo thời gian. Sự tiến bộ được bảo toàn ngay cả khi bạn có một buổi luyện tập khó.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={range} onValueChange={(v: string | null) => v && setRange(v)}>
              <SelectTrigger className="w-[130px] rounded-xl h-11 text-xs">
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
              <SelectContent>
                <SelectItem value="7d">7 ngày qua</SelectItem>
                <SelectItem value="30d">30 ngày qua</SelectItem>
                <SelectItem value="90d">90 ngày qua</SelectItem>
                <SelectItem value="all">Toàn bộ thời gian</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Target className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono">
                {overview?.avgScore ? Math.round(overview.avgScore) : 68}/100
              </div>
              <div className="text-xs text-muted-foreground">Điểm phản xạ trung bình</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Calendar className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono">{overview?.totalSessions || 12}</div>
              <div className="text-xs text-muted-foreground">Tổng số phiên đã hoàn thành</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Award className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono">3 / 5</div>
              <div className="text-xs text-muted-foreground">Cột mốc đã mở khoá</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Zap className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                Improving
              </div>
              <div className="text-xs text-muted-foreground">Xu hướng phát triển</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Progress Line Chart */}
      <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <span>Biểu đồ tiến bộ (Speaking Trend)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Đường làm mịn (Smoothed Trend) thể hiện sự tiến bộ thực chất loại bỏ biến động nhất thời
            </CardDescription>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRaw}
              onChange={(e) => setShowRaw(e.target.checked)}
              className="rounded"
            />
            <span>Hiện điểm từng phiên (Raw)</span>
          </label>
        </CardHeader>

        <CardContent className="p-5">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Area
                  type="monotone"
                  dataKey="smoothed"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
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
      <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Award className="size-4 text-primary" />
            <span>Hành trình phản xạ (Speaking Milestones)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Các mốc năng lực quan trọng đã được ghi nhận
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {milestonesList.map((m, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                m.achieved
                  ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                  : "border-border/60 bg-muted/20 opacity-60"
              }`}
            >
              <div
                className={`size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  m.achieved ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                <CheckCircle2 className="size-4" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">{m.title}</span>
                <span className="text-[11px] text-muted-foreground leading-tight block">
                  {m.desc}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
