"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

  return (
    <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-card/95 shadow-sm overflow-hidden relative">
      <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full space-y-4">
        {/* Top Header in Right Column */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isEvaluating ? "Đang xử lý kết quả" : isRecording ? "Đang thu âm phản xạ" : "Phòng thu giọng nói"}
            </span>
          </div>

          {/* Auto Mic Toggle */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60">
            <Switch
              id="auto-mic"
              checked={autoStartMic}
              onCheckedChange={onToggleAutoStartMic}
              className="scale-75"
            />
            <Label htmlFor="auto-mic" className="text-[11px] cursor-pointer text-muted-foreground font-medium select-none">
              Tự bật mic
            </Label>
          </div>
        </div>

        {/* Central Voice Arena */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 my-auto">
          {/* Main Mic Widget */}
          <div className="relative flex flex-col items-center">
            {isRecording && (
              <div className="absolute inset-0 -m-3 rounded-full bg-emerald-500/15 animate-ping pointer-events-none" />
            )}

            <MicButton
              status={isEvaluating ? "processing" : status}
              onStart={onStartRecord}
              onStop={onStopRecord}
              disabled={isEvaluating}
              durationMs={isRecording ? durationMs : undefined}
              size="lg"
              label={
                isRecording
                  ? "Nhấn Mic hoặc [Space] để dừng và nộp câu"
                  : isEvaluating
                  ? "AI đang chấm điểm và phân tích..."
                  : "Nhấn Mic hoặc [Space] để nói"
              }
            />
          </div>

          {/* Dynamic Waveform during Recording */}
          {isRecording && (
            <div className="w-full max-w-xs animate-in fade-in-0 duration-200">
              <Waveform active={true} bars={18} variant="emerald" />
            </div>
          )}

          {/* Live Transcript Karaoke Bubble with Quick Reset */}
          {liveTranscript ? (
            <div className="w-full max-w-md p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-center animate-in fade-in-0 slide-in-from-bottom-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Phụ đề trực tiếp:
                </span>
                {isRecording && onResetLiveTranscript && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onResetLiveTranscript}
                    className="h-5 text-[10px] px-2 rounded-md font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 gap-1 border border-border/40"
                    title="Xoá phần vừa nói và nói lại từ đầu (Phím Backspace)"
                  >
                    <RotateCcw className="size-2.5" />
                    <span>Xoá nói lại [Backspace]</span>
                  </Button>
                )}
              </div>
              <p className="text-sm md:text-base font-semibold text-foreground font-mono leading-snug">
                "{liveTranscript}"
              </p>
            </div>
          ) : !isRecording && !isEvaluating ? (
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Nói to, rõ ràng cả câu tiếng Anh ngay khi sẵn sàng.
            </p>
          ) : isRecording ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-mono">
              Đang lắng nghe... Bạn có thể nhấn [Backspace] để xoá nói lại bất kỳ lúc nào.
            </p>
          ) : null}
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
                className="rounded-xl text-xs resize-none bg-background min-h-[36px]"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!textInput.trim() || isEvaluating}
                className="h-9 px-3 rounded-xl font-bold text-xs gap-1 shrink-0"
              >
                <Send className="size-3.5" />
                <span>Gửi</span>
              </Button>
            </div>
          </form>
        )}

        {/* Bottom Auxiliary Tools */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFallbackText(!showFallbackText)}
            className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-2.5 rounded-lg"
          >
            <Keyboard className="size-3.5" />
            <span>{showFallbackText ? "Đóng nhập phím" : "Nhập phím (Dự phòng)"}</span>
          </Button>

          <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
            [Space] Bắt đầu/Dừng • [Backspace] Xoá nói lại
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
