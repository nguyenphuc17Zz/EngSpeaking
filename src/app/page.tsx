import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MessageSquareText,
  Zap,
  Settings,
  Flame,
  Clock,
  ArrowRight,
  Target,
  ShieldCheck,
  Sparkles,
  Radio,
  LifeBuoy,
  RotateCcw,
  Brain,
  Layers,
} from "lucide-react";

export default function Home() {
  const foundationStudios = [
    {
      title: "Sentence Builder",
      desc: "Ráp câu phản xạ 3 tầng: Khung ngữ pháp, từ vựng theo chủ đề & âm thanh chuẩn",
      href: "/foundation/sentence-builder",
      icon: Layers,
      badge: "SB Core",
      color: "text-primary bg-primary/10 border-primary/20",
    },
    {
      title: "VN → EN Speaking",
      desc: "Truy xuất trực tiếp từ ý niệm tiếng Việt sang phản xạ tiếng Anh, loại bỏ dịch nhẩm",
      href: "/foundation/vn-to-en",
      icon: Target,
      badge: "Tư duy trực tiếp",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Corodomo Shadowing",
      desc: "Nhại âm song song đa tốc độ, rèn nhịp điệu và ngữ điệu tự nhiên như người bản xứ",
      href: "/foundation/shadowing",
      icon: Radio,
      badge: "Nhại âm nhịp điệu",
      color: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: "Survival Speaking",
      desc: "Phản xạ tức thì khi bí từ, câu cứu sinh thoát kẹt và giữ nhịp trò chuyện liên tục",
      href: "/foundation/survival",
      icon: LifeBuoy,
      badge: "Thoát kẹt bí từ",
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Repair Lab & Latency",
      desc: "Sửa lỗi tức thì qua vòng lặp Retry và ép tốc độ phản xạ bật từ dưới 2 giây",
      href: "/foundation/retry-lab",
      icon: RotateCcw,
      badge: "Sửa lỗi & Tốc độ",
      color: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
    },
  ];

  const immersiveStudios = [
    {
      title: "Phòng Luyện Nói Live",
      desc: "Vòng lặp khẩu ngữ tự do thời gian thực cùng Gia sư AI thông minh có hỗ trợ ngắt câu VAD",
      href: "/session",
      icon: Mic,
      badge: "Real-time AI",
      color: "text-primary bg-primary/10 border-primary/20",
      highlight: true,
    },
    {
      title: "Hội Thoại AI Nhập Vai",
      desc: "11+ kịch bản thực tế đa dạng: Phỏng vấn xin việc, công sở, du lịch, đàm phán và tranh luận",
      href: "/conversation",
      icon: MessageSquareText,
      badge: "11+ Kịch bản",
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      highlight: false,
    },
    {
      title: "Thử Thách Nâng Cao",
      desc: "3 Tracks (Phản xạ · Lập luận Toulmin · Diễn thuyết) × 3 Levels liên thông nền tảng vững chắc",
      href: "/advanced",
      icon: Zap,
      badge: "3 Tracks × 3 Lv",
      color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
      highlight: false,
    },
    {
      title: "Ngân Hàng Lỗi Cá Nhân",
      desc: "Trí nhớ khẩu ngữ FSRS, đo lường xác suất nắm vững BKT và cảnh báo nguy cơ hóa đá L1",
      href: "/foundation/error-bank",
      icon: Brain,
      badge: "FSRS • BKT",
      color: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
      highlight: false,
    },
  ];

  return (
    <div className="w-full max-w-none space-y-4 sm:space-y-5 pb-12 animate-in fade-in-0 duration-200">
      {/* ── 1. WELCOME ACTION BAR (Compact Single Row) ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl px-4 py-3 shadow-xs w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-sm sm:text-base md:text-lg tracking-tight text-foreground truncate">
                Chào ngày mới! Mục tiêu hôm nay: 10 phút luyện phản xạ nói
              </h1>
              <Badge variant="secondary" className="text-[10px] font-mono h-5 hidden lg:inline-flex rounded-full px-2">
                The Art of Spoken Fluency
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate hidden md:block">
              Rèn luyện phản xạ bật câu tức thì — Automaticity & Speaking Production không cần dịch nhẩm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <Link href="/session">
            <Button size="sm" className="h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer">
              <Mic className="size-3.5" />
              <span>Bắt đầu luyện nói ngay</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
          <Link href="/foundation/sentence-builder">
            <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl font-semibold text-xs gap-1.5 border-border/80 hover:bg-secondary cursor-pointer">
              <Layers className="size-3.5 text-primary" />
              <span>Sentence Builder</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 2. BENTO METRICS BAR (Compact 4 KPIs) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 w-full">
        <Card className="rounded-2xl border-border/80 bg-card p-3.5 shadow-xs">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Flame className="size-4.5 fill-primary/20 animate-cozy-flame" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-serif font-bold tracking-tight text-foreground truncate">3 ngày</div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">Chuỗi rèn luyện</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-3.5 shadow-xs">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-secondary text-foreground/80 flex items-center justify-center shrink-0 border border-border/60">
              <Clock className="size-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-serif font-bold tracking-tight text-foreground truncate">25 phút</div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">Đã nói tuần này</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-3.5 shadow-xs">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-chart-2/10 text-chart-2 flex items-center justify-center shrink-0 border border-chart-2/20">
              <Zap className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-serif font-bold tracking-tight text-foreground truncate">1.6s</div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">Tốc độ bật từ (TTFW)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-3.5 shadow-xs">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-secondary text-foreground/80 flex items-center justify-center shrink-0 border border-border/60">
              <Target className="size-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-serif font-bold tracking-tight text-foreground truncate">Level 4</div>
              <div className="text-[11px] text-muted-foreground font-medium truncate">Khả năng độc lập</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. GROUP 1: NỀN TẢNG PHẢN XẠ KHẨU NGỮ (5 PHÒNG CORE) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <h2 className="font-serif font-bold text-sm sm:text-base tracking-tight text-foreground">
              Nền Tảng Phản Xạ Khẩu Ngữ (Foundation Studios)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground bg-secondary/80 px-2.5 py-0.5 rounded-full border border-border/50">
            5 Phòng luyện tập
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {foundationStudios.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="group block focus:outline-hidden">
                <div className="h-full rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs hover:border-primary/50 hover:bg-muted/20 transition-all flex flex-col justify-between gap-2.5 relative cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className={`size-8.5 rounded-xl flex items-center justify-center border ${m.color}`}>
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono border-border/70 text-muted-foreground">
                      {m.badge}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {m.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors border-t border-border/40">
                    <span>Luyện ngay</span>
                    <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 4. GROUP 2: TƯƠNG TÁC & THỬ THÁCH THỰC CHIẾN (4 PHÒNG ADVANCED) ── */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-indigo-500" />
            <h2 className="font-serif font-bold text-sm sm:text-base tracking-tight text-foreground">
              Thực Chiến & Thử Thách (Immersive & Advanced Studios)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground bg-secondary/80 px-2.5 py-0.5 rounded-full border border-border/50">
            4 Phòng thực chiến
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {immersiveStudios.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="group block focus:outline-hidden">
                <div className={`h-full rounded-2xl border bg-card p-3.5 shadow-xs transition-all flex flex-col justify-between gap-3 relative cursor-pointer ${
                  m.highlight
                    ? "border-primary/50 bg-primary/[0.02] hover:border-primary ring-1 ring-primary/20"
                    : "border-border/80 hover:border-primary/50 hover:bg-muted/20"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className={`size-9 rounded-xl flex items-center justify-center border ${m.color}`}>
                      <Icon className="size-4.5" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-mono ${
                      m.highlight ? "border-primary/40 text-primary font-bold" : "border-border/70 text-muted-foreground"
                    }`}>
                      {m.badge}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors border-t border-border/40">
                    <span>Vào phòng</span>
                    <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 5. COMPACT PRIVACY & SETTINGS FOOTER NOTE ── */}
      <div className="rounded-2xl border border-border/70 bg-card/60 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-6.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <ShieldCheck className="size-3.5" />
          </div>
          <span className="truncate">
            <strong className="text-foreground">Bảo mật giọng nói:</strong> Xử lý Web Speech API cục bộ trên trình duyệt, không lưu trữ âm thanh thô.
          </span>
        </div>
        <Link href="/settings" className="shrink-0 self-end sm:self-auto">
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">
            <Settings className="size-3 mr-1" />
            <span>Cài đặt & Âm thanh</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
