import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MicButton } from "@/components/voice/MicButton";
import { Waveform } from "@/components/voice/Waveform";
import {
  Keyboard,
  Send,
  Sparkles,
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
  liveTranscript,
  durationMs,
  autoStartMic,
  onToggleAutoStartMic,
  onStartRecord,
  onStopRecord,
  onSubmitTextFallback,
  isEvaluating,
  onResetLiveTranscript,
  pendingText,
  onConfirmSubmit,
  onReRecord,
  compact = false,
}: SpeakingControllerProps) {
  const [textInput, setTextInput] = useState("");

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSubmitTextFallback(textInput.trim());
    setTextInput("");
  };

  const isRecording = status === "recording";
  const hasPendingReview = Boolean(pendingText && !isRecording && !isEvaluating);

  // Keyboard shortcut: Enter to submit pending, Z / Backspace / Delete to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Enter" && hasPendingReview) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onConfirmSubmit?.();
      } else if (
        (e.code === "KeyZ" || e.code === "Backspace" || e.code === "Delete") &&
        hasPendingReview
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onResetLiveTranscript?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPendingReview, onConfirmSubmit, onResetLiveTranscript]);

  return (
    <Card className="h-full flex flex-col justify-between rounded-none border-2 border-border bg-card shadow-[4px_4px_0px_var(--industrial-shadow-color)] overflow-hidden relative">
      <CardContent
        className={
          compact
            ? "p-3 sm:p-3.5 flex flex-col justify-between h-full space-y-2.5"
            : "p-4 md:p-5 flex flex-col justify-between h-full space-y-3.5"
        }
      >
        {/* Top Industrial Control Strip (JapSpeak BuilderSpeakingController Style) */}
        <div
          className={`flex items-center justify-between border-b-2 border-border ${
            compact ? "pb-2" : "pb-2.5"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`size-2.5 border border-border shrink-0 ${
                isEvaluating
                  ? "bg-amber-500 animate-ping"
                  : isRecording
                  ? "bg-primary animate-pulse"
                  : hasPendingReview
                  ? "bg-[#00E676]"
                  : "bg-accent"
              }`}
            />
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-foreground truncate">
              {isEvaluating
                ? "EVAL // AI SCORING"
                : isRecording
                ? "REC // CAPTURING VOICE"
                : hasPendingReview
                ? "BUF // VERIFY UTTERANCE"
                : "3. THU ÂM PHẢN XẠ"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-1.5 py-0.5 bg-foreground text-accent border border-border font-mono text-[9px] font-extrabold uppercase">
              LIVE STT
            </span>
            {/* Auto Mic Hardware Switch */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary border-[1.5px] border-border">
              <Switch
                id="auto-mic"
                checked={autoStartMic}
                onCheckedChange={onToggleAutoStartMic}
                disabled={isEvaluating}
                className="scale-75"
              />
              <Label
                htmlFor="auto-mic"
                className="text-[9px] font-mono font-extrabold uppercase cursor-pointer text-foreground select-none"
              >
                AUTO
              </Label>
            </div>
          </div>
        </div>

        {/* Central Voice Arena */}
        <div
          className={`flex-1 flex flex-col items-center justify-center my-auto ${
            compact ? "space-y-2.5 py-1" : "space-y-3.5"
          }`}
        >
          {/* 1. DEDICATED AI EVALUATING LOADING VIEW */}
          {isEvaluating ? (
            <div
              className={`w-full ${
                compact ? "max-w-sm p-3.5 space-y-2.5" : "max-w-md p-4 space-y-3"
              } bg-foreground text-background border-2 border-border shadow-[4px_4px_0px_var(--industrial-shadow-color)] flex flex-col items-center justify-center animate-in fade-in-0 duration-150 text-center`}
            >
              <div className="size-11 bg-primary text-primary-foreground border-2 border-border flex items-center justify-center">
                <Loader2 className="size-5 animate-spin stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-accent flex items-center justify-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <span>AI KERNEL EVALUATING...</span>
                </h3>
                <p className="text-[11px] font-mono text-background/80 max-w-xs leading-relaxed">
                  Đang phân tích cấu trúc câu, ngữ pháp, độ tự nhiên và tốc độ phản xạ TTFW.
                </p>
              </div>

              <div className="w-40 h-2 bg-background/20 border border-background/40 overflow-hidden">
                <div className="h-full bg-accent w-full animate-pulse" />
              </div>
            </div>
          ) : hasPendingReview ? (
            /* 2. REVIEW & SUBMIT CARD (JapSpeak Style) */
            <div
              className={`w-full ${
                compact ? "max-w-sm p-3 space-y-2.5" : "max-w-md p-3.5 space-y-3"
              } bg-background border-2 border-border shadow-[3px_3px_0px_var(--industrial-shadow-color)] animate-in fade-in-0 duration-150`}
            >
              <div className="flex items-center justify-between border-b-2 border-border pb-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-foreground">
                  <CheckCircle2 className="size-3.5 text-[#00A854]" />
                  <span>BẢN GHI GIỌNG NÓI:</span>
                </div>
                <span className="px-1.5 py-0.5 bg-accent text-accent-foreground border border-border text-[9px] font-mono font-extrabold uppercase">
                  READY TO SUBMIT
                </span>
              </div>

              <div
                className={`${
                  compact ? "p-2.5 text-xs sm:text-sm" : "p-3 text-sm sm:text-base"
                } bg-card text-foreground border-2 border-border font-serif font-extrabold leading-relaxed text-center shadow-[2px_2px_0px_var(--industrial-shadow-color)]`}
              >
                &ldquo;{pendingText}&rdquo;
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-0.5">
                {onResetLiveTranscript && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onResetLiveTranscript}
                    className="text-[10px] font-mono font-extrabold gap-1 text-destructive border-2 border-border h-8 px-2 bg-card"
                    title="Xoá câu này [Z]"
                  >
                    <Trash2 className="size-3.5" />
                    <span>XOÁ [Z]</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onReRecord || onStartRecord}
                  className="text-[10px] font-mono font-extrabold gap-1 h-8 px-2.5 border-2 border-border bg-card"
                  title="Thu âm lại câu này [Space]"
                >
                  <RotateCcw className="size-3.5" />
                  <span>THU LẠI</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={onConfirmSubmit}
                  disabled={!pendingText?.trim()}
                  className="text-[10px] font-mono font-extrabold gap-1 bg-primary text-primary-foreground border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] h-8 px-3 flex-1"
                  title="Nộp bài cho AI chấm điểm [Enter]"
                >
                  <Send className="size-3.5" />
                  <span>NỘP BÀI [ENTER]</span>
                </Button>
              </div>
            </div>
          ) : (
            /* 3. NORMAL RECORDING / IDLE ARENA */
            <>
              <div className="relative flex flex-col items-center">
                <MicButton
                  status={status}
                  onStart={onStartRecord}
                  onStop={onStopRecord}
                  disabled={isEvaluating}
                  durationMs={isRecording ? durationMs : undefined}
                  size={compact ? "md" : "lg"}
                  label={
                    isRecording
                      ? compact
                        ? "DỪNG NÓI [SPACE]"
                        : "NHẤN MIC HOẶC [SPACE] ĐỂ DỪNG NÓI"
                      : compact
                      ? "BẮT ĐẦU NÓI [SPACE]"
                      : "NHẤN MIC HOẶC [SPACE] ĐỂ BẮT ĐẦU NÓI"
                  }
                />
              </div>

              {/* Dynamic Waveform during Recording */}
              {isRecording && (
                <div className="w-full max-w-xs animate-in fade-in-0 duration-150">
                  <Waveform active={true} bars={compact ? 14 : 18} variant="emerald" />
                </div>
              )}

              {/* Live Transcript Box (JapSpeak Dashed Readiness Box) */}
              {liveTranscript ? (
                <div
                  className={`w-full ${
                    compact ? "max-w-sm p-2.5 space-y-1" : "max-w-md p-3 space-y-1.5"
                  } bg-background text-foreground border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] text-center animate-in fade-in-0`}
                >
                  <div className="flex items-center justify-between border-b border-border pb-1">
                    <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-primary">
                      ● LIVE STT STREAM:
                    </span>
                    {isRecording && onResetLiveTranscript && (
                      <button
                        type="button"
                        onClick={onResetLiveTranscript}
                        className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 bg-card hover:bg-destructive hover:text-white text-foreground border border-border flex items-center gap-1 cursor-pointer"
                        title="Xoá phần vừa nói và nói lại từ đầu (Phím Backspace)"
                      >
                        <RotateCcw className="size-2.5" />
                        <span>RESET [BKSP]</span>
                      </button>
                    )}
                  </div>
                  <p
                    className={`${
                      compact ? "text-xs sm:text-sm" : "text-sm md:text-base"
                    } font-extrabold text-foreground font-serif leading-snug pt-0.5`}
                  >
                    &ldquo;{liveTranscript}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="w-full border-2 border-dashed border-border bg-background px-3 py-2 text-center font-mono text-[11px] font-bold text-muted-foreground">
                  {isRecording
                    ? "● ĐANG THU TÍN HIỆU... BẤM [SPACE] KHI NÓI XONG"
                    : "Sẵn sàng thu âm — Nhấn nút Mic màu vàng chanh hoặc phím [Space]"}
                </div>
              )}
            </>
          )}
        </div>

        {/* Always-Visible Bottom Quick Keyboard Input Bar (JapSpeak ZenUnifiedInputBar Style) */}
        <div className="pt-2.5 border-t-2 border-border space-y-1.5">
          <form
            onSubmit={handleTextSubmit}
            className="flex items-center gap-1.5 p-1 bg-background border-2 border-border shadow-[2px_2px_0px_var(--industrial-shadow-color)] focus-within:border-primary transition-colors"
          >
            <div className="pl-2 text-muted-foreground shrink-0">
              <Keyboard className="size-3.5 stroke-[2.25]" />
            </div>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Gõ nhanh câu tiếng Anh tại đây hoặc bấm [Space] để nói..."
              disabled={isEvaluating}
              className="flex-1 min-w-0 bg-transparent text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground focus:outline-none py-1.5 px-1"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isEvaluating}
              className="px-2.5 py-1.5 bg-foreground text-background hover:bg-primary hover:text-primary-foreground disabled:opacity-40 font-mono text-[10px] font-extrabold uppercase border border-border flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
            >
              <Send className="size-3" />
              <span>NỘP</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[9px] font-mono font-extrabold text-muted-foreground px-0.5">
            <span>PHÍM TẮT NHANH:</span>
            <span>[SPACE] THU ÂM • [ENTER] NỘP • [Z] XOÁ</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
