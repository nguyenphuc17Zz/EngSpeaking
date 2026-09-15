"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Play, Shuffle, Loader2, Zap, Flame, Scale, BookOpen,
  ArrowLeft, Target, Clock, Sparkles, ShieldAlert, AlertTriangle, CheckCircle2,
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
  const [duration, setDuration] = useState("10");
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

  void settings;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background select-none overflow-hidden">
      <header className="h-13 border-b border-border/80 bg-card/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/">
            <Button variant="ghost" size="sm" className="size-8 p-0 rounded-xl" title="Trang chủ">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Flame className="size-3.5" />
            </div>
            <span className="font-serif font-bold text-sm sm:text-base tracking-tight">Thử Thách Nâng Cao</span>
            <Badge variant="secondary" className="text-[10px] font-mono h-5 hidden sm:inline-flex rounded-full px-2">
              3 Tracks · L1-L3
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRandom} disabled={loading}
            className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 hidden sm:flex cursor-pointer">
            <Shuffle className="size-3.5 text-primary" /><span>Ngẫu nhiên</span>
          </Button>
          <GlobalAiSelector />
        </div>
      </header>

      <main className="flex-1 p-2.5 sm:p-3 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 min-h-0">
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
            <span className="font-serif font-bold text-xs sm:text-sm">Chọn track & level (kế thừa Sentence Builder + VN→EN)</span>
            <span className="text-[11px] text-muted-foreground font-mono bg-secondary px-2.5 py-0.5 rounded-full border border-border/50">
              SB {sbMastery.overallMastery}% · VN tự lập {vnIndependentRate}%
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.keys(TRACK_META) as AdvancedTrack[]).map((t) => {
                const Icon = TRACK_ICONS[t];
                const isSel = selectedTrack === t;
                return (
                  <div key={t} onClick={() => setSelectedTrack(t)}
                    className={cn("p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2",
                      isSel ? "border-primary bg-primary/[0.03] ring-1 ring-primary/40" : "border-border/70 hover:border-primary/40")}>
                    <div className="flex items-center gap-2.5">
                      <div className={cn("size-9 rounded-xl flex items-center justify-center border border-border/40", TRACK_COLORS[t])}>
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif font-bold text-sm truncate">{TRACK_META[t].labelVi}</h4>
                        <span className="text-[10px] font-mono text-muted-foreground">{TRACK_META[t].labelEn}</span>
                      </div>
                      {isSel && <span className="ml-auto size-2 rounded-full bg-primary animate-pulse shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{TRACK_META[t].descVi}</p>
                    <div className="flex flex-wrap gap-1">
                      {TRACK_META[t].skillTags.slice(0, 4).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[9px] font-mono">{s}</Badge>
                      ))}
                      <Badge variant="outline" className="text-[9px] font-mono">+{TRACK_META[t].skillTags.length - 4}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {LEVELS.map((l) => {
                const isSel = selectedLevel === l;
                const isRecommended = prereq.recommendedLevel === l;
                return (
                  <div key={l} onClick={() => setSelectedLevel(l)}
                    className={cn("p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 relative",
                      isSel ? "border-primary bg-primary/[0.03] ring-1 ring-primary/40" : "border-border/70 hover:border-primary/40")}>
                    {isRecommended && (
                      <Badge className="absolute -top-2 right-2 text-[9px] h-4 bg-emerald-500 text-white">Đề xuất</Badge>
                    )}
                    <h4 className="font-serif font-bold text-sm">{LEVEL_META[l].labelVi}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{LEVEL_META[l].descVi}</p>
                  </div>
                );
              })}
            </div>

            <div className={cn("p-3 rounded-2xl border text-xs space-y-1.5",
              prereq.missing.length ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5")}>
              <div className="flex items-center gap-1.5 font-bold">
                {prereq.missing.length ? <AlertTriangle className="size-3.5 text-amber-500" /> : <CheckCircle2 className="size-3.5 text-emerald-500" />}
                <span>Liên thông Foundation → Advanced</span>
              </div>
              {prereq.reasons.map((r) => <p key={r} className="text-muted-foreground leading-relaxed">• {r}</p>)}
              {prereq.missing.map((m) => <p key={m} className="text-amber-600 leading-relaxed">• {m}</p>)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-b from-primary/[0.06] via-card to-card shrink-0">
            <div className="flex items-center gap-3 mb-2.5">
              <div className={cn("size-12 rounded-2xl flex items-center justify-center border border-border/50", TRACK_COLORS[selectedTrack])}>
                {(() => { const I = TRACK_ICONS[selectedTrack]; return <I className="size-6" />; })()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base truncate">{TRACK_META[selectedTrack].labelVi}</h3>
                  <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 rounded-md">{selectedLevel}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{TRACK_META[selectedTrack].descVi}</p>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="size-3.5 text-primary shrink-0" />
                <span className="font-medium">Khung Toulmin:</span>
                <span className="font-semibold text-foreground">{selectedLevel === "L1" ? "Claim → Data" : selectedLevel === "L2" ? "Claim → Data → Warrant" : "Full + Rebuttal/Fallacy"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5 text-amber-600 shrink-0" />
                <span className="font-medium">Nhịp Studio:</span>
                <span className="text-foreground">{selectedLevel === "L1" ? "Prep 3s · Blitz 10s" : selectedLevel === "L2" ? "Prep 2s · Blitz 6s" : "Prep 1.5s · Blitz 3-4s"}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-bold">Chủ đề (đồng bộ Sentence Builder)</label>
                <button type="button" onClick={() => {
                  const ideas = [
                    "Thuyết phục ban giám đốc tăng ngân sách bảo mật AI",
                    "Phản biện: làm việc từ xa làm giảm sáng tạo kỹ sư",
                    "Giải trình downtime Black Friday với khách VIP",
                    "Thuyết trình gọi vốn nền tảng logistics AI",
                    "Đàm phán SLA 99.99% giữ nguyên giá",
                  ];
                  const r = ideas[Math.floor(Math.random() * ideas.length)];
                  setCustomTopic(r);
                  toast.info("Đã chọn chủ đề", r);
                }} className="text-[11px] text-primary font-semibold flex items-center gap-1 cursor-pointer">
                  <Sparkles className="size-3" /><span>Gợi ý AI</span>
                </button>
              </div>
              <Textarea value={customTopic} onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Để trống = random theo topic Sentence Builder. VD: đàm phán hợp đồng SaaS..."
                rows={3} className="text-xs rounded-2xl resize-none p-3" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-serif font-bold block">Chế độ phiên</span>
              <div className="grid grid-cols-4 gap-2">
                {(["endless", "quick", "standard", "deep"] as AdvancedSessionMode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={cn("p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                      mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border/70 text-muted-foreground")}>
                    {m === "endless" ? "∞ Endless" : m === "quick" ? "Quick 4" : m === "standard" ? "Std 8" : "Deep 14"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Thời lượng hiển thị (tham khảo)</span>
              <div className="flex gap-1.5">
                {["5", "10", "15"].map((d) => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={cn("flex-1 text-xs font-medium py-1.5 rounded-xl border transition-all cursor-pointer",
                      duration === d ? "bg-amber-500/15 text-amber-700 border-amber-500/40 font-semibold" : "border-border/70 text-muted-foreground")}>
                    {d} phút
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1"><ShieldAlert className="size-3" /> Studio 3 cột: Prompt | Khung Toulmin T0-T4 | Thu âm + Feedback 6 trục.</p>
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-secondary/20 shrink-0">
            <Button onClick={() => handleLaunch()} disabled={loading} className="w-full h-12 rounded-2xl font-serif font-bold text-sm gap-2 cursor-pointer">
              {loading ? <><Loader2 className="size-4 animate-spin" /><span>Đang tạo thử thách...</span></> : <><Play className="size-4 fill-current" /><span>Bắt Đầu {TRACK_META[selectedTrack].labelVi} · {selectedLevel}</span></>}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
