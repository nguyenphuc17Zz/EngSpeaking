"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Volume2, ChevronDown, Copy, Check, Layers } from "lucide-react";
import type { AdvancedTask } from "@/types/advanced";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { toast } from "@/lib/toast";

interface AdvScaffoldCardProps {
  task: AdvancedTask;
  currentHintTier?: number;
  onSelectHintTier?: (tier: 0 | 1 | 2 | 3 | 4) => void;
}

export function AdvScaffoldCard({ task, currentHintTier = 0, onSelectHintTier }: AdvScaffoldCardProps) {
  const tts = useBrowserTTS();
  const [expanded, setExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Đã sao chép", text.slice(0, 80));
      setTimeout(() => setCopiedId((p) => (p === id ? null : p)), 1500);
    } catch {
      toast.error("Không thể sao chép", "Hãy bôi đen và Ctrl+C.");
    }
  };

  const modelAnswer = task.expectedResponses[0] || task.targetIntent || "";

  return (
    <Card className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">2. Khung & Gợi ý Toulmin</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">T{currentHintTier}/4</Badge>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {task.scaffold.template && (
            <div className="p-2.5 rounded-2xl bg-card border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Khung câu L{task.scaffold.level}:</span>
              <p className="font-mono text-xs font-bold text-foreground mt-1">“{task.scaffold.template}”</p>
              {task.scaffold.starter && <p className="text-[11px] text-muted-foreground mt-1">Mở đầu: <span className="font-mono text-foreground">“{task.scaffold.starter}”</span></p>}
              {task.scaffold.constraints && task.scaffold.constraints.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {task.scaffold.constraints.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {modelAnswer && (
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="size-3.5" /> Bài mẫu chuẩn:
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => copy(modelAnswer, "adv-model")} className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer">
                    {copiedId === "adv-model" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  </button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => tts.speak(sanitizeTextForTTS(modelAnswer))}
                    className="h-6 px-2 text-[10px] gap-1 rounded-lg border border-primary/30 text-primary cursor-pointer">
                    <Volume2 className="size-3" /><span>Nghe</span>
                  </Button>
                </div>
              </div>
              <p className="font-mono text-xs sm:text-sm font-bold text-foreground leading-relaxed select-text">“{modelAnswer}”</p>
            </div>
          )}

          {task.sayItBetter && (
            <div className="p-2.5 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3 text-indigo-500" /><span>Say It Better:</span>
              </div>
              <div className="grid gap-1.5 text-xs font-mono">
                {[
                  { k: "casual", label: "☕ Đời thường", text: task.sayItBetter.casual },
                  { k: "professional", label: "💼 Công sở", text: task.sayItBetter.professional },
                  { k: "idiomatic", label: "⚡ Bản xứ", text: task.sayItBetter.idiomatic },
                ].map((v) => (
                  <div key={v.k} className="flex items-start justify-between gap-2 p-2 rounded-xl bg-card border border-border/60">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-muted-foreground block">{v.label}:</span>
                      <span className="text-foreground text-xs block select-text">“{v.text}”</span>
                    </div>
                    <Button type="button" variant="ghost" size="xs" onClick={() => tts.speak(sanitizeTextForTTS(v.text))} className="size-6 p-0 cursor-pointer">
                      <Volume2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.hints && task.hints.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <Sparkles className="size-3 text-amber-500" /><span>Gợi ý T1–T4:</span>
                </span>
                <button type="button" onClick={() => setExpanded(!expanded)} className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 cursor-pointer">
                  <span>{expanded ? "Thu gọn" : "Mở rộng"}</span>
                  <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              </div>
              {expanded && (
                <div className="space-y-1.5">
                  {task.hints.filter((h) => h.tier >= 1).map((h) => (
                    <button key={h.tier} type="button" onClick={() => onSelectHintTier?.(h.tier)}
                      className={`w-full text-left p-2 rounded-xl border transition-all cursor-pointer ${currentHintTier >= h.tier ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card"}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 rounded text-[9px] font-mono font-bold border border-border/60 bg-muted">T{h.tier}</span>
                        <span className="text-[11px] font-bold">{h.title}</span>
                        <span className="ml-auto text-[9px] font-mono text-muted-foreground">-{Math.round(h.penaltyWeight * 100)}% tự lập</span>
                      </div>
                      <p className="font-mono text-xs text-foreground/90 mt-1">{h.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
