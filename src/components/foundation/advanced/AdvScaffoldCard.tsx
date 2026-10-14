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
    <Card className="border-2 border-border bg-card shadow-[4px_4px_0px_var(--shadow-color)] overflow-hidden flex flex-col h-full">
      <CardContent className="p-3.5 sm:p-4 flex flex-col h-full space-y-2.5 overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b-2 border-border pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 bg-primary border border-border" />
            <span className="text-[11px] font-mono font-black uppercase tracking-wider text-foreground">2. Khung & Gợi ý Toulmin</span>
          </div>
          <div className="flex items-center gap-1 bg-secondary p-0.5 border-2 border-border">
            {([0, 1, 2, 3, 4] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSelectHintTier?.(t)}
                className={`text-[10px] font-mono px-2 py-0.5 font-black transition-all cursor-pointer border ${
                  currentHintTier === t
                    ? "bg-primary text-primary-foreground border-border shadow-[2px_2px_0px_var(--shadow-color)]"
                    : "border-transparent text-foreground hover:bg-card"
                }`}
                title={`Nấc gợi ý T${t}`}
              >
                T{t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-0">
          {task.scaffold.template && (
            <div className="p-2.5 border-2 border-border bg-card">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-primary">Khung câu L{task.scaffold.level}:</span>
              <p className="font-mono text-xs font-bold text-foreground mt-1">“{task.scaffold.template}”</p>
              {task.scaffold.starter && <p className="text-[11px] font-medium text-foreground mt-1">Mở đầu: <span className="font-mono font-bold text-foreground">“{task.scaffold.starter}”</span></p>}
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
            currentHintTier >= 4 ? (
              <div className="p-3 bg-secondary border-2 border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Sparkles className="size-3.5" /> Bài mẫu chuẩn:
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => copy(modelAnswer, "adv-model")} className="p-1 border border-border bg-card text-foreground hover:bg-accent cursor-pointer">
                      {copiedId === "adv-model" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </button>
                    <Button type="button" variant="outline" size="sm" onClick={() => tts.speak(sanitizeTextForTTS(modelAnswer))}
                      className="h-6 px-2 text-[10px] font-mono font-bold gap-1 border-border bg-card text-foreground hover:bg-primary hover:text-primary-foreground cursor-pointer">
                      <Volume2 className="size-3" /><span>Nghe</span>
                    </Button>
                  </div>
                </div>
                <p className="font-mono text-xs sm:text-sm font-bold text-foreground leading-relaxed select-text">“{modelAnswer}”</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectHintTier?.(4)}
                className="w-full text-left p-3 bg-secondary hover:bg-accent hover:text-accent-foreground border-2 border-dashed border-border transition-all flex items-center justify-between gap-2 cursor-pointer group"
              >
                <span className="text-xs font-mono font-bold text-foreground">
                  Mở gợi ý T4 (hoặc bấm [H] 4 lần) để xem bài mẫu chuẩn & Say It Better
                </span>
                <Badge variant="default" className="text-[10px] font-mono font-black shrink-0">
                  Mở T4
                </Badge>
              </button>
            )
          )}

          {currentHintTier >= 4 && task.sayItBetter && (
            <div className="p-2.5 border-2 border-border bg-secondary space-y-2">
              <div className="text-[10px] font-mono font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Layers className="size-3 text-primary" /><span>Say It Better:</span>
              </div>
              <div className="grid gap-1.5 text-xs font-mono">
                {[
                  { k: "casual", label: "☕ Đời thường", text: task.sayItBetter.casual },
                  { k: "professional", label: "💼 Công sở", text: task.sayItBetter.professional },
                  { k: "idiomatic", label: "⚡ Bản xứ", text: task.sayItBetter.idiomatic },
                ].map((v) => (
                  <div key={v.k} className="flex items-start justify-between gap-2 p-2 bg-card border-2 border-border">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black text-primary block">{v.label}:</span>
                      <span className="text-foreground font-bold text-xs block select-text">“{v.text}”</span>
                    </div>
                    <Button type="button" variant="outline" size="xs" onClick={() => tts.speak(sanitizeTextForTTS(v.text))} className="size-6 p-0 border-border cursor-pointer">
                      <Volume2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {task.hints && task.hints.length > 0 && (
            <div className="border-2 border-border bg-secondary p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-foreground flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" /><span>Gợi ý T1–T4:</span>
                </span>
                <button type="button" onClick={() => setExpanded(!expanded)} className="text-[10px] font-mono font-bold text-foreground flex items-center gap-1 cursor-pointer">
                  <span>{expanded ? "Thu gọn" : "Mở rộng"}</span>
                  <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              </div>
              {expanded && (
                <div className="space-y-1.5">
                  {task.hints.filter((h) => h.tier >= 1).map((h) => {
                    const isUnlocked = h.tier <= currentHintTier;
                    return (
                      <button key={h.tier} type="button" onClick={() => onSelectHintTier?.(h.tier)}
                        className={`w-full text-left p-2.5 border-2 transition-all cursor-pointer ${isUnlocked ? "border-border bg-card shadow-[2px_2px_0px_var(--shadow-color)]" : "border-dashed border-border bg-card hover:bg-accent hover:text-accent-foreground"}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 text-[10px] font-mono font-black border border-border bg-foreground text-background">T{h.tier}</span>
                          <span className="text-[11px] font-mono font-bold text-foreground">{h.title}</span>
                          <span className="ml-auto text-[10px] font-mono font-bold text-primary">
                            {isUnlocked ? `-${Math.round(h.penaltyWeight * 100)}% tự lập` : `[BẤM MỞ T${h.tier}]`}
                          </span>
                        </div>
                        {isUnlocked && (
                          <p className="font-mono text-xs font-bold text-foreground mt-1">{h.content}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
