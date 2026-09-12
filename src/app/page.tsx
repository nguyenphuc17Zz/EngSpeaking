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
  ArrowRight,
  Target,
  ShieldCheck,
  Quote,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const modules = [
    {
      title: "Lộ trình AI cá nhân",
      desc: "Kế hoạch 10 phút tự động theo điểm nghẽn của bạn hôm nay",
      href: "/curriculum",
      icon: GraduationCap,
      badge: "Đề xuất",
      btnText: "Học ngay",
    },
    {
      title: "Phòng luyện nói Live",
      desc: "Vòng lặp khẩu ngữ tự do thời gian thực cùng gia sư AI",
      href: "/session",
      icon: Mic,
      badge: "Voice Loop",
      btnText: "Bắt đầu nói",
    },
    {
      title: "Nền tảng & Speaking Drills",
      desc: "22 bài tập: Từ vựng → Chunk → Cụm từ → Khẩu ngữ hoàn chỉnh",
      href: "/foundation",
      icon: Layers,
      badge: "22 Drills",
      btnText: "Luyện Drill",
    },
    {
      title: "Hội thoại AI nhập vai",
      desc: "14 kịch bản thực tế: Du lịch, công sở, phỏng vấn, tranh luận",
      href: "/conversation",
      icon: MessageSquareText,
      badge: "14 Scenarios",
      btnText: "Chọn kịch bản",
    },
    {
      title: "Chẩn đoán phản xạ 8 chiều",
      desc: "Tìm điểm nghẽn truy xuất từ, phát âm và lỗi lặp thói quen",
      href: "/diagnostics",
      icon: Activity,
      badge: "Chẩn đoán",
      btnText: "Xem phân tích",
    },
    {
      title: "Thử thách nâng cao",
      desc: "25 module luyện phản xạ dưới áp lực, phản biện & đàm phán",
      href: "/advanced",
      icon: Zap,
      badge: "25 Modules",
      btnText: "Vào thử thách",
    },
    {
      title: "Tiến độ & Cột mốc",
      desc: "Biểu đồ xu hướng, báo cáo 7/30/90 ngày và Speaking Journey",
      href: "/progress",
      icon: TrendingUp,
      badge: "Hành trình",
      btnText: "Xem tiến độ",
    },
    {
      title: "Cài đặt & Âm thanh",
      desc: "Tùy chỉnh AI Provider (Gemini / Groq / Browser), Giọng đọc & Micro",
      href: "/settings",
      icon: Settings,
      badge: "Cấu hình",
      btnText: "Mở cài đặt",
    },
  ];

  return (
    <div className="space-y-7 pb-12">
      {/* Hero Welcome & Daily Commitment */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 md:p-8 paper-shadow">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-secondary border border-border/60 text-foreground/80 text-xs font-medium">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span>Khẩu Ngữ Tự Nhiên • The Art of Spoken Fluency</span>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold tracking-tight text-foreground leading-snug">
              Chào buổi sáng! Mục tiêu hôm nay: 10 phút luyện phản xạ nói
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tập trung vào <strong>speaking production & automaticity</strong> — rèn luyện bản năng bật ra câu nói tức thì mà không cần dịch nhẩm tiếng Việt trong đầu.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Link href="/curriculum" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 font-semibold h-11 px-6 rounded-xl btn-spring shadow-xs">
                <span>Bắt đầu 10' ngay</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/session" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2 h-11 px-5 rounded-xl border-border/80 hover:bg-secondary/70 btn-spring">
                <Mic className="size-4 text-primary" />
                <span>Phòng luyện Live</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Ambient subtle warm glow */}
        <div className="absolute -right-16 -bottom-16 size-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      </section>

      {/* Daily Speaking Wisdom Banner (Friendly Micro-interaction) */}
      <div className="rounded-2xl border border-border/80 bg-card/90 p-4 md:p-5 paper-shadow-sm paper-shadow-hover flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <Quote className="size-4.5" />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span>Lời khuyên khẩu ngữ hôm nay</span>
              <span className="size-1 rounded-full bg-primary" />
              <span className="text-muted-foreground font-normal lowercase">chìa khóa nhịp điệu</span>
            </div>
            <p className="font-serif italic text-sm md:text-[15px] text-foreground leading-snug">
              &ldquo;Fluency is not about speaking fast without pauses; it&rsquo;s about feeling relaxed in your natural rhythm.&rdquo;
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 Thả lỏng cơ hàm, chia câu thành các khối cụm từ (chunks) tự nhiên thay vì ghép từng từ rời rạc.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Link href="/session">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 border-border/80 hover:bg-secondary/80 h-9 btn-spring shadow-2xs"
            >
              <Mic className="size-3.5 text-primary" />
              <span>Nói thử câu này</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Bento Grid: Speaking Performance & Streak */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="rounded-2xl border-border/80 bg-card paper-shadow-sm paper-shadow-hover">
          <CardContent className="p-4 md:p-5 flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Flame className="size-5 fill-primary/20 animate-cozy-flame" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-serif font-bold tracking-tight text-foreground">3 ngày</div>
              <div className="text-xs text-muted-foreground mt-0.5">Chuỗi rèn luyện</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card paper-shadow-sm paper-shadow-hover">
          <CardContent className="p-4 md:p-5 flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-secondary text-foreground/80 flex items-center justify-center shrink-0 border border-border/60">
              <Clock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-serif font-bold tracking-tight text-foreground">25 phút</div>
              <div className="text-xs text-muted-foreground mt-0.5">Đã nói tuần này</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card paper-shadow-sm paper-shadow-hover">
          <CardContent className="p-4 md:p-5 flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-chart-2/10 text-chart-2 flex items-center justify-center shrink-0 border border-chart-2/20">
              <Zap className="size-5" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-serif font-bold tracking-tight text-foreground">1.6s</div>
              <div className="text-xs text-muted-foreground mt-0.5">Tốc độ bật từ (TTFW)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card paper-shadow-sm paper-shadow-hover">
          <CardContent className="p-4 md:p-5 flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-secondary text-foreground/80 flex items-center justify-center shrink-0 border border-border/60">
              <Target className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-serif font-bold tracking-tight text-foreground">Level 4</div>
              <div className="text-xs text-muted-foreground mt-0.5">Khả năng độc lập</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 8 Study Disciplines Grid (Warm Editorial Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-serif font-bold tracking-tight text-foreground">
              Chuyên đề Luyện tập & Phản xạ
            </h2>
            <p className="text-xs text-muted-foreground">
              8 phương pháp khẩu ngữ chuyên sâu nâng tầm phản xạ tự nhiên
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground hidden sm:inline-block">
            8 Disciplines
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card
                key={m.href}
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card hover:border-primary/50 paper-shadow-sm paper-shadow-hover flex flex-col justify-between"
              >
                <div className="p-4 pb-0 flex items-center justify-between">
                  <div className="size-9 rounded-xl bg-secondary flex items-center justify-center border border-border/60 group-hover:scale-105 transition-transform">
                    <Icon className="size-4.5 text-primary" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium border-border/80 text-muted-foreground"
                  >
                    {m.badge}
                  </Badge>
                </div>

                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                    {m.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                    {m.desc}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  <Link href={m.href} className="block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all rounded-xl h-8.5"
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

      {/* Assurance Note & Privacy */}
      <Card className="rounded-2xl border border-border/70 bg-card/70 paper-shadow-sm">
        <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-xl bg-chart-2/10 text-chart-2 flex items-center justify-center shrink-0 border border-chart-2/20">
              <ShieldCheck className="size-4" />
            </div>
            <div className="leading-relaxed">
              <span className="font-semibold text-foreground">Bảo mật giọng nói & Tối ưu trình duyệt:</span>{" "}
              Mặc định sử dụng Web Speech API và SpeechSynthesis trên trình duyệt (hoàn toàn miễn phí, không tốn quota). Không lưu trữ file âm thanh thô.
            </div>
          </div>
          <Link href="/settings" className="shrink-0">
            <Button variant="outline" size="sm" className="text-xs rounded-xl h-8 border-border/80 hover:bg-secondary">
              Cài đặt Provider
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
