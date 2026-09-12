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
    <div className="space-y-7 pb-12">
      {/* Hero Today Plan Card */}
      <div className="rounded-3xl border border-border/80 bg-card paper-shadow p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border/60 text-foreground/80 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>Lộ Trình Tự Động • Adaptive Curriculum</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-foreground leading-snug">
              Lộ trình luyện đàm thoại hôm nay
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed font-sans">
              Hệ thống thiết kế chuỗi bài tập can thiệp đúng điểm nghẽn của bạn theo tỷ lệ tối ưu:{" "}
              <strong>Khởi động 2' → Drill cụm từ 3' → Luyện có hướng dẫn 3' → Đối thoại tự do 2'</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Select
              value={String(duration)}
              onValueChange={(v: string | null) => v && setDuration(parseInt(v, 10))}
            >
              <SelectTrigger className="w-full sm:w-[130px] rounded-xl h-11 text-xs border-border/80 bg-background font-medium">
                <span>{duration} phút (Chuẩn)</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 phút (Nhanh)</SelectItem>
                <SelectItem value="10">10 phút (Chuẩn)</SelectItem>
                <SelectItem value="15">15 phút</SelectItem>
                <SelectItem value="20">20 phút</SelectItem>
                <SelectItem value="30">30 phút (Chuyên sâu)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="lg"
              onClick={handleJustPractice}
              disabled={loading}
              className="w-full sm:w-auto gap-2.5 h-11 px-6 rounded-xl font-semibold btn-spring shadow-xs"
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
        </div>
      </div>

      {/* Generated Plan Section */}
      {plan ? (
        <div className="space-y-6">
          <Card className="rounded-3xl border-border/80 bg-card paper-shadow">
            <CardHeader className="p-6 pb-4 border-b border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Badge variant="default" className="text-xs rounded-full px-2.5 shadow-2xs font-mono">
                      {plan.estimatedDurationMinutes} phút
                    </Badge>
                    <CardTitle className="text-xl font-serif font-bold text-foreground">
                      {plan.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    Mục tiêu: {plan.objective} • Kỹ năng trọng tâm:{" "}
                    <span className="font-semibold text-foreground">{plan.primarySkill}</span>
                  </CardDescription>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generate(duration)}
                  className="rounded-xl text-xs gap-1.5 h-8.5 border-border/80 hover:bg-secondary btn-spring"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Tạo lại</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-bold text-foreground uppercase tracking-wider">
                    Timeline các chặng luyện tập
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {plan.blocks.length} chặng hoàn thành
                  </span>
                </div>

                <div className="space-y-3">
                  {plan.blocks.map((b, i) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-4 paper-shadow-sm paper-shadow-hover transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="size-8 rounded-xl bg-primary/10 text-primary border border-primary/20 font-serif text-sm font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          0{i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-serif font-bold text-foreground flex items-center gap-2">
                            <span>{b.type.toUpperCase()}</span>
                            <Badge variant="outline" className="text-[10px] font-normal border-border/80">
                              {b.skillId || "general"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{b.rationale}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-foreground block">
                          {b.durationMinutes} phút
                        </span>
                        <span className="text-[11px] text-muted-foreground">Độ khó: {b.difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {explanation && (
                <div className="pt-2">
                  <WhyThisPanel explanation={explanation} />
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <Link href="/session">
                  <Button size="lg" className="gap-2 rounded-xl px-6 font-semibold btn-spring shadow-xs">
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
        <Card className="rounded-3xl border border-border/80 bg-card paper-shadow-sm">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-serif font-bold flex items-center gap-2.5 text-foreground">
              <Brain className="size-4.5 text-primary" />
              <span>Hồ sơ năng lực phản xạ</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Trạng thái phản xạ & mục tiêu cá nhân hoá của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5 text-xs leading-relaxed">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/70 border border-border/80">
              <span className="font-medium text-foreground">Điểm nghẽn cần tháo gỡ nhất:</span>
              <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary bg-background">
                {primaryBottleneck?.skillId} ({Math.round((primaryBottleneck?.mastery || 0) * 100)}%)
              </Badge>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-muted-foreground font-medium">Mục tiêu đàm thoại:</span>
              <div className="flex flex-wrap gap-1.5">
                {state.goals.map((g) => (
                  <Badge key={g.id} variant="secondary" className="rounded-lg text-xs font-normal border border-border/60">
                    {g.id}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-muted-foreground">
              <span>Độ dài buổi học tối ưu:</span>
              <span className="font-mono font-bold text-foreground">
                {state.preferences.preferredSessionLength || 10} phút
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Weakest Skills for Targeted Practice */}
        <Card className="rounded-3xl border border-border/80 bg-card paper-shadow-sm">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-serif font-bold flex items-center gap-2.5 text-foreground">
              <Target className="size-4.5 text-primary" />
              <span>5 Kỹ năng cần củng cố nhất</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Mức độ thành thục (Mastery 0-100%) và xu hướng
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            {state.skills
              .slice()
              .sort((a, b) => a.mastery - b.mastery)
              .slice(0, 5)
              .map((s) => {
                const percent = Math.round(s.mastery * 100);
                return (
                  <div key={s.skillId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{s.skillId}</span>
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

