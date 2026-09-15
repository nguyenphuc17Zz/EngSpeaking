"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2,
  AlertTriangle,
  Target,
  Eye,
  EyeOff,
  Mic,
  Brain,
  Zap,
  Layers,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import type { MasterErrorRecord } from "@/types/error-bank";

interface ErrorDrillPromptCardProps {
  record: MasterErrorRecord;
  currentIndex: number;
  totalInQueue: number;
}

const SOURCE_MODULE_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  sentence_builder: {
    label: "Sentence Builder",
    color: "bg-primary/10 text-primary border-primary/30",
    icon: <Layers className="size-3" />,
  },
  vn_to_en: {
    label: "VN → EN Speaking",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: <Mic className="size-3" />,
  },
  retry_lab: {
    label: "Retry Lab",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: <Zap className="size-3" />,
  },
  latency: {
    label: "Response Latency",
    color: "bg-violet-500/10 text-violet-600 border-violet-500/30",
    icon: <Zap className="size-3" />,
  },
  survival: {
    label: "Survival Speaking",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    icon: <Mic className="size-3" />,
  },
  shadowing: {
    label: "Shadowing",
    color: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    icon: <Mic className="size-3" />,
  },
  conversation: {
    label: "Conversation",
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    icon: <Mic className="size-3" />,
  },
};

const GAP_TYPE_META: Record<string, { label: string; color: string }> = {
  knowledge_gap: { label: "⚡ Knowledge Gap", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  retrieval_gap: { label: "🧠 Retrieval Gap", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  production_gap: { label: "⚠️ Production Gap", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  pronunciation_gap: { label: "🎤 Pronunciation Gap", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
};

const SEVERITY_META: Record<string, { label: string; color: string }> = {
  minor: { label: "Nhỏ", color: "bg-muted text-muted-foreground border-border/50" },
  moderate: { label: "Vừa", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  major: { label: "Nặng", color: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  critical: { label: "Nghiêm trọng", color: "bg-red-500/10 text-red-600 border-red-500/30" },
};

export function ErrorDrillPromptCard({ record, currentIndex, totalInQueue }: ErrorDrillPromptCardProps) {
  const tts = useBrowserTTS();
  const [showCorrection, setShowCorrection] = useState(false);

  const latestExample = record.examples[record.examples.length - 1];
  const originalUserText = latestExample?.userText || record.canonicalName;
  const targetCorrection = latestExample?.correction || record.canonicalName;
  const sourceModule = latestExample?.sourceModule || "sentence_builder";

  const sourceMeta = SOURCE_MODULE_META[sourceModule] || SOURCE_MODULE_META["sentence_builder"];
  const gapMeta = GAP_TYPE_META[record.gapType] || GAP_TYPE_META["knowledge_gap"];
  const severityMeta = SEVERITY_META[record.severity] || SEVERITY_META["moderate"];

  const handlePlayOriginal = () => tts.speak(sanitizeTextForTTS(originalUserText));
  const handlePlayCorrection = () => tts.speak(sanitizeTextForTTS(targetCorrection));

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-rose-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3 sm:p-4 flex flex-col h-full space-y-3 overflow-y-auto">
        {/* Top Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Source module badge */}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${sourceMeta.color}`}>
              {sourceMeta.icon}
              {sourceMeta.label}
            </span>
            {/* Severity */}
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-mono ${severityMeta.color}`}>
              {severityMeta.label}
            </span>
          </div>
          {/* Progress Counter */}
          <span className="text-[11px] font-mono font-bold text-muted-foreground">
            Lỗi {currentIndex + 1}/{totalInQueue}
          </span>
        </div>

        {/* Error Pattern Label */}
        <div className="shrink-0 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Brain className="size-3.5 text-rose-500 shrink-0" />
            <span>Mẫu lỗi cần sửa</span>
          </div>
          <h2 className="text-sm font-bold text-foreground leading-snug">
            {record.labelVi}
          </h2>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono ${gapMeta.color}`}>
            {gapMeta.label}
          </span>
        </div>

        {/* Original Error → Divider → Target */}
        <div className="flex-1 min-h-0 space-y-3">
          {/* Original mistake */}
          <div className="p-3 rounded-2xl bg-red-500/8 border border-red-500/20 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="size-3" />
                Câu sai của bạn (từ {sourceMeta.label})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayOriginal}
                className="size-6 p-0 rounded-full text-red-500 hover:bg-red-500/10"
                title="Nghe lại câu sai"
              >
                <Volume2 className="size-3.5" />
              </Button>
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed italic">
              &ldquo;{originalUserText}&rdquo;
            </p>
          </div>

          {/* Arrow */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[11px] text-muted-foreground font-mono px-2">→ Mục tiêu</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Target Correction (hidden / reveal) */}
          <div className="p-3 rounded-2xl bg-emerald-500/8 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Target className="size-3" />
                Câu chuẩn (Mục tiêu)
              </span>
              <div className="flex items-center gap-1">
                {showCorrection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayCorrection}
                    className="size-6 p-0 rounded-full text-emerald-500 hover:bg-emerald-500/10"
                    title="Nghe câu đúng"
                  >
                    <Volume2 className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCorrection((v) => !v)}
                  className={`size-6 p-0 rounded-full transition-colors ${showCorrection
                      ? "text-emerald-500 hover:bg-emerald-500/10"
                      : "text-muted-foreground hover:bg-muted"
                    }`}
                  title={showCorrection ? "Ẩn câu đúng" : "Hiện câu đúng (sau khi đã cố thử)"}
                >
                  {showCorrection ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </Button>
              </div>
            </div>

            {showCorrection ? (
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 leading-relaxed">
                &ldquo;{targetCorrection}&rdquo;
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Hãy tự nói trước — bấm 👁 để xem câu đúng sau khi đã thử.
              </p>
            )}
          </div>
        </div>

        {/* FSRS Review Stats */}
        <div className="shrink-0 border-t border-border/40 pt-2.5 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground">Tần suất</div>
            <div className="text-sm font-bold font-mono text-foreground">{record.frequency}x</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground">Khôi phục</div>
            <div className={`text-sm font-bold font-mono ${record.recoveryRate >= 60 ? "text-emerald-600" : "text-rose-600"}`}>
              {record.recoveryRate}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground">Trí nhớ</div>
            <div className={`text-sm font-bold font-mono ${(record.retrievability || 80) >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
              {Math.round(record.retrievability || 80)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
