"use client";

import { useState } from "react";
import { Lightbulb, Sparkles, Volume2, RefreshCw, Loader2, Compass, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";

export interface DynamicScaffoldingHints {
  tier1Keywords: Array<{ term: string; meaning: string }>;
  tier2Starters: Array<{ starter: string; meaning: string }>;
  tier3FullAnswer: { en: string; vi: string };
}

export interface TacticalGuide {
  recommendedTone?: string;
  strategyTip?: string;
  pitfallsToAvoid?: string;
}

interface QuickHintsDrawerProps {
  scenarioGoal?: string;
  hints?: DynamicScaffoldingHints | null;
  tacticalGuide?: TacticalGuide | null;
  isLoadingHints?: boolean;
  onRefreshHints?: () => void;
  onSelectHint?: (hintText: string) => void;
  className?: string;
}

const DEFAULT_TIER_1 = [
  { term: "From my perspective", meaning: "Theo góc nhìn của tôi" },
  { term: "As far as I'm concerned", meaning: "Theo như tôi thấy" },
  { term: "Take into account", meaning: "Cân nhắc, tính đến" },
  { term: "In the long run", meaning: "Về lâu về dài" },
];

const DEFAULT_TIER_2 = [
  { starter: "I'd say that...", meaning: "Tôi sẽ nói rằng..." },
  { starter: "When it comes to...", meaning: "Khi nhắc tới việc..." },
  { starter: "What really matters to me is...", meaning: "Điều thực sự quan trọng là..." },
  { starter: "From my personal experience...", meaning: "Từ kinh nghiệm cá nhân của tôi..." },
];

const DEFAULT_TIER_3 = {
  en: "From my experience, taking small consistent steps always brings the best outcome.",
  vi: "Từ trải nghiệm của tôi, từng bước nhỏ nhất quán luôn đem lại kết quả tốt nhất.",
};

export function QuickHintsDrawer({
  scenarioGoal,
  hints,
  tacticalGuide,
  isLoadingHints,
  onRefreshHints,
  onSelectHint,
  className,
}: QuickHintsDrawerProps) {
  const tts = useBrowserTTS();
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | "guide">(2);
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const activeKeywords = hints?.tier1Keywords?.length ? hints.tier1Keywords : DEFAULT_TIER_1;
  const activeStarters = hints?.tier2Starters?.length ? hints.tier2Starters : DEFAULT_TIER_2;
  const activeFullAnswer = hints?.tier3FullAnswer?.en ? hints.tier3FullAnswer : DEFAULT_TIER_3;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(id);
    setTimeout(() => setCopiedIdx(null), 2000);
    if (onSelectHint) onSelectHint(text);
  };

  const handlePlay = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    tts.speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 0.95 });
  };

  return (
    <div
      className={cn(
        "h-full flex flex-col rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs",
        className
      )}
    >
      {/* Header with tier selector and dynamic indicator */}
      <div className="p-2 sm:p-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="size-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Lightbulb className="size-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs text-foreground truncate">
                Trợ Lý & Gợi Ý AI
              </span>
              {hints?.tier1Keywords && (
                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Gợi ý động cập nhật theo câu hỏi AI" />
              )}
            </div>
          </div>
        </div>

        {/* Tier Tabs + Refresh Button */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-0.5 bg-background p-0.5 rounded-xl border border-border/70">
            {[
              { id: 1 as const, label: "T1: Từ" },
              { id: 2 as const, label: "T2: Mở" },
              { id: 3 as const, label: "T3: Mẫu" },
              { id: "guide" as const, label: "🎯 Hướng dẫn" },
            ].map((t) => (
              <button
                key={String(t.id)}
                onClick={() => setActiveTab(t.id)}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg transition-all ${
                  activeTab === t.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {onRefreshHints && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefreshHints}
              disabled={isLoadingHints}
              className="size-6 p-0 rounded-lg text-muted-foreground hover:text-primary"
              title="Làm mới gợi ý động"
            >
              {isLoadingHints ? (
                <Loader2 className="size-3 animate-spin text-primary" />
              ) : (
                <RefreshCw className="size-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content strictly scrollable inside */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
        {isLoadingHints ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-xs">AI đang soạn gợi ý & hướng dẫn theo tình huống...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: Keywords */}
            {activeTab === 1 && (
              <div className="grid grid-cols-2 gap-1.5">
                {activeKeywords.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => handleCopy(item.term, `t1_${i}`)}
                    className="p-2 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group flex flex-col justify-between text-xs"
                  >
                    <span className="font-bold text-primary group-hover:underline text-[11px] truncate">
                      {item.term}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">{item.meaning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: Starters */}
            {activeTab === 2 && (
              <div className="space-y-1.5">
                {activeStarters.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => handleCopy(item.starter, `t2_${i}`)}
                    className="p-2 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-primary block group-hover:underline text-[11px]">
                        {item.starter}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {item.meaning}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handlePlay(item.starter, e)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="size-3" />
                      </button>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {copiedIdx === `t2_${i}` ? "✓" : "Copy"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: Model Answer */}
            {activeTab === 3 && (
              <div
                onClick={() => handleCopy(activeFullAnswer.en, "t3_0")}
                className="p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                    <Sparkles className="size-2.5" /> Câu trả lời gợi ý:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handlePlay(activeFullAnswer.en, e)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                      title="Nghe câu mẫu"
                    >
                      <Volume2 className="size-3" />
                    </button>
                    <span className="text-[9px] font-mono text-muted-foreground">
                      {copiedIdx === "t3_0" ? "✓ Đã copy" : "Copy"}
                    </span>
                  </div>
                </div>
                <p className="font-semibold text-foreground group-hover:text-primary leading-relaxed text-[11px]">
                  "{activeFullAnswer.en}"
                </p>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  {activeFullAnswer.vi}
                </p>
              </div>
            )}

            {/* TAB 4: Tactical Guide & Coaching Instructions */}
            {activeTab === "guide" && (
              <div className="space-y-2 text-xs">
                {/* Tone */}
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1">
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                    <MessageSquare className="size-3 shrink-0" />
                    <span>Văn phong khuyên dùng:</span>
                  </div>
                  <p className="text-foreground text-[11px] leading-relaxed">
                    {tacticalGuide?.recommendedTone || "Tự tin, lịch thiệp và mạch lạc trong giao tiếp."}
                  </p>
                </div>

                {/* Strategy */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    <Compass className="size-3 shrink-0" />
                    <span>Chiến lược phản xạ:</span>
                  </div>
                  <p className="text-foreground text-[11px] leading-relaxed">
                    {tacticalGuide?.strategyTip || "Tập trung giải quyết câu hỏi trọng tâm của đối phương, đưa ra luận điểm kèm ví dụ thực tế."}
                  </p>
                </div>

                {/* Pitfalls */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                    <AlertTriangle className="size-3 shrink-0" />
                    <span>Cạm bẫy cần tránh:</span>
                  </div>
                  <p className="text-foreground text-[11px] leading-relaxed">
                    {tacticalGuide?.pitfallsToAvoid || "Tránh trả lời quá ngắn (cộc lốc), không ngắt lời và dùng từ vựng phù hợp ngữ cảnh."}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
