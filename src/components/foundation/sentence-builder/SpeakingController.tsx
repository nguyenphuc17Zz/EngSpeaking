import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MicButton } from "@/components/voice/MicButton";
import { Waveform } from "@/components/voice/Waveform";
import {
  Keyboard,
  Send,
  Sparkles,
  HelpCircle,
  Volume2,
  Mic,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Trash2,
} from "lucide-react";

interface SpeakingControllerProps {
  status: "idle" | "requesting" | "recording" | "processing";
  isListening: boolean;
  liveTranscript: string;
  durationMs: number;
  autoStartMic: boolean;
  onToggleAutoStartMic: (val: boolean) => void;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onSubmitTextFallback: (text: string) => void;
  onOpenHints: () => void;
  isEvaluating: boolean;
  onResetLiveTranscript?: () => void;
  pendingText?: string | null;
  onConfirmSubmit?: () => void;
  onReRecord?: () => void;
  compact?: boolean;
}

export function SpeakingController({
  status,
  isListening,
  liveTranscript,
  durationMs,
  autoStartMic,
  onToggleAutoStartMic,
  onStartRecord,
  onStopRecord,
  onSubmitTextFallback,
  onOpenHints,
  isEvaluating,
  onResetLiveTranscript,
  pendingText,
  onConfirmSubmit,
  onReRecord,
  compact = false,
}: SpeakingControllerProps) {
  const [showFallbackText, setShowFallbackText] = useState(false);
  const [textInput, setTextInput] = useState("");

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSubmitTextFallback(textInput.trim());
    setTextInput("");
  };

  const isRecording = status === "recording";
  const hasPendingReview = Boolean(pendingText && !isRecording && !isEvaluating);

  // Keyboard shortcut: Enter to submit pending, Z / Backspace / Delete to clear, Space to toggle/re-record
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Enter" && hasPendingReview) {
        e.preventDefault();
        onConfirmSubmit?.();
      } else if (
        (e.code === "KeyZ" || e.code === "Backspace" || e.code === "Delete") &&
        hasPendingReview
      ) {
        e.preventDefault();
        onResetLiveTranscript?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPendingReview, onConfirmSubmit, onResetLiveTranscript]);

  return (
    <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-card/95 shadow-sm overflow-hidden relative">
      <CardContent className={compact ? "p-3.5 sm:p-4 flex flex-col justify-between h-full space-y-2.5" : "p-5 md:p-6 flex flex-col justify-between h-full space-y-4"}>
        {/* Top Header in Right Column */}
        <div className={`flex items-center justify-between border-b border-border/40 ${compact ? "pb-2" : "pb-3"}`}>
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${
                isEvaluating
                  ? "bg-amber-500 animate-ping"
                  : isRecording
                  ? "bg-emerald-500 animate-pulse"
                  : hasPendingReview
                  ? "bg-primary animate-pulse"
                  : "bg-muted-foreground/50"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isEvaluating
                ? "AI đang chấm điểm & phân tích"
                : isRecording
                ? "Đang thu âm phản xạ"
                : hasPendingReview
                ? "Kiểm tra câu trước khi nộp"
                : "Phòng thu giọng nói"}
            </span>
          </div>

          {/* Auto Mic Toggle */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60">
            <Switch
              id="auto-mic"
              checked={autoStartMic}
              onCheckedChange={onToggleAutoStartMic}
              disabled={isEvaluating}
              className="scale-75"
            />
            <Label htmlFor="auto-mic" className="text-[11px] cursor-pointer text-muted-foreground font-medium select-none">
              Tự bật mic
            </Label>
          </div>
        </div>

        {/* Central Voice Arena */}
        <div className={`flex-1 flex flex-col items-center justify-center my-auto ${compact ? "space-y-2.5 py-1" : "space-y-4"}`}>
          {/* 1. DEDICATED AI EVALUATING LOADING VIEW */}
          {isEvaluating ? (
            <div className={`w-full ${compact ? "max-w-sm p-4 rounded-2xl space-y-2.5" : "max-w-md p-6 sm:p-7 rounded-3xl space-y-4"} bg-gradient-to-br from-primary/10 via-amber-500/10 to-primary/5 border border-primary/40 shadow-lg flex flex-col items-center justify-center animate-in fade-in-0 zoom-in-95 duration-200 text-center`}>
              <div className="relative">
                <div className="absolute -inset-2.5 rounded-full bg-primary/20 blur-md animate-pulse" />
                <div className={`relative ${compact ? "size-12 rounded-xl" : "size-16 rounded-2xl"} bg-card border border-primary/40 flex items-center justify-center shadow-md`}>
                  <Loader2 className={`${compact ? "size-6" : "size-8"} text-primary animate-spin`} />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className={`${compact ? "text-sm" : "text-base sm:text-lg"} font-bold text-foreground flex items-center justify-center gap-1.5`}>
                  <Sparkles className="size-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                  <span>AI đang chấm điểm & phân tích...</span>
                </h3>
                <p className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground max-w-xs leading-relaxed`}>
                  Đang kiểm tra cấu trúc câu, ngữ pháp, độ tự nhiên và tốc độ bật âm phản xạ.
                </p>
              </div>

              {/* Shimmer Progress Indicator */}
              <div className="w-40 h-1.5 bg-muted/80 rounded-full overflow-hidden relative">
                <div className="h-full bg-gradient-to-r from-primary via-amber-500 to-primary rounded-full w-full animate-pulse" />
              </div>

              <span className="text-[10px] font-mono text-muted-foreground">
                Đang xử lý kết quả tức thì...
              </span>
            </div>
          ) : hasPendingReview ? (
            /* 2. REVIEW & SUBMIT CARD (Không gửi liền, có nút nộp bài) */
            <div className={`w-full ${compact ? "max-w-sm p-3.5 rounded-2xl space-y-2.5" : "max-w-md p-5 rounded-3xl space-y-4"} bg-card border-2 border-primary/40 shadow-md animate-in fade-in-0 slide-in-from-bottom-3 duration-200`}>
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <span>Câu nói đã ghi nhận:</span>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                  Sẵn sàng nộp
                </Badge>
              </div>

              <div className={`${compact ? "p-2.5 text-xs sm:text-sm" : "p-3.5 text-sm sm:text-base"} rounded-2xl bg-muted/30 border border-border/70 font-mono font-bold text-foreground leading-relaxed text-center`}>
                "{pendingText}"
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                {onResetLiveTranscript && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onResetLiveTranscript}
                    className="rounded-xl text-xs font-semibold gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10 btn-spring h-8 px-2.5"
                    title="Xoá câu này [Z]"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Xoá [Z]</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onReRecord || onStartRecord}
                  className="rounded-xl text-xs font-semibold gap-1 border-border/80 hover:bg-muted btn-spring h-8 px-2.5"
                  title="Thu âm lại câu này [Space]"
                >
                  <RotateCcw className="size-3.5 text-muted-foreground" />
                  <span>Thu lại</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={onConfirmSubmit}
                  disabled={!pendingText?.trim()}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 btn-spring h-8 px-3 flex-1"
                  title="Nộp bài cho AI chấm điểm [Enter]"
                >
                  <Send className="size-3.5" />
                  <span>Nộp bài [Enter]</span>
                </Button>
              </div>
            </div>
          ) : (
            /* 3. NORMAL RECORDING / IDLE ARENA */
            <>
              {/* Main Mic Widget */}
              <div className="relative flex flex-col items-center">
                {isRecording && (
                  <div className="absolute inset-0 -m-3 rounded-full bg-emerald-500/15 animate-ping pointer-events-none" />
                )}

                <MicButton
                  status={status}
                  onStart={onStartRecord}
                  onStop={onStopRecord}
                  disabled={isEvaluating}
                  durationMs={isRecording ? durationMs : undefined}
                  size={compact ? "md" : "lg"}
                  label={
                    isRecording
                      ? (compact ? "Dừng nói [Space]" : "Nhấn Mic hoặc [Space] để dừng nói")
                      : (compact ? "Bắt đầu nói [Space]" : "Nhấn Mic hoặc [Space] để bắt đầu nói")
                  }
                />
              </div>

              {/* Dynamic Waveform during Recording */}
              {isRecording && (
                <div className="w-full max-w-xs animate-in fade-in-0 duration-200">
                  <Waveform active={true} bars={compact ? 14 : 18} variant="emerald" />
                </div>
              )}

              {/* Live Transcript Karaoke Bubble with Quick Reset */}
              {liveTranscript ? (
                <div className={`w-full ${compact ? "max-w-sm p-2.5 rounded-2xl space-y-1" : "max-w-md p-3.5 rounded-2xl space-y-1.5"} bg-primary/5 border border-primary/20 text-center animate-in fade-in-0 slide-in-from-bottom-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                      Phụ đề trực tiếp:
                    </span>
                    {isRecording && onResetLiveTranscript && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onResetLiveTranscript}
                        className="h-4 text-[9px] px-1.5 rounded font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 gap-0.5 border border-border/40"
                        title="Xoá phần vừa nói và nói lại từ đầu (Phím Backspace)"
                      >
                        <RotateCcw className="size-2" />
                        <span>Xoá [Backspace]</span>
                      </Button>
                    )}
                  </div>
                  <p className={`${compact ? "text-xs sm:text-sm" : "text-sm md:text-base"} font-semibold text-foreground font-mono leading-snug`}>
                    "{liveTranscript}"
                  </p>
                </div>
              ) : !isRecording ? (
                <p className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground text-center max-w-xs`}>
                  Nói to, rõ ràng cả câu tiếng Anh ngay khi sẵn sàng.
                </p>
              ) : (
                <p className={`${compact ? "text-[11px]" : "text-xs"} text-emerald-600 dark:text-emerald-400 text-center font-mono`}>
                  Đang lắng nghe... [Space] khi nói xong.
                </p>
              )}
            </>
          )}
        </div>


        {/* Fallback Text Input Form (if toggled) */}
        {showFallbackText && (
          <form
            onSubmit={handleTextSubmit}
            className="p-3 rounded-2xl bg-muted/40 border border-border/80 space-y-2 animate-in fade-in-0 duration-150"
          >
            <div className="flex gap-2">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Nhập câu tiếng Anh bạn định nói..."
                rows={1}
                disabled={isEvaluating}
                className="rounded-xl text-xs resize-none bg-background min-h-[36px]"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!textInput.trim() || isEvaluating}
                className="h-9 px-3 rounded-xl font-bold text-xs gap-1 shrink-0"
              >
                <Send className="size-3.5" />
                <span>Nộp</span>
              </Button>
            </div>
          </form>
        )}

        {/* Bottom Auxiliary Tools */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
          <Button
            variant="ghost"
            size="sm"
            disabled={isEvaluating}
            onClick={() => setShowFallbackText(!showFallbackText)}
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2.5 rounded-lg"
          >
            <Keyboard className="size-3.5" />
            <span>{showFallbackText ? "Đóng nhập phím" : "Nhập phím (Dự phòng)"}</span>
          </Button>

          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            [Space] Bắt đầu/Dừng • [Enter] Nộp bài • [Backspace] Xoá nói lại
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
