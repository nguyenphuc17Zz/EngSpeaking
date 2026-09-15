"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  BookOpen,
  Volume2,
  TrendingUp,
  Brain,
  Layers,
  History,
  AlertCircle,
  HelpCircle,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type { MasterErrorRecord, L1InterferenceType, GapType } from "@/types/error-bank";

interface ErrorDrillContextCardProps {
  record: MasterErrorRecord;
  currentHintTier: number;
  onSelectHintTier: (tier: number | ((prev: number) => number)) => void;
}

const L1_METAS: Record<L1InterferenceType, { label: string; desc: string }> = {
  tense_drop: {
    label: "Quên chia thì (Tense Drop)",
    desc: "Tiếng Việt không biến đổi động từ theo thời gian, dẫn đến xu hướng giữ nguyên Base Form.",
  },
  ending_sound_omission: {
    label: "Nuốt âm cuối (Ending Sound Omission)",
    desc: "Tiếng Việt là ngôn ngữ đơn âm, phụ âm cuối không bật hơi mạnh như tiếng Anh (-s, -ed, -t, -k).",
  },
  copula_drop: {
    label: "Rơi động từ To-Be (Copula Drop)",
    desc: "Tiếng Việt ghép trực tiếp 'Tôi đói' / 'Anh ấy tốt' mà không cần động từ nối 'is/am/are'.",
  },
  collocation_calque: {
    label: "Dịch thô cụm từ (Collocation Calque)",
    desc: "Áp dụng cấu trúc dịch word-by-word từ tiếng Việt sang tiếng Anh thiếu tự nhiên.",
  },
  preposition_calque: {
    label: "Sai giới từ theo tiếng Việt (Preposition Calque)",
    desc: "Dùng giới từ tương đương tiếng Việt (vd: listen to, wait for, married to).",
  },
  plural_drop: {
    label: "Quên số nhiều (Plural -s/es Drop)",
    desc: "Tiếng Việt dùng từ định lượng 'những/các' thay vì thêm hậu tố biến cách vào danh từ.",
  },
  filler_transfer: {
    label: "Lạm dụng từ đệm Việt (Filler Transfer)",
    desc: "Bị nghẽn tư duy từ vựng dẫn đến phát ra 'à/ừ/thì/là' thay vì từ liên kết tiếng Anh.",
  },
};

const GAP_METAS: Record<GapType, { label: string; color: string; desc: string }> = {
  knowledge_gap: {
    label: "Lỗ hổng kiến thức",
    color: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    desc: "Bạn chưa nắm vững cấu trúc hoặc quy tắc này. Cần hiểu rõ cơ chế ngữ pháp.",
  },
  retrieval_gap: {
    label: "Chậm truy xuất",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    desc: "Bạn hiểu ngữ pháp nhưng não mất quá nhiều thời gian truy xuất khi nói tự nhiên.",
  },
  production_gap: {
    label: "Trượt phản xạ (Slip)",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    desc: "Bạn đã biết rất rõ cấu trúc này, sai sót xảy ra do áp lực nói nhanh hoặc thiếu chú ý.",
  },
  pronunciation_gap: {
    label: "Phát âm / Bật âm",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    desc: "Vấn đề cơ miệng và phản xạ nối âm/trọng âm. Cần luyện cơ bắp khẩu hình.",
  },
};

export function ErrorDrillContextCard({
  record,
  currentHintTier,
  onSelectHintTier,
}: ErrorDrillContextCardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"hints" | "examples" | "memory">("hints");
  const { speak, isSpeaking } = useBrowserTTS();

  const latestExample = record.examples[record.examples.length - 1];
  const targetCorrection = latestExample?.correction || record.canonicalName;

  // Generate Cloze text (masked key words)
  const generateClozeText = (text: string): string => {
    const words = text.split(" ");
    if (words.length <= 3) return text;
    // Mask roughly middle words or words longer than 3 chars
    return words
      .map((w, idx) => (idx % 2 === 1 && w.length > 2 ? "_____" : w))
      .join(" ");
  };

  // Generate Template text
  const generateTemplateText = (text: string): string => {
    const words = text.split(" ");
    if (words.length <= 2) return text;
    return `${words[0]} ... [${record.labelVi}] ... ${words[words.length - 1]}`;
  };

  const handleSpeak = (text: string) => {
    speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 0.9 });
  };

  const l1Meta = record.l1InterferenceType ? L1_METAS[record.l1InterferenceType] : null;
  const gapMeta = record.gapType ? GAP_METAS[record.gapType] : null;

  return (
    <Card className="h-full flex flex-col border-border/80 bg-card shadow-xs overflow-hidden">
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 bg-muted/20 shrink-0">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={activeSubTab === "hints" ? "secondary" : "ghost"}
            onClick={() => setActiveSubTab("hints")}
            className="h-7 text-xs font-semibold px-2.5 rounded-lg gap-1.5"
          >
            <Lightbulb className="size-3.5 text-amber-500" />
            Thang Gợi Ý (4 Tiers)
          </Button>
          <Button
            size="sm"
            variant={activeSubTab === "examples" ? "secondary" : "ghost"}
            onClick={() => setActiveSubTab("examples")}
            className="h-7 text-xs font-semibold px-2.5 rounded-lg gap-1.5"
          >
            <History className="size-3.5 text-primary" />
            Lịch sử câu lỗi ({record.examples.length})
          </Button>
          <Button
            size="sm"
            variant={activeSubTab === "memory" ? "secondary" : "ghost"}
            onClick={() => setActiveSubTab("memory")}
            className="h-7 text-xs font-semibold px-2.5 rounded-lg gap-1.5"
          >
            <Brain className="size-3.5 text-emerald-500" />
            FSRS & BKT
          </Button>
        </div>
      </div>

      <CardContent className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* SUBTAB 1: HINT LADDER */}
        {activeSubTab === "hints" && (
          <div className="space-y-3.5 animate-in fade-in-0 duration-200">
            {/* Rule Explanation Banner */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bản chất lỗi ngữ pháp / phản xạ
                </h4>
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {record.descriptionVi}
              </p>
              {gapMeta && (
                <div className="pt-1 flex items-start gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${gapMeta.color}`}>
                    {gapMeta.label}
                  </Badge>
                  <span>{gapMeta.desc}</span>
                </div>
              )}
            </div>

            {/* L1 Interference Callout if applicable */}
            {l1Meta && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>Ảnh hưởng từ tiếng mẹ đẻ: {l1Meta.label}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {l1Meta.desc}
                </p>
              </div>
            )}

            {/* Hint Tier Selector */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  Cấp độ gợi ý (Phím [H] để tăng)
                </span>
                <span className="text-[11px] font-mono text-primary font-bold">
                  Tier {currentHintTier} / 4
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-muted/50 border border-border/60">
                {[0, 1, 2, 3, 4].map((tier) => {
                  const penalty = [0, 0.1, 0.25, 0.5, 0.85][tier];
                  return (
                    <button
                      key={tier}
                      onClick={() => onSelectHintTier(tier)}
                      title={`T${tier} (trừ ${Math.round(penalty * 100)}% tự lập)`}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
                        currentHintTier === tier
                          ? "bg-card text-foreground shadow-xs border border-border/60 font-extrabold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      T{tier}
                    </button>
                  );
                })}
              </div>

              {/* Tier Content Display */}
              <div className="p-3 rounded-2xl border border-border/80 bg-card shadow-xs space-y-2 transition-all">
                {currentHintTier === 0 && (
                  <div className="py-4 text-center space-y-1.5 text-muted-foreground">
                    <HelpCircle className="size-6 mx-auto opacity-50 text-muted-foreground" />
                    <p className="text-xs font-bold text-foreground">Tier 0: Tự thử thách (Spontaneous)</p>
                    <p className="text-xs max-w-xs mx-auto">
                      Không hiển thị bất kỳ gợi ý nào. Hãy thử nhớ lại quy tắc và nói phiên bản đúng ngay lập tức!
                    </p>
                  </div>
                )}

                {currentHintTier === 1 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                        Tier 1: Nhận diện cấu trúc
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Chú ý cấu trúc: <span className="text-primary font-bold">{record.labelVi}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hãy tự hỏi: Câu này cần chia động từ thế nào hoặc dùng giới từ/cụm từ nào cho tự nhiên?
                    </p>
                  </div>
                )}

                {currentHintTier === 2 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">
                        Tier 2: Điền từ bị khuyết (Cloze Test)
                      </Badge>
                    </div>
                    <p className="text-sm font-mono font-medium p-2.5 rounded-xl bg-muted/40 border border-border/40 text-foreground">
                      {generateClozeText(targetCorrection)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Hãy điền vào những chỗ trống gạch dưới để hoàn thiện câu hoàn chỉnh.
                    </p>
                  </div>
                )}

                {currentHintTier === 3 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-500/30">
                        Tier 3: Khung sườn câu (Sentence Template)
                      </Badge>
                    </div>
                    <p className="text-sm font-mono font-medium p-2.5 rounded-xl bg-muted/40 border border-border/40 text-foreground">
                      {generateTemplateText(targetCorrection)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bộ khung chuẩn xác. Chỉ cần lắp ghép các thành phần theo đúng thứ tự.
                    </p>
                  </div>
                )}

                {currentHintTier === 4 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                        Tier 4: Đáp án chuẩn bản xứ (Full Target)
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSpeak(targetCorrection)}
                        disabled={isSpeaking}
                        className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary/80"
                      >
                        <Volume2 className="size-3" />
                        Nghe mẫu
                      </Button>
                    </div>
                    <p className="text-sm font-semibold p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                      &ldquo;{targetCorrection}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Đọc to câu này với nhịp điệu tự nhiên và chuẩn ngữ điệu.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: ERROR EXAMPLES */}
        {activeSubTab === "examples" && (
          <div className="space-y-3 animate-in fade-in-0 duration-200">
            <p className="text-xs text-muted-foreground">
              Các câu bạn đã nói bị dính lỗi này trong các bài luyện Sentence Builder và VN→EN Speaking:
            </p>
            {record.examples.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                Chưa có dữ liệu lịch sử cho lỗi này.
              </p>
            ) : (
              <div className="space-y-2.5">
                {record.examples.slice(-4).reverse().map((ex, idx) => (
                  <div
                    key={ex.id || idx}
                    className="p-3 rounded-2xl border border-border/60 bg-muted/30 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize">
                        {ex.sourceModule?.replace("_", " ") || "Practice"}
                      </Badge>
                      <span>{ex.timestamp ? new Date(ex.timestamp).toLocaleDateString("vi-VN") : "Gần đây"}</span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-rose-500 font-bold shrink-0">Bạn nói:</span>
                        <span className="line-through text-muted-foreground">{ex.userText}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">Sửa đúng:</span>
                          <span className="font-medium text-foreground">{ex.correction}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSpeak(ex.correction)}
                          disabled={isSpeaking}
                          className="h-5 p-1 text-muted-foreground hover:text-foreground"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 3: MEMORY & SPACED REPETITION */}
        {activeSubTab === "memory" && (
          <div className="space-y-3.5 animate-in fade-in-0 duration-200">
            {/* Retrievability Meter */}
            <div className="p-3 rounded-2xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-primary" />
                  Độ bền trí nhớ FSRS (Retrievability)
                </span>
                <span className="font-mono font-bold text-primary">
                  {Math.round(record.retrievability || 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    (record.retrievability || 100) >= 80
                      ? "bg-emerald-500"
                      : (record.retrievability || 100) >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, record.retrievability || 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tỷ lệ xác suất bạn truy xuất được cấu trúc này chuẩn xác khi nói tự nhiên không cần gợi ý.
              </p>
            </div>

            {/* BKT Mastery Meter */}
            <div className="p-3 rounded-2xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <Brain className="size-3.5 text-emerald-600" />
                  Xác suất làm chủ BKT (pMastery)
                </span>
                <span className="font-mono font-bold text-emerald-600">
                  {Math.round((record.pMastery || 0) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (record.pMastery || 0) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Được tính toán theo thuật toán Bayesian Knowledge Tracing dựa trên chuỗi thành công và sửa lỗi tức thì.
              </p>
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-border/40 bg-card">
                <span className="text-[11px] text-muted-foreground block">Giai đoạn ôn tập</span>
                <span className="font-bold font-mono text-sm">Stage {record.reviewStage || 0} / 6</span>
              </div>
              <div className="p-2.5 rounded-xl border border-border/40 bg-card">
                <span className="text-[11px] text-muted-foreground block">Độ ổn định (Stability)</span>
                <span className="font-bold font-mono text-sm">
                  {record.fsrsStability ? `${record.fsrsStability.toFixed(1)} ngày` : "Chưa xác định"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl border border-border/40 bg-card">
                <span className="text-[11px] text-muted-foreground block">Tỷ lệ tự sửa (Recovery)</span>
                <span className="font-bold font-mono text-sm">{Math.round(record.recoveryRate || 0)}%</span>
              </div>
              <div className="p-2.5 rounded-xl border border-border/40 bg-card">
                <span className="text-[11px] text-muted-foreground block">Tổng số lần mắc lỗi</span>
                <span className="font-bold font-mono text-sm">{record.frequency || 0} lần</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
