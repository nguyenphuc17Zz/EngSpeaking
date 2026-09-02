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
import type { VNToENTask } from "@/types/vn-to-en";

interface VNHintDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: VNToENTask | null;
  currentHintTier: number;
  onSelectHintTier: (tier: 0 | 1 | 2 | 3 | 4) => void;
}

export function VNHintDrawer({
  isOpen,
  onClose,
  task,
  currentHintTier,
  onSelectHintTier,
}: VNHintDrawerProps) {
  if (!task) return null;

  const hints = task.hints || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-border/80 shadow-xl space-y-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <HelpCircle className="size-5 text-amber-500" />
            <span>Gợi ý nấc thang (Progressive Hints)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Mở gợi ý theo từng tầng. Càng ít gợi ý, chỉ số Tự lập (Independence) càng cao.
          </DialogDescription>
        </DialogHeader>

        {/* Hints Tiers List */}
        <div className="space-y-2.5 pt-1">
          {hints.map((hint) => {
            const isUnlocked = currentHintTier >= hint.tier;

            return (
              <div
                key={hint.tier}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isUnlocked
                    ? "bg-primary/5 border-primary/30 text-foreground"
                    : "bg-muted/30 border-border/60 text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                      Tầng {hint.tier}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{hint.title}</span>
                  </div>

                  {!isUnlocked ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onSelectHintTier(hint.tier as 0 | 1 | 2 | 3 | 4)}
                      className="h-7 text-[11px] rounded-xl font-semibold gap-1 px-2.5"
                    >
                      <Lock className="size-3" />
                      <span>Mở gợi ý</span>
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                      <CheckCircle2 className="size-3 mr-1" />
                      Đã mở
                    </Badge>
                  )}
                </div>

                {isUnlocked && (
                  <div className="mt-2 pt-2 border-t border-border/40 font-mono text-xs text-primary font-medium">
                    {hint.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Warning Note */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            Khuyên dùng: Hãy thử tự bật ra câu nói trước khi xem Tầng 4 (Câu mẫu hoàn chỉnh).
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
