// Deterministic FSM per §17, §22 — no scattered booleans
import type { SessionStatus } from "@/types/conversation";

const ALLOWED: Record<SessionStatus, SessionStatus[]> = {
  idle: ["starting", "error"],
  starting: ["ready", "listening", "recording", "error", "idle"],
  ready: ["listening", "recording", "completed", "error", "idle"],
  listening: ["recording", "transcribing", "completed", "error", "idle"],
  recording: ["transcribing", "completed", "error", "idle"],
  transcribing: ["thinking", "listening", "error", "completed"],
  thinking: ["speaking", "listening", "error", "completed"],
  speaking: ["listening", "ready", "recording", "completed", "error"],
  completed: ["idle", "starting"],
  error: ["idle", "starting", "listening", "ready"],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function getStatusLabel(status: SessionStatus): string {
  switch (status) {
    case "idle": return "Sẵn sàng";
    case "starting": return "Đang khởi tạo...";
    case "ready": return "Sẵn sàng";
    case "listening": return "Đang nghe...";
    case "recording": return "Đang ghi âm...";
    case "transcribing": return "Đang nhận dạng...";
    case "thinking": return "AI đang suy nghĩ...";
    case "speaking": return "AI đang nói...";
    case "completed": return "Đã kết thúc";
    case "error": return "Lỗi";
    default: return status;
  }
}

export function getStatusEnglish(status: SessionStatus): string {
  switch (status) {
    case "listening": return "Listening...";
    case "recording": return "Recording...";
    case "transcribing": return "Transcribing...";
    case "thinking": return "Thinking...";
    case "speaking": return "AI speaking...";
    case "completed": return "Completed";
    case "error": return "Error";
    default: return status;
  }
}

export function getStatusColor(status: SessionStatus): { badge: string; dot: string; label: string } {
  switch (status) {
    case "listening":
    case "recording":
      return { badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600", dot: "bg-emerald-500 animate-pulse", label: getStatusLabel(status) };
    case "transcribing":
      return { badge: "bg-amber-500/10 border-amber-500/30 text-amber-700", dot: "bg-amber-500 animate-pulse", label: getStatusLabel(status) };
    case "thinking":
      return { badge: "bg-indigo-500/10 border-indigo-500/30 text-indigo-600", dot: "bg-indigo-500 animate-pulse", label: getStatusLabel(status) };
    case "speaking":
      return { badge: "bg-sky-500/10 border-sky-500/30 text-sky-600", dot: "bg-sky-500 animate-ping", label: getStatusLabel(status) };
    case "error":
      return { badge: "bg-destructive/10 border-destructive/30 text-destructive", dot: "bg-destructive", label: getStatusLabel(status) };
    case "completed":
      return { badge: "bg-muted border-border text-muted-foreground", dot: "bg-muted-foreground", label: getStatusLabel(status) };
    default:
      return { badge: "bg-card border-border text-muted-foreground", dot: "bg-slate-400", label: getStatusLabel(status) };
  }
}
