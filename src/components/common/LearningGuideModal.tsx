"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import {
  Compass,
  Sparkles,
  Radio,
  Layers,
  Target,
  LifeBuoy,
  Mic,
  MessageSquareText,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Brain,
  ShieldCheck,
  X,
} from "lucide-react";

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type GuideTab = "steps" | "routine" | "science";

interface LevelStep {
  level: string;
  badge: string;
  title: string;
  subtitle: string;
  isCurrentFocus?: boolean;
  isCompleted?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  whyThisNow: string;
  keySkills: string[];
  studios: {
    name: string;
    href: string;
    desc: string;
    isPrimary?: boolean;
  }[];
}

const LEVEL_STEPS: LevelStep[] = [
  {
    level: "Level 0",
    badge: "Âm thanh & Nhại âm",
    title: "Khởi Động Cơ Miệng & Ngữ Điệu",
    subtitle: "Corodomo Shadowing — Rèn tai nghe, nối âm và ngữ điệu tự nhiên",
    isCompleted: true,
    icon: Radio,
    whyThisNow:
      "Rèn luyện tai nghe và cơ miệng, giúp làm quen với ngữ điệu, nối âm và nhịp điệu tự nhiên trước khi bắt đầu nói.",
    keySkills: [
      "Làm mềm cơ miệng, giảm ma sát phát âm (Articulator)",
      "Ngấm trọng âm câu và ngữ điệu bản xứ vào tiềm thức",
      "Nối âm (linking) và biến đổi tốc độ 0.75x - 1.25x",
    ],
    studios: [
      {
        name: "Corodomo Shadowing",
        href: "/shadowing",
        desc: "Nhại âm song song đa tốc độ, bắt chước phát âm bản xứ",
        isPrimary: false,
      },
    ],
  },
  {
    level: "Level 1",
    badge: "Tạo câu & Phản xạ Chunks",
    title: "Tự Chủ Tạo Câu & Khử Dịch Nhẩm",
    subtitle: "Sentence Builder + VN → EN Speaking — Xếp khung câu và ép tốc độ bật từ",
    icon: Layers,
    whyThisNow:
      "Chuyển từ nhại âm sang tự tạo câu. Luyện ghép câu theo khối đúc sẵn (Chunks) và ép tốc độ bật từ (TTFW < 2s) nhằm loại bỏ thói quen dịch nhẩm từng chữ.",
    keySkills: [
      "Tư duy theo Khung câu 3 tầng: Khung ngữ pháp ➔ Cụm vị ngữ ➔ Mở rộng",
      "Ép phản xạ Time To First Word (TTFW < 2.0s) qua luyện truy xuất ý niệm",
      "Nạp các khối ngôn ngữ (Chunks/Collocations) thay vì dịch rời rạc",
    ],
    studios: [
      {
        name: "Sentence Builder",
        href: "/sentence-builder",
        desc: "Ráp câu 3 tầng theo chủ đề, nói câu dài không sai ngữ pháp",
        isPrimary: true,
      },
      {
        name: "VN → EN Speaking",
        href: "/vn-to-en",
        desc: "Thấy ý niệm tiếng Việt ➔ Bật tiếng Anh ngay, khử dịch nhẩm",
        isPrimary: true,
      },
      {
        name: "Chunks & Collocations",
        href: "/chunks",
        desc: "12 loại khối ngôn ngữ tự nhiên như người bản xứ",
        isPrimary: false,
      },
      {
        name: "Spoken Vocabulary Gym",
        href: "/vocabulary",
        desc: "Biến từ vựng thụ động thành từ vựng nói chủ động",
        isPrimary: false,
      },
    ],
  },
  {
    level: "Level 1.5",
    badge: "Giao tiếp ứng biến",
    title: "Bộ Công Cụ Sinh Tồn Khi Bí Từ",
    subtitle: "Survival Speaking — Câu cứu sinh thoát kẹt và giữ nhịp hội thoại liên tục",
    icon: LifeBuoy,
    whyThisNow:
      "Trang bị các mẫu câu đệm và phương án diễn đạt thay thế khi quên từ, giúp duy trì nhịp trò chuyện tự nhiên và tự tin.",
    keySkills: [
      "Kéo dài thời gian suy nghĩ (Buying time): 'What I mean is...', 'How can I put it...'",
      "Kỹ thuật diễn giải thay thế (Paraphrasing) khi quên danh từ cụ thể",
      "Tự sửa câu vấp (Self-Correction) mượt mà không làm gãy mạch nói",
    ],
    studios: [
      {
        name: "Survival Speaking",
        href: "/survival",
        desc: "20+ mẫu câu cứu sinh khi bí từ, giữ tự tin tuyệt đối",
        isPrimary: true,
      },
      {
        name: "Repair Lab",
        href: "/retry-lab",
        desc: "Tập sửa lỗi tức thì qua vòng lặp Retry thông minh",
        isPrimary: false,
      },
    ],
  },
  {
    level: "Level 2",
    badge: "Hội thoại 2 chiều",
    title: "Phòng Luyện Live & Hội Thoại Nhập Vai",
    subtitle: "Đàm thoại tự do thời gian thực với AI thông minh qua nhận diện giọng nói VAD",
    icon: Mic,
    whyThisNow:
      "Thực chiến giao tiếp 2 chiều với AI. Trò chuyện thời gian thực qua nhận diện giọng nói VAD và nhập vai vào các tình huống thực tế.",
    keySkills: [
      "Nghe hiểu và đối đáp hai chiều không có kịch bản định trước",
      "Thực chiến 11+ tình huống: Phỏng vấn công việc, du lịch, thương lượng, công sở",
      "Rèn độ phản hồi tự nhiên, làm chủ nhịp điệu cuộc trò chuyện",
    ],
    studios: [
      {
        name: "Phòng Luyện Nói Live",
        href: "/session",
        desc: "Trò chuyện giọng nói tự do cùng AI qua VAD ngắt câu thông minh",
        isPrimary: true,
      },
      {
        name: "Hội Thoại AI Nhập Vai",
        href: "/conversation",
        desc: "11+ kịch bản nhập vai thực tế có đánh giá chi tiết",
        isPrimary: true,
      },
    ],
  },
  {
    level: "Level 3",
    badge: "Lập luận & Diễn thuyết",
    title: "Thử Thách Nâng Cao (Advanced Tracks)",
    subtitle: "Lập luận Toulmin, phản biện tranh luận và diễn thuyết công chúng",
    icon: Zap,
    whyThisNow:
      "Rèn luyện cấu trúc lập luận Toulmin (Luận điểm ➔ Bằng chứng ➔ Luận cứ), phản xạ tranh biện và diễn thuyết độc lập.",
    keySkills: [
      "Cấu trúc lập luận Toulmin (Claim - Data - Warrant)",
      "Phản xạ đối đáp phản biện tốc độ cao (Rapid Retort Track)",
      "Độc thoại diễn thuyết mở rộng từ 60 - 120 giây liên tục",
    ],
    studios: [
      {
        name: "Thử Thách Nâng Cao",
        href: "/advanced",
        desc: "3 Tracks × 3 Levels thử thách lập luận và diễn thuyết đỉnh cao",
        isPrimary: true,
      },
    ],
  },
];

export function LearningGuideModal({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props = {}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<GuideTab>("steps");

  const storeOpen = useUiStore((s) => s.isLearningGuideOpen);
  const setStoreOpen = useUiStore((s) => s.setLearningGuideOpen);

  const isOpen = controlledOpen !== undefined ? controlledOpen : storeOpen;
  const handleOpenChange = (open: boolean) => {
    if (controlledOnOpenChange) controlledOnOpenChange(open);
    setStoreOpen(open);
  };

  const handleNavigate = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl sm:max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-3xl border border-border/80 shadow-2xl bg-card z-[100]"
      >
        {/* Modal Header */}
        <DialogHeader className="shrink-0 p-4 sm:p-5 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
                <Compass className="size-4.5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-serif font-bold text-foreground truncate">
                  Hướng Dẫn Lộ Trình Học Nói
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  Từ nhại âm cơ miệng đến tự chủ tạo câu, khử dịch nhẩm và đối thoại thực chiến
                </DialogDescription>
              </div>
            </div>

            {/* Custom Close Button */}
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="size-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer shrink-0"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/40 overflow-x-auto text-xs">
            <Button
              size="sm"
              variant={activeTab === "steps" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("steps")}
              className="rounded-xl h-8 text-xs font-semibold px-3 gap-1.5 shrink-0"
            >
              <Layers className="size-3.5 text-primary" />
              <span>Bậc Thang Lộ Trình</span>
            </Button>

            <Button
              size="sm"
              variant={activeTab === "routine" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("routine")}
              className="rounded-xl h-8 text-xs font-semibold px-3 gap-1.5 shrink-0"
            >
              <Clock className="size-3.5 text-primary" />
              <span>Công Thức 20 Phút/Ngày</span>
            </Button>

            <Button
              size="sm"
              variant={activeTab === "science" ? "secondary" : "ghost"}
              onClick={() => setActiveTab("science")}
              className="rounded-xl h-8 text-xs font-semibold px-3 gap-1.5 shrink-0"
            >
              <Brain className="size-3.5 text-primary" />
              <span>Cơ Sở Khoa Học</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ──────────────── TAB 1: BẬC THANG LỘ TRÌNH ──────────────── */}
          {activeTab === "steps" && (
            <div className="space-y-3">
              {/* Steps List */}
              <div className="space-y-3">
                {LEVEL_STEPS.map((step) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.level}
                      className="rounded-2xl border border-border/70 bg-card p-4 transition-all space-y-3 hover:border-border"
                    >
                      {/* Header of Step Card */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-xl flex items-center justify-center border shrink-0 bg-muted/40 border-border/60 text-muted-foreground">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-muted-foreground uppercase">
                                {step.level}
                              </span>
                              <h3 className="font-serif font-bold text-sm text-foreground truncate">
                                {step.title}
                              </h3>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{step.subtitle}</p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono shrink-0 border-border/70 text-muted-foreground"
                        >
                          {step.badge}
                        </Badge>
                      </div>

                      {/* Explanation */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Mục tiêu: </strong>
                        {step.whyThisNow}
                      </p>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40">
                        {step.studios.map((st) => (
                          <button
                            key={st.href}
                            type="button"
                            onClick={() => handleNavigate(st.href)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer group text-xs",
                              st.isPrimary
                                ? "bg-primary/5 border-primary/20 hover:bg-primary/10 text-foreground font-semibold"
                                : "bg-card border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {st.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {st.desc}
                              </div>
                            </div>
                            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ──────────────── TAB 2: CÔNG THỨC 20 PHÚT ──────────────── */}
          {activeTab === "routine" && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm">
                  <Flame className="size-4" />
                  <span>Lịch Trình 20 Phút Mỗi Ngày</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Thiết kế theo nguyên tắc <strong>The Four Strands</strong> (GS. Paul Nation), chia nhỏ thành các chặng ngắn giúp não tiếp thu tự nhiên mà không bị quá tải.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* Block 1 */}
                <div className="rounded-2xl border border-border/80 bg-card p-3.5 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-mono">
                      0 - 5 Phút
                    </Badge>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-foreground">
                      1. Khởi động
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Nói theo 1-2 đoạn ngắn ở <strong>Shadowing</strong> để làm mềm cơ miệng và kích hoạt ngữ điệu.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNavigate("/shadowing")}
                    className="w-full h-8 text-xs border-border/80 hover:bg-secondary rounded-xl cursor-pointer"
                  >
                    Vào Shadowing
                  </Button>
                </div>

                {/* Block 2 */}
                <div className="rounded-2xl border border-border/80 bg-card p-3.5 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-mono">
                      5 - 15 Phút
                    </Badge>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-foreground">
                      2. Ráp câu phản xạ
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Vào <strong>Sentence Builder</strong> chọn 1 chủ đề quen thuộc để tự ráp 5 - 8 câu hoàn chỉnh.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNavigate("/sentence-builder")}
                    className="w-full h-8 text-xs border-border/80 hover:bg-secondary rounded-xl cursor-pointer"
                  >
                    Vào Sentence Builder
                  </Button>
                </div>

                {/* Block 3 */}
                <div className="rounded-2xl border border-border/80 bg-card p-3.5 flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-mono">
                      15 - 20 Phút
                    </Badge>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-foreground">
                      3. Ép tốc độ bật từ
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Vào <strong>VN → EN Speaking</strong> hoặc <strong>Survival</strong> bật câu trong dưới 2 giây.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleNavigate("/vn-to-en")}
                    className="w-full h-8 text-xs border-border/80 hover:bg-secondary rounded-xl cursor-pointer"
                  >
                    Vào VN → EN Speaking
                  </Button>
                </div>
              </div>

              {/* Tip */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>Lưu ý về nhịp độ:</span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Bạn có thể linh hoạt phân bổ và lựa chọn phòng học tùy theo nhu cầu và quỹ thời gian cá nhân của mình.
                </p>
              </div>
            </div>
          )}

          {/* ──────────────── TAB 3: CƠ SỞ KHOA HỌC ──────────────── */}
          {activeTab === "science" && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm">
                  <Brain className="size-4" />
                  <span>Tại Sao Lộ Trình Này Được Chứng Minh Là Tối Ưu?</span>
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Hệ thống kết nối các nghiên cứu hàng đầu về Khoa học Tiếp nhận Ngôn ngữ thứ hai (SLA):
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl border border-border/70 bg-card space-y-1">
                  <div className="font-bold text-foreground text-xs flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span>Mô hình Willem Levelt (1989)</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Nói gồm 3 trạm: <em>Ý định</em> ➔ <em>Mã hóa ngữ pháp (Formulator)</em> ➔ <em>Cơ miệng (Articulator)</em>. Shadowing chỉ rèn trạm số 3; Level 1 là giàn giáo rèn trạm số 2.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/70 bg-card space-y-1">
                  <div className="font-bold text-foreground text-xs flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span>Thuyết Khối Từ (Michael Lewis, 1993)</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Người bản xứ nói theo cụm khối đúc sẵn (Chunks), không ráp từng chữ lẻ. Giúp giải phóng 60% năng lượng bộ nhớ làm việc.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/70 bg-card space-y-1">
                  <div className="font-bold text-foreground text-xs flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span>Năng lực Chiến lược (Canale & Swain, 1980)</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Survival Speaking cung cấp câu đệm, kỹ thuật diễn đạt thay thế (Paraphrase) giúp bạn duy trì nhịp trò chuyện và không bao giờ hoảng sợ khi quên từ.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/70 bg-card space-y-1">
                  <div className="font-bold text-foreground text-xs flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    <span>Thuyết Tương Tác (Michael Long, 1996)</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Phòng Luyện Live và Hội thoại AI nhập vai kích hoạt phản xạ trao đổi ý nghĩa hai chiều, biến kiến thức thành kỹ năng phản xạ tự nhiên.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-3 sm:p-4 px-5 border-t border-border/60 bg-muted/10 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="rounded-xl h-8 px-4 text-xs text-foreground hover:bg-secondary cursor-pointer"
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
