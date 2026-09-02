import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  GraduationCap,
  Layers,
  MessageSquareText,
  Activity,
  Zap,
  TrendingUp,
  Settings,
  Flame,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  Volume2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export default function Home() {
  const modules = [
    {
      title: "Lộ trình AI hôm nay",
      desc: "Kế hoạch 10 phút tự động theo điểm nghẽn của bạn",
      href: "/curriculum",
      icon: GraduationCap,
      badge: "Đề xuất",
      color: "from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/20 text-blue-600 dark:text-blue-400",
      btnText: "Học ngay",
    },
    {
      title: "Phòng luyện nói Live",
      desc: "Vòng lặp nói tự do thời gian thực cùng trợ lý AI",
      href: "/session",
      icon: Mic,
      badge: "Voice Loop",
      color: "from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      btnText: "Bắt đầu nói",
    },
    {
      title: "Luyện nền tảng & Drills",
      desc: "22 dạng bài tập: Word → Chunk → Phrase → Sentence",
      href: "/foundation",
      icon: Layers,
      badge: "22 Bài tập",
      color: "from-purple-500/10 via-violet-500/5 to-transparent border-purple-500/20 text-purple-600 dark:text-purple-400",
      btnText: "Luyện Drill",
    },
    {
      title: "Hội thoại AI nhập vai",
      desc: "14 kịch bản thực tế: Du lịch, công sở, phỏng vấn, tranh luận",
      href: "/conversation",
      icon: MessageSquareText,
      badge: "14 Scenarios",
      color: "from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20 text-amber-600 dark:text-amber-400",
      btnText: "Chọn kịch bản",
    },
    {
      title: "Chẩn đoán 8 chiều",
      desc: "Tìm điểm nghẽn, thói quen lỗi lặp và gợi ý khắc phục",
      href: "/diagnostics",
      icon: Activity,
      badge: "Analytics",
      color: "from-rose-500/10 via-pink-500/5 to-transparent border-rose-500/20 text-rose-600 dark:text-rose-400",
      btnText: "Xem phân tích",
    },
    {
      title: "Thử thách nâng cao",
      desc: "25 module luyện phản xạ dưới áp lực, phản biện & đàm phán",
      href: "/advanced",
      icon: Zap,
      badge: "25 Modules",
      color: "from-cyan-500/10 via-sky-500/5 to-transparent border-cyan-500/20 text-cyan-600 dark:text-cyan-400",
      btnText: "Vào thử thách",
    },
    {
      title: "Tiến độ & Cột mốc",
      desc: "Biểu đồ xu hướng, báo cáo 7/30/90 ngày và Speaking Journey",
      href: "/progress",
      icon: TrendingUp,
      badge: "Báo cáo",
      color: "from-emerald-500/10 via-green-500/5 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      btnText: "Xem tiến độ",
    },
    {
      title: "Cài đặt & Cấu hình",
      desc: "Tùy chỉnh AI Provider (Gemini / Groq / Browser), Voice & Micro",
      href: "/settings",
      icon: Settings,
      badge: "Tuỳ chọn",
      color: "from-slate-500/10 via-gray-500/5 to-transparent border-slate-500/20 text-slate-600 dark:text-slate-400",
      btnText: "Mở cài đặt",
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Learner Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 md:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>AI Speaking Coach — Luyện Phản Xạ Nói Tự Nhiên</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              Mục tiêu hôm nay: 10 phút luyện phản xạ nói
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tập trung vào <strong>speaking production & automaticity</strong> — biến từ vựng thụ động thành phản xạ bật ra tức thì mà không cần dịch nhẩm trong đầu.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Link href="/curriculum" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 shadow-md shadow-primary/30 font-semibold h-11 px-6 rounded-xl">
                <Sparkles className="size-4" />
                <span>Bắt đầu 10' ngay</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/session" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 h-11 px-5 rounded-xl">
                <Mic className="size-4 text-primary" />
                <span>Nói tự do</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative ambient background orb */}
        <div className="absolute -right-20 -bottom-20 size-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
              <Flame className="size-5 fill-orange-500" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono">3 ngày</div>
              <div className="text-xs text-muted-foreground">Streak liên tiếp</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Clock className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono">25 phút</div>
              <div className="text-xs text-muted-foreground">Đã luyện tuần này</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Zap className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono">1.6s</div>
              <div className="text-xs text-muted-foreground">Tốc độ phản xạ (TTFW)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Target className="size-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-mono">Level 4</div>
              <div className="text-xs text-muted-foreground">Trình độ hiện tại</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 8 Feature Modules Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Các chế độ luyện tập & Phân tích
          </h2>
          <span className="text-xs text-muted-foreground">8 modules AI chuyên sâu</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card
                key={m.href}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div className={`p-4 border-b border-border/40 bg-gradient-to-br ${m.color} flex items-center justify-between`}>
                  <div className="size-9 rounded-xl bg-background/80 backdrop-blur-xs flex items-center justify-center shadow-xs">
                    <Icon className="size-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    {m.badge}
                  </Badge>
                </div>

                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-bold group-hover:text-primary transition-colors">
                    {m.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2 leading-relaxed">
                    {m.desc}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-0">
                  <Link href={m.href} className="block mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl"
                    >
                      <span>{m.btnText}</span>
                      <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Tips & Free-Tier Assurance Banner */}
      <Card className="rounded-2xl border-border/60 bg-muted/30">
        <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground">Tối ưu Free Tier & Bảo mật giọng nói:</span>{" "}
              Mặc định sử dụng Web Speech API và SpeechSynthesis trên trình duyệt (hoàn toàn miễn phí, không tốn quota). Không lưu trữ file âm thanh thô.
            </div>
          </div>
          <Link href="/settings" className="shrink-0">
            <Button variant="outline" size="sm" className="text-xs rounded-xl h-8">
              Cài đặt Provider
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
