"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Target,
  Clock,
  Sparkles,
  Play,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Zap,
  TrendingUp,
  Brain,
  RotateCcw,
  Video,
  ShieldAlert,
  BookOpen,
} from "lucide-react";
import { getFoundationProfile, getSkillProgress } from "@/lib/foundation/services/progress.service";
import type { FoundationProfile } from "@/types/foundation";
import { SKILL_TAXONOMY } from "@/lib/foundation/skills/taxonomy";

export default function FoundationOverview() {
  const [profile, setProfile] = useState<FoundationProfile | null>(null);
  const [todayHint, setTodayHint] = useState<string>("");

  useEffect(() => {
    const p = getFoundationProfile();
    setProfile(p);
    const entries: Array<[string, number]> = [
      ["sentenceRetrieval", p.sentenceRetrieval],
      ["responseSpeed", p.responseSpeed],
      ["fluency", p.fluency],
      ["expansionAbility", p.expansionAbility],
      ["recoveryAbility", p.recoveryAbility],
    ];
    entries.sort((a, b) => a[1] - b[1]);
    const weakest = entries[0];
    const skillNameMap: Record<string, string> = {
      sentenceRetrieval: "Khôi phục câu tức thì",
      responseSpeed: "Tốc độ phản xạ",
      fluency: "Độ trôi chảy",
      expansionAbility: "Mở rộng ý câu",
      recoveryAbility: "Khả năng tự sửa lỗi",
    };
    setTodayHint(
      `Tiêu điểm hôm nay: ${skillNameMap[weakest[0]] || weakest[0]} (${weakest[1]}/100) — hãy bắt đầu với bài tập phản xạ tương ứng`
    );
  }, []);

  if (!profile) return <p className="text-sm text-muted-foreground">Đang tải hồ sơ...</p>;

  const levelSteps = [
    { lvl: "0", title: "Listen", desc: "Nghe hiểu" },
    { lvl: "1", title: "Repeat", desc: "Lặp lại" },
    { lvl: "2", title: "Substitute", desc: "Thay thế từ" },
    { lvl: "3", title: "Sentence", desc: "Tạo câu" },
    { lvl: "4", title: "One-Sent", desc: "1 câu trọn" },
    { lvl: "5", title: "Expand", desc: "Mở rộng ý" },
    { lvl: "6", title: "Control", desc: "Kiểm soát" },
    { lvl: "7", title: "Timed", desc: "Áp lực giờ" },
    { lvl: "8", title: "Rapid", desc: "Phản xạ nhanh" },
    { lvl: "9", title: "Follow-up", desc: "Hỏi đáp" },
    { lvl: "10", title: "Monologue", desc: "Nói độc thoại" },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Hero Today Recommendation Card */}
      <Card className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background shadow-xs overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>Foundation Drill System</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Luyện phản xạ nền tảng (22 bài tập)
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{todayHint}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            <Link href="/foundation/practice?mode=daily" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 font-semibold shadow-md shadow-primary/25 rounded-2xl h-11 px-5">
                <Clock className="size-4" />
                <span>Daily 10' Drill</span>
              </Button>
            </Link>
            <Link href="/foundation/practice" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full gap-2 rounded-2xl h-11 px-4">
                <Play className="size-4" />
                <span>Luyện tự do</span>
              </Button>
            </Link>
            <Link href="/foundation/baseline" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 rounded-2xl h-11 px-4">
                <Target className="size-4" />
                <span>Kiểm tra Baseline</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Featured Core Systems Grid: SB, VN -> EN, Repair Lab, Response Latency, Error Bank & Shadowing */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sentence Builder Spotlight Card */}
        <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/10 shadow-sm p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
                <Sparkles className="size-5" />
              </div>
              <Badge className="text-[10px] font-mono font-bold bg-primary text-primary-foreground">
                Func 1
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Sentence Builder
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Khôi phục phản xạ tạo câu có kiểm soát (Level A $\rightarrow$ B $\rightarrow$ C).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Khôi phục: </span>
              <span className="font-mono font-bold text-primary">{profile.sentenceRetrieval}/100</span>
            </div>

            <Link href="/foundation/sentence-builder">
              <Button size="sm" className="rounded-xl font-bold text-xs gap-1 shadow-sm btn-spring h-8 px-3">
                <span>Vào luyện</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Vietnamese -> English Speaking Spotlight Card */}
        <Card className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-500/10 shadow-sm p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Target className="size-5" />
              </div>
              <Badge className="text-[10px] font-mono font-bold bg-emerald-600 text-white">
                Func 2
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                VN → EN Speaking
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Truy xuất trực tiếp từ ý niệm tiếng Việt sang câu nói tiếng Anh.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Tốc độ: </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{profile.responseSpeed}/100</span>
            </div>

            <Link href="/foundation/vn-to-en">
              <Button size="sm" className="rounded-xl font-bold text-xs gap-1 shadow-sm btn-spring h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white">
                <span>Vào luyện</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Spoken Repair Lab Spotlight Card */}
        <Card className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/10 shadow-sm p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <RotateCcw className="size-5" />
              </div>
              <Badge className="text-[10px] font-mono font-bold bg-amber-600 text-white">
                Func 3
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Repair Lab
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chu trình Correct $\rightarrow$ Say Again: Sửa lỗi thực tế từ Error Bank.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Phục hồi: </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">92%</span>
            </div>

            <Link href="/foundation/retry-lab">
              <Button size="sm" className="rounded-xl font-bold text-xs gap-1 shadow-sm btn-spring h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white">
                <span>Sửa lỗi</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Response Latency Training Spotlight Card */}
        <Card className="rounded-3xl border-2 border-orange-500/40 bg-gradient-to-br from-card via-card to-orange-500/10 shadow-sm p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                <Zap className="size-5 fill-current" />
              </div>
              <Badge className="text-[10px] font-mono font-bold bg-orange-600 text-white">
                Func 4
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Speed Gym
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rèn luyện tốc độ phản xạ và loại bỏ độ trễ đóng băng khi nói.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Phản xạ: </span>
              <span className="font-mono font-bold text-orange-600 dark:text-orange-400">2.4s</span>
            </div>

            <Link href="/foundation/latency">
              <Button size="sm" className="rounded-xl font-bold text-xs gap-1 shadow-sm btn-spring h-8 px-3 bg-orange-600 hover:bg-orange-700 text-white">
                <span>Tăng tốc</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Personal Error Bank Spotlight Card */}
        <Card className="rounded-3xl border-2 border-indigo-500/40 bg-gradient-to-br from-card via-card to-indigo-500/10 shadow-sm p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Brain className="size-5" />
              </div>
              <Badge className="text-[10px] font-mono font-bold bg-indigo-600 text-white">
                Func 5
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Error Bank
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bộ nhớ học tập dài hạn phân tích mẫu lỗi và ôn tập ngắt quãng.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Bộ nhớ: </span>
              <span className="font-mono font-bold text-indigo-500">Longitudinal</span>
            </div>

            <Link href="/foundation/error-bank">
              <Button size="sm" className="rounded-xl font-bold text-xs gap-1 shadow-sm btn-spring h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white">
                <span>Xem kho lỗi</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Chunk Automaticity Studio Spotlight Card */}
        <Card className="rounded-3xl border-2 border-purple-500/40 bg-gradient-to-br from-card via-card to-purple-500/10 shadow-sm p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Layers className="size-5" />
              </div>
              <Badge className="text-[10px] font-mono font-bold bg-purple-600 text-white">
                Func 6
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Chunk Studio
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Lắp ráp câu khẩu ngữ từ các khối có sẵn (Speech Chain Builder).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Khối câu: </span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">Automatic</span>
            </div>

            <Link href="/foundation/chunks">
              <Button size="sm" className="rounded-xl font-bold text-xs gap-1 shadow-sm btn-spring h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white">
                <span>Ghép khối</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Survival Speaking Studio Spotlight Card */}
        <Card className="rounded-3xl border-2 border-rose-500/40 bg-gradient-to-br from-card via-card to-rose-500/10 shadow-sm p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <ShieldAlert className="size-5" />
              </div>
              <Badge className="text-[10px] font-mono font-bold bg-rose-600 text-white">
                Func 7
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Survival Speaking
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Diễn giải vòng khi quên từ & xử lý sự cố giao tiếp thực tế.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Phản xạ: </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">Survival</span>
            </div>

            <Link href="/foundation/survival">
              <Button size="sm" className="rounded-xl font-bold text-xs gap-1 shadow-sm btn-spring h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white">
                <span>Vào ứng biến</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Spoken Vocabulary Studio Spotlight Card */}
        <Card className="rounded-3xl border-2 border-teal-500/40 bg-gradient-to-br from-card via-card to-teal-500/10 shadow-sm p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <BookOpen className="size-5" />
              </div>
              <Badge className="text-[10px] font-mono font-bold bg-teal-600 text-white">
                Func 8
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Spoken Vocabulary
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quy trình 2 bước: Phát âm từ đơn $\rightarrow$ Đọc câu trong ngữ cảnh.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Từ vựng: </span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">In Context</span>
            </div>

            <Link href="/foundation/vocabulary">
              <Button size="sm" className="rounded-xl font-bold text-xs gap-1 shadow-sm btn-spring h-8 px-3 bg-teal-600 hover:bg-teal-700 text-white">
                <span>Học từ vựng</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Shadowing Studio Spotlight Card */}
        <Card className="rounded-3xl border border-border/80 bg-card hover:border-indigo-500/40 transition-all p-5 space-y-3.5 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Video className="size-5" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                Studio
              </Badge>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-foreground">
                Shadowing Studio
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Luyện nhại âm theo nhịp thở Thought Groups và chấm điểm 4-D.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="text-[11px]">
              <span className="text-muted-foreground">Trôi chảy: </span>
              <span className="font-mono font-bold text-indigo-500">{profile.fluency}/100</span>
            </div>

            <Link href="/foundation/shadowing">
              <Button variant="secondary" size="sm" className="rounded-xl font-bold text-xs gap-1 btn-spring h-8 px-3">
                <span>Mở Studio</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Grid: Foundation Profile & Level Progression */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
          <CardHeader className="p-5 pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="size-4 text-primary" />
              <span>Chỉ số sản sinh ngôn ngữ</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Đo lường năng lực phản xạ tiếng Anh tự nhiên (0-100)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            <ProfileRow label="Sản sinh tổng thể (Overall)" v={profile.overallProduction} color="bg-primary" />
            <ProfileRow label="Phản xạ gọi câu (Retrieval)" v={profile.sentenceRetrieval} color="bg-indigo-500" />
            <ProfileRow label="Tốc độ phản xạ (Response Speed)" v={profile.responseSpeed} color="bg-emerald-500" />
            <ProfileRow label="Độ trôi chảy (Fluency)" v={profile.fluency} color="bg-blue-500" />
            <ProfileRow label="Độ tự tin (Confidence)" v={profile.confidence} color="bg-amber-500" />
            <ProfileRow label="Mở rộng câu (Expansion)" v={profile.expansionAbility} color="bg-purple-500" />
            <ProfileRow label="Tự sửa lỗi (Recovery)" v={profile.recoveryAbility} color="bg-teal-500" />

            <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground flex items-center justify-between">
              <span>Độ phụ thuộc dịch nhẩm (Translation):</span>
              <Badge variant="outline" className="font-mono text-xs">
                {profile.translationDependency}/100 (càng thấp càng tốt)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Level Progression 0 -> 10 */}
        <Card className="rounded-3xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <span>Lộ trình bậc thang Level 0 → 10</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Không cần học tuyến tính — AI tự động đề xuất level theo năng lực
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {levelSteps.map((step) => (
                <div
                  key={step.lvl}
                  className="p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-primary/5 transition-colors flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-primary">L{step.lvl}</span>
                    <span className="text-xs font-semibold text-foreground truncate">{step.title}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">{step.desc}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border/40 space-y-2">
              <span className="text-xs font-semibold text-foreground block">Các kỹ năng cốt lõi:</span>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_TAXONOMY.slice(0, 10).map((s) => (
                  <Badge key={s.skill} variant="secondary" className="text-[11px] rounded-lg">
                    {s.labelVi}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Progress Grid */}
      <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <span>Tiến trình kỹ năng thực tế</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Dữ liệu tích luỹ từ các lượt luyện tập và đánh giá của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {SKILL_TAXONOMY.slice(0, 9).map((s) => {
            const { value } = getSkillProgress(s.skill);
            return (
              <div key={s.skill} className="p-3 rounded-2xl bg-muted/20 border border-border/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground truncate">{s.labelVi}</span>
                  <span className="font-mono text-muted-foreground font-bold">{value}%</span>
                </div>
                <Progress value={value} className="h-2 rounded-full" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileRow({ label, v, color }: { label: string; v: number; color?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold text-foreground">{v}/100</span>
      </div>
      <Progress value={v} className="h-2 rounded-full" />
    </div>
  );
}
