"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Volume2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Minimize2,
  Mic,
  Square,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSettingsStore } from "@/stores/settings-store";
import { transcribeViaServer } from "@/lib/stt/service";
import { MicButton } from "@/components/voice/MicButton";
import { Waveform } from "@/components/voice/Waveform";
import { soundEffects } from "@/lib/audio/audio-chimes";
import type { TargetedCorrection, RepairEvaluationResult, RetrySession } from "@/types/retry-loop";

interface RetryFeedbackPanelProps {
  session: RetrySession;
  onRecordAttempt: (spokenText: string, durationMs: number) => Promise<RepairEvaluationResult | null>;
  onListenModelAudio: () => void;
  onRequestSimplify: () => void;
  onCompleteAndContinue: () => void;
  isEvaluating?: boolean;
}

export function RetryFeedbackPanel({
  session,
  onRecordAttempt,
  onListenModelAudio,
  onRequestSimplify,
  onCompleteAndContinue,
  isEvaluating = false,
}: RetryFeedbackPanelProps) {
  const tts = useBrowserTTS();
  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");

  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(session.currentAttemptNumber >= 2);

  const correction = session.targetCorrection;
  const isResolved = session.isResolved;

  // Handle Play Model Audio TTS (User clicked explicitly)
  const handlePlayModelTTS = () => {
    onListenModelAudio();
    tts.speak(correction.betterSentence);
  };

  // Start Mic Recording
  const handleStartRecord = async () => {
    soundEffects.playMicStart();
    speechRec.resetTranscript();
    setRecordingStartTime(Date.now());
    const settings = useSettingsStore.getState();
    const isBrowserSTT = (settings.stt?.provider || "browser") === "browser";
    try {
      await recorder.start();
      if (isBrowserSTT) {
        speechRec.startListening();
      }
    } catch {}
  };

  // Stop Mic Recording & Submit Repair Attempt
  const handleStopRecord = async () => {
    if (recorder.status !== "recording") return;
    soundEffects.playMicStop();
    const settings = useSettingsStore.getState();
    const sttProvider = settings.stt?.provider || "browser";
    const sttModel =
      settings.stt?.model ||
      (sttProvider === "groq" ? "whisper-large-v3" : "onnx-community/whisper-tiny.en");

    speechRec.stopListening();
    const durationMs = Math.max(600, Date.now() - recordingStartTime);

    try {
      const recording = await recorder.stop();
      let spokenText = "";

      if (sttProvider !== "browser" && recording?.blob) {
        try {
          const res = await transcribeViaServer(recording.blob, {
            provider: sttProvider === "auto" ? "whisper-local" : sttProvider,
            model: sttModel,
            language: "en-US",
          });
          spokenText = res.text.trim();
        } catch {
          spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
        }
      } else {
        await new Promise((r) => setTimeout(r, 400));
        spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
      }

      if (spokenText) {
        const res = await onRecordAttempt(spokenText, durationMs);
        if (res?.isSuccessful) {
          soundEffects.playSuccessFanfare();
        }
      }
    } catch {}
  };

  return (
    <Card className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-md overflow-hidden animate-in fade-in-0 duration-300">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500 text-white font-mono text-xs font-bold gap-1 px-2.5 py-0.5 rounded-full shadow-xs">
              <RotateCcw className="size-3 animate-spin-slow" />
              <span>Retry Loop • Sửa sai trực tiếp</span>
            </Badge>
            <Badge variant="outline" className="text-xs font-mono border-amber-500/30 text-amber-700 dark:text-amber-300">
              Lần thử {session.currentAttemptNumber}
            </Badge>
          </div>

          {session.isSelfCorrected && (
            <Badge className="bg-emerald-500 text-white font-mono text-xs gap-1">
              <ShieldCheck className="size-3.5" />
              <span>Self-Correction Bonus!</span>
            </Badge>
          )}
        </div>

        {/* Minimal Correction Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="size-4" />
              <span>Điểm cần sửa (Minimal Fix):</span>
            </span>

            {/* Listen Button (Explicit Click per user preference) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePlayModelTTS}
              className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Volume2 className="size-3.5" />
              <span>Nghe mẫu (Listen)</span>
            </Button>
          </div>

          {/* Erroneous vs Correction Contrast Box */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-base font-bold">
                <span className="line-through text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                  "{correction.userErroneousText}"
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  "{correction.minimalCorrection}"
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{correction.explanationVi}</p>
            </div>

            <div className="text-right hidden sm:block">
              <Badge variant="secondary" className="text-[11px] font-mono capitalize">
                {correction.whatToFix}
              </Badge>
            </div>
          </div>
        </div>

        {/* Model Sentence / Skeleton Hint / Simplified Version */}
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Sparkles className="size-3" />
              {session.isSimplified
                ? "Câu đã được rút gọn (Cognitive Reduction):"
                : showSkeleton && correction.skeletonHint
                ? "Khung khuyết từ (Skeleton Support):"
                : "Câu bản xứ hoàn chỉnh:"}
            </span>

            {/* Graduated Support Toggles */}
            <div className="flex items-center gap-1.5">
              {!session.isSimplified && correction.skeletonHint && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSkeleton(!showSkeleton)}
                  className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="size-3 mr-1" />
                  {showSkeleton ? "Hiện câu đầy đủ" : "Gợi ý khung từ"}
                </Button>
              )}

              {session.currentAttemptNumber >= 2 && !session.isSimplified && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRequestSimplify}
                  className="h-6 text-[10px] px-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                >
                  <Minimize2 className="size-3 mr-1" />
                  Rút gọn câu
                </Button>
              )}
            </div>
          </div>

          <p className="font-mono text-sm font-bold text-foreground">
            "{session.isSimplified && correction.simplifiedSentence
              ? correction.simplifiedSentence
              : showSkeleton && correction.skeletonHint
              ? correction.skeletonHint
              : correction.betterSentence}"
          </p>
        </div>

        {/* Live Speaking Interface OR Success Verification */}
        {isResolved ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3 animate-in zoom-in-95 duration-200">
            <div className="size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">✓ Sửa lỗi thành công! (Repaired)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bạn đã khắc phục hoàn chỉnh lỗi và nói lại câu bằng giọng nói rất tự tin.
              </p>
            </div>
            <Button
              size="lg"
              onClick={onCompleteAndContinue}
              className="rounded-2xl font-bold gap-2 px-6 shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white btn-spring"
            >
              <span>Tiếp tục (Continue)</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Live Transcript & Waveform during recording */}
            {recorder.status === "recording" && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1.5 text-red-500 animate-pulse font-semibold">
                    <span className="size-2 rounded-full bg-red-500" />
                    Đang ghi âm lượt sửa...
                  </span>
                  <span>{(recordingDurationMs / 1000).toFixed(1)}s</span>
                </div>
                <Waveform active={true} variant="amber" />
                {speechRec.fullTranscript && (
                  <p className="font-mono text-sm text-foreground font-semibold">
                    "{speechRec.fullTranscript}"
                  </p>
                )}
              </div>
            )}

            {/* Speaking Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Hãy bấm nút và nói lại cả câu tiếng Anh đã sửa:
              </span>

              {recorder.status === "recording" ? (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleStopRecord}
                  disabled={isEvaluating}
                  className="rounded-2xl font-bold gap-2 px-6 shadow-md animate-pulse"
                >
                  <Square className="size-4 fill-white" />
                  <span>Dừng & Đánh giá</span>
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleStartRecord}
                  disabled={isEvaluating}
                  className="rounded-2xl font-bold gap-2 px-6 shadow-md shadow-amber-500/25 bg-gradient-to-r from-amber-500 to-orange-500 text-white btn-spring"
                >
                  <Mic className="size-4" />
                  <span>Nói lại câu này (Say It Again)</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
