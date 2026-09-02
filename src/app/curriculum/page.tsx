"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  GraduationCap,
  Clock,
  Target,
  CheckCircle2,
  TrendingUp,
  Brain,
  ArrowRight,
} from "lucide-react";
import { loadLearnerState, saveLearnerState } from "@/lib/curriculum/learner-state-service";
import type { LearnerState, LearningSessionPlan } from "@/types/learner";
import { WhyThisPanel } from "@/components/curriculum/WhyThisPanel";
import Link from "next/link";

export default function CurriculumTodayPage() {
  const [state, setState] = useState<LearnerState | null>(null);
  const [plan, setPlan] = useState<LearningSessionPlan | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(false);
  const [goalOverride, setGoalOverride] = useState("auto");

  const load = () => setState(loadLearnerState());

  useEffect(() => {
    load();
  }, []);

  const generate = async (dur = duration) => {
    if (!state) return;
    setLoading(true);
    try {
      const res = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learnerState: state,
          duration: dur,
          goalOverride: goalOverride === "auto" ? undefined : goalOverride,
          provider: "mock",
          model: "auto",
        }),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        setExplanation(data.explanation || "");
      } else alert(data.error?.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const handleJustPractice = async () => {
    await generate(duration);
  };

  if (!state)
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span>Đang tải lộ trình cá nhân hoá...</span>
      </div>
    );

  const primaryBottleneck = state.skills.slice().sort((a, b) => a.mastery - b.mastery)[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Today Plan Card */}
      <Card className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-xs overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>AI Adaptive Teacher</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Lộ trình luyện tập hôm nay (10 phút)
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hệ thống tự động thiết kế chuỗi bài tập can thiệp đúng điểm nghẽn của bạn, phân bổ tỷ lệ: Khởi động 2' → Drill 3' → Luyện có hướng dẫn 3' → Hội thoại tự do 2'.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full md:w-auto">
            <Select
              value={String(duration)}
              onValueChange={(v: string | null) => v && setDuration(parseInt(v, 10))}
            >
              <SelectTrigger className="w-full sm:w-[120px] rounded-xl h-11 text-xs">
                <span>{duration} phút</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 phút</SelectItem>
                <SelectItem value="10">10 phút (Chuẩn)</SelectItem>
                <SelectItem value="15">15 phút</SelectItem>
                <SelectItem value="20">20 phút</SelectItem>
                <SelectItem value="30">30 phút</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="lg"
              onClick={handleJustPractice}
              disabled={loading}
              className="w-full sm:w-auto gap-2.5 h-11 px-6 rounded-2xl font-bold shadow-md shadow-primary/25 hover:scale-105 transition-transform"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Đang lập kế hoạch...</span>
                </>
              ) : (
                <>
                  <Play className="size-4 fill-current" />
                  <span>Tạo lộ trình ngay</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Plan Section */}
      {plan ? (
        <div className="space-y-6">
          <Card className="rounded-3xl border-primary/30 bg-card shadow-sm">
            <CardHeader className="p-6 pb-3 border-b border-border/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs rounded-full px-2.5">
                      {plan.estimatedDurationMinutes} phút
                    </Badge>
                    <CardTitle className="text-lg font-bold">{plan.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Mục tiêu: {plan.objective} • Kỹ năng trọng tâm: {plan.primarySkill}
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generate(duration)}
                  className="rounded-xl text-xs gap-1.5 h-8"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Tạo lại</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-bold text-foreground">Timeline các khối bài học:</span>
                {plan.blocks.map((b, i) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground flex items-center gap-2">
                          <span>{b.type.toUpperCase()}</span>
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {b.skillId || "general"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.rationale}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-foreground block">
                        {b.durationMinutes} phút
                      </span>
                      <span className="text-[10px] text-muted-foreground">Độ khó: {b.difficulty}</span>
                    </div>
                  </div>
                ))}
              </div>

              {explanation && (
                <div className="pt-2">
                  <WhyThisPanel explanation={explanation} />
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <Link href="/session">
                  <Button size="lg" className="gap-2 rounded-2xl px-6 font-bold shadow-md shadow-primary/25">
                    <Play className="size-4 fill-current" />
                    <span>Bắt đầu luyện theo lộ trình này</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Learner State Overview & Mastery Matrix */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Brain className="size-4 text-primary" />
              <span>Hồ sơ năng lực hiện tại</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Trạng thái phản xạ & mục tiêu cá nhân
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs leading-relaxed">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
              <span className="font-semibold">Điểm nghẽn cần khắc phục nhất:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {primaryBottleneck?.skillId} ({Math.round((primaryBottleneck?.mastery || 0) * 100)}%)
              </Badge>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-muted-foreground font-semibold">Mục tiêu học tập:</span>
              <div className="flex flex-wrap gap-1.5">
                {state.goals.map((g) => (
                  <Badge key={g.id} variant="secondary" className="rounded-lg text-xs">
                    {g.id}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-muted-foreground">
              <span>Độ dài buổi học ưu tiên:</span>
              <span className="font-mono font-bold text-foreground">
                {state.preferences.preferredSessionLength || 10} phút
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Weakest Skills for Targeted Practice */}
        <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <span>5 Kỹ năng cần củng cố nhất</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Mức độ thành thục (Mastery 0-100%) và xu hướng
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {state.skills
              .slice()
              .sort((a, b) => a.mastery - b.mastery)
              .slice(0, 5)
              .map((s) => {
                const percent = Math.round(s.mastery * 100);
                return (
                  <div key={s.skillId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{s.skillId}</span>
                      <span className="font-mono font-bold text-muted-foreground">{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-2 rounded-full" />
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
