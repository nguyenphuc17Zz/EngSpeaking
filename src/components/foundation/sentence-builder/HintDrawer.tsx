"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import type { SentenceBuilderTask } from "@/types/sentence-builder";

interface HintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: SentenceBuilderTask | null;
  currentHintTier: number;
  onSelectHintTier: (tier: 0 | 1 | 2 | 3 | 4) => void;
}

export function HintDrawer({
  isOpen,
  onClose,
  task,
  currentHintTier,
  onSelectHintTier,
}: HintDrawerProps) {
  if (!task) return null;

  const hints = task.hints || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-5 md:p-6 bg-card border border-border/80 shadow-2xl space-y-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base md:text-lg font-bold flex items-center gap-2">
            <HelpCircle className="size-5 text-amber-500" />
            <span>Gợi ý nấc thang (Progressive Hints)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Mở gợi ý theo từng tầng. Càng ít gợi ý, chỉ số Tự lập (Independence) càng cao.
          </DialogDescription>
        </DialogHeader>

        {/* Hints Tiers List */}
        <div className="space-y-2 pt-1 max-h-[55vh] overflow-y-auto pr-1">
          {hints.map((hint) => {
            const isUnlocked = currentHintTier >= hint.tier;

            return (
              <div
                key={hint.tier}
                className={`p-3 rounded-2xl border transition-all ${
                  isUnlocked
                    ? "bg-primary/5 border-primary/30 text-foreground"
                    : "bg-muted/30 border-border/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                      Tầng {hint.tier}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{hint.title}</span>
                  </div>

                  {!isUnlocked ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onSelectHintTier(hint.tier as 0 | 1 | 2 | 3 | 4)}
                      className="h-6 text-[10px] rounded-lg font-semibold gap-1 px-2"
                    >
                      <Lock className="size-3" />
                      <span>Mở</span>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 py-0">
                      <CheckCircle2 className="size-3 mr-1" />
                      Đã mở
                    </Badge>
                  )}
                </div>

                {isUnlocked && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/40 font-mono text-xs text-primary font-medium">
                    {hint.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Warning Note about Independence Score */}
        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            Khuyên dùng: Thử phản xạ tự nói trước khi mở Tầng 3 (Từ mở đầu) và Tầng 4 (Câu mẫu).
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
