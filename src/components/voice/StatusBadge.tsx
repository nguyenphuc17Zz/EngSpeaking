"use client";

import type { SessionStatus } from "@/types/conversation";
import { getStatusColor, getStatusLabel } from "@/features/voice-session/state/machine";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: SessionStatus }) {
  const { badge, dot, label } = getStatusColor(status);
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", badge)}>
      <span className={cn("size-2 rounded-full", dot)} aria-hidden />
      <span>{label}</span>
      <span className="sr-only">Trạng thái: {getStatusLabel(status)}</span>
    </div>
  );
}
