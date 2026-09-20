"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Play, Shuffle, Loader2, Zap, Flame, Scale, BookOpen,
  ArrowLeft, Target, Clock, Sparkles, ShieldAlert, AlertTriangle, CheckCircle2, History,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { useSentenceBuilderStore } from "@/stores/sentence-builder-store";
import { useVNToENStore } from "@/stores/vn-to-en-store";
import { useAdvancedStore } from "@/stores/advanced-store";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { TRACK_META, LEVEL_META } from "@/lib/advanced/track-map";
import { checkAdvancedPrerequisite } from "@/lib/advanced/prerequisite.service";
import type { AdvancedLevel, AdvancedSessionMode, AdvancedTrack } from "@/types/advanced";

const TRACK_ICONS: Record<AdvancedTrack, typeof Zap> = {
  reflex: Zap,
  argument: Scale,
  extended: BookOpen,
};

const TRACK_COLORS: Record<AdvancedTrack, string> = {
  reflex: "text-primary bg-primary/10",
  argument: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
  extended: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
};

const LEVELS: AdvancedLevel[] = ["L1", "L2", "L3"];

export default function AdvancedModesPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const sbMastery = useSentenceBuilderStore((s) => s.skillMastery);
  const vnHistory = useVNToENStore((s) => s.sessionHistory);

  const [selectedTrack, setSelectedTrack] = useState<AdvancedTrack>("argument");
  const [selectedLevel, setSelectedLevel] = useState<AdvancedLevel>("L2");
  const [mode, setMode] = useState<AdvancedSessionMode>("endless");
  const [customTopic, setCustomTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const vnAccuracy = useMemo(() => {
    if (!vnHistory.length) return 0;
    const ok = vnHistory.filter((h) => h.evaluation.isSuccessful).length;
    return Math.round((ok / vnHistory.length) * 100);
  }, [vnHistory]);

  const vnIndependentRate = useMemo(() => {
    if (!vnHistory.length) return 0;
    const indep = vnHistory.filter((h) => h.evaluation.hintTierUsed === 0 && h.evaluation.isSuccessful).length;
    return Math.round((indep / vnHistory.length) * 100);
  }, [vnHistory]);

  const prereq = useMemo(
    () =>
      checkAdvancedPrerequisite(selectedLevel, {
        sbMastery: sbMastery.overallMastery,
        sbIndependence: sbMastery.independence,
        vnIndependentRate,
        vnAccuracy,
      }),
    [selectedLevel, sbMastery, vnIndependentRate, vnAccuracy]
  );

  const handleLaunch = async (track = selectedTrack, level = selectedLevel) => {
    setLoading(true);
    try {
      const store = useAdvancedStore.getState();
      store.setTrackLevel(track, level);
      store.setSelectedTopic(customTopic ? "custom" : "random", customTopic);
      await store.initSession({ mode, track, level });
      if (useAdvancedStore.getState().generationError) {
        toast.error("Lỗi tạo thử thách", useAdvancedStore.getState().generationError || "");
        return;
      }
      toast.success("Thử thách đã sẵn sàng!", `${TRACK_META[track].labelVi} · ${level}`);
      router.push(`/advanced/session?track=${track}&level=${level}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRandom = () => {
    const tracks: AdvancedTrack[] = ["reflex", "argument", "extended"];
    const t = tracks[Math.floor(Math.random() * tracks.length)];
    const l = LEVELS[Math.floor(Math.random() * LEVELS.length)];
    setSelectedTrack(t);
    setSelectedLevel(l);
    void handleLaunch(t, l);
  };

  const TOPIC_SUGGESTIONS: Record<AdvancedTrack, string[]> = {
    argument: [
      "Thuyết phục tăng ngân sách AI bảo mật",
      "Phản biện: làm việc từ xa làm giảm sáng tạo kỹ sư",
      "Đàm phán cam kết SLA 99.99% giữ nguyên chi phí",
      "Đầu tư hạ tầng core vs phát triển tính năng mới",
    ],
    reflex: [
      "Xử lý sự cố downtime máy chủ Black Friday",
      "Xoa dịu khách hàng VIP đòi hoàn tiền tức thì",
      "Từ chối khéo deadline bất khả thi của sếp",
      "Cập nhật khẩn cấp cho đối tác khi trễ tiến độ",
    ],
    extended: [
      "Thuyết trình gọi vốn hạt giống nền tảng Logistics AI",
      "Tầm nhìn chuyển đổi số doanh nghiệp 5 năm tới",
      "Chia sẻ bài học xương máu khi dự án thất bại",
      "Chiến lược xây dựng văn hóa kỹ thuật xuất sắc",
    ],
  };

  return (
    <div className="flex flex-col w-full select-none gap-3 sm:gap-3.5 animate-in fade-in-0 duration-200">
      {/* ── TOP TOOLBAR (COMPACT SINGLE ROW) ── */}
      <div className="flex items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl px-3.5 py-2.5 shadow-xs w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
              title="Quay lại Trang chủ"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7.5 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Flame className="size-4" />
            </div>
            <h1 className="font-serif font-bold text-sm sm:text-base tracking-tight text-foreground">
              Thử Thách Nâng Cao
            </h1>
            <Badge variant="secondary" className="text-[10px] font-mono h-5 rounded-full px-2 hidden sm:inline-flex">
              3 Tracks · L1–L3
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground font-mono bg-secondary/80 px-2.5 py-1 rounded-xl border border-border/50 hidden md:inline-flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span>SB Mastery:</span>
              <strong className={cn(sbMastery.overallMastery >= 70 ? "text-emerald-500" : "text-amber-500 font-bold")}>
                {sbMastery.overallMastery}%
              </strong>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span>VN-to-EN Tự chủ:</span>
              <strong className={cn(vnIndependentRate >= 50 ? "text-emerald-500" : "text-amber-500 font-bold")}>
                {vnIndependentRate}%
              </strong>
            </span>
          </span>

          <Link href="/advanced/history">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border/80 hover:bg-muted/50"
            >
              <History className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Lịch sử</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRandom}
            disabled={loading}
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border/80 hover:bg-muted/50"
          >
            <Shuffle className="size-3.5 text-primary" />
            <span>Xáo trộn</span>
          </Button>
        </div>
      </div>

      {/* ── 2-COLUMN FULL-WIDTH GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 w-full items-start">
        {/* CỘT TRÁI (7 COLS): LỘ TRÌNH & CẤP ĐỘ */}
        <div className="lg:col-span-7 space-y-3">
          {/* Card Lựa chọn Track */}
          <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <span className="font-serif font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                <span className="size-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-mono font-bold">
                  1
                </span>
                <span>Chọn Lộ Trình Thử Thách</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono bg-secondary/80 px-2.5 py-0.5 rounded-full border border-border/50">
                {TRACK_META[selectedTrack].labelVi}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.keys(TRACK_META) as AdvancedTrack[]).map((t) => {
                const Icon = TRACK_ICONS[t];
                const isSel = selectedTrack === t;
                return (
                  <div
                    key={t}
                    onClick={() => setSelectedTrack(t)}
                    className={cn(
                      "group relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 select-none",
                      isSel
                        ? "border-primary bg-primary/[0.04] ring-2 ring-primary/40 shadow-sm"
                        : "border-border/70 hover:border-primary/40 hover:bg-muted/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          "size-9 rounded-xl flex items-center justify-center border border-border/40 shrink-0 shadow-xs",
                          TRACK_COLORS[t]
                        )}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      {isSel && (
                        <Badge className="text-[9px] font-mono px-1.5 py-0 bg-primary text-primary-foreground font-semibold">
                          Đang chọn
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {TRACK_META[t].labelVi}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {TRACK_META[t].descVi}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1.5 mt-auto border-t border-border/40">
                      {TRACK_META[t].skillTags.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[9px] font-mono px-1.5 py-0">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Lựa chọn Cấp độ (Level) */}
          <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <span className="font-serif font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                <span className="size-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-mono font-bold">
                  2
                </span>
                <span>Cấp Độ & Áp Lực Thời Gian</span>
              </span>
              <span className="text-[11px] text-muted-foreground font-mono bg-secondary/80 px-2.5 py-0.5 rounded-full border border-border/50">
                Đang chọn: {selectedLevel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {LEVELS.map((l) => {
                const isSel = selectedLevel === l;
                const isRecommended = prereq.recommendedLevel === l;
                return (
                  <div
                    key={l}
                    onClick={() => setSelectedLevel(l)}
                    className={cn(
                      "p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-1.5 select-none",
                      isSel
                        ? "border-primary bg-primary/[0.04] ring-2 ring-primary/40 shadow-sm"
                        : "border-border/70 hover:border-primary/40 hover:bg-muted/20"
                    )}
                  >
                    {isRecommended && (
                      <Badge className="absolute -top-2 right-2 text-[9px] h-4 bg-emerald-600 text-white font-bold shadow-xs px-1.5">
                        Đề xuất
                      </Badge>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-primary">{l}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                        {l === "L1" ? "Blitz 10s" : l === "L2" ? "Blitz 6s" : "Blitz 3s"}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-foreground truncate">
                      {LEVEL_META[l].labelVi}
                    </h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {LEVEL_META[l].descVi}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Thanh Liên thông Foundation (Slim Alert) */}
          {prereq.missing.length > 0 ? (
            <div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/5 text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 min-w-0 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="truncate">{prereq.missing.join(" · ")}</span>
              </div>
              <Link
                href="/foundation/sentence-builder"
                className="text-[11px] font-semibold text-primary underline shrink-0 hover:text-foreground"
              >
                Luyện tập ngay →
              </Link>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-xs flex items-center justify-between text-emerald-600 dark:text-emerald-400 shadow-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5" />
                <span className="font-medium text-[11px]">Đạt chuẩn liên thông Foundation → Advanced ({prereq.recommendedLevel})</span>
              </div>
              <span className="text-[10px] font-mono">Sẵn sàng</span>
            </div>
          )}
        </div>

        {/* CỘT PHẢI (5 COLS): HỢP NHẤT THIẾT LẬP PHIÊN */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3.5">
            {/* Thanh Tóm tắt Track & Tiêu chuẩn (Compact 1 hàng) */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "size-8 rounded-lg flex items-center justify-center border border-border/50 shrink-0",
                    TRACK_COLORS[selectedTrack]
                  )}
                >
                  {(() => {
                    const I = TRACK_ICONS[selectedTrack];
                    return <I className="size-4" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-xs sm:text-sm text-foreground truncate">
                      {TRACK_META[selectedTrack].labelVi}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 rounded-md">
                      {selectedLevel}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono shrink-0">
                <span className="hidden sm:inline">
                  {selectedLevel === "L1"
                    ? "Claim → Data"
                    : selectedLevel === "L2"
                    ? "Claim → Data → Warrant"
                    : "Full Toulmin"}
                </span>
                <span>·</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {selectedLevel === "L1" ? "Blitz 10s" : selectedLevel === "L2" ? "Blitz 6s" : "Blitz 3s"}
                </span>
              </div>
            </div>

            {/* Chủ đề thử thách & Gợi ý AI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold text-foreground">
                  Chủ đề thử thách
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const pool = TOPIC_SUGGESTIONS[selectedTrack];
                    const r = pool[Math.floor(Math.random() * pool.length)];
                    setCustomTopic(r);
                    toast.info("Đã chọn chủ đề", r);
                  }}
                  className="text-[11px] text-primary font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Sparkles className="size-3" />
                  <span>Gợi ý AI</span>
                </button>
              </div>

              <Textarea
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Để trống để sinh ngẫu nhiên theo ngân hàng tình huống..."
                rows={2}
                className="text-xs rounded-xl resize-none p-2.5 bg-background border-border/70 focus-visible:ring-1 focus-visible:ring-primary"
              />

              {/* 4 Chips gọn gàng */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {TOPIC_SUGGESTIONS[selectedTrack].map((topic) => {
                  const isSelected = customTopic === topic;
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setCustomTopic(isSelected ? "" : topic)}
                      className={cn(
                        "text-[10px] text-left px-2 py-1 rounded-lg border transition-all truncate cursor-pointer",
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-semibold shadow-xs"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                      title={topic}
                    >
                      • {topic}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chế độ phiên */}
            <div className="space-y-1.5 pt-1.5 border-t border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold text-foreground">
                  Chế độ phiên
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {mode === "endless" ? "∞ Không giới hạn" : `${mode} câu`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(["endless", "quick", "standard", "deep"] as AdvancedSessionMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "py-1.5 px-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center",
                      mode === m
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                        : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {m === "endless"
                      ? "∞ Vô tận"
                      : m === "quick"
                      ? "4 câu"
                      : m === "standard"
                      ? "8 câu"
                      : "14 câu"}
                  </button>
                ))}
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-1">
              <Button
                onClick={() => handleLaunch()}
                disabled={loading}
                className="w-full h-11 rounded-xl font-serif font-bold text-sm sm:text-base bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer shadow-md shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Đang tạo thử thách...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4.5 fill-current" />
                    <span>
                      Bắt Đầu {TRACK_META[selectedTrack].labelVi} · {selectedLevel}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
