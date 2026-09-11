"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import {
  RotateCcw,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  Flame,
  Volume2,
  RefreshCw,
  Loader2,
  Settings,
  HelpCircle,
  X,
  Play,
} from "lucide-react";

import { useRetryLoopStore } from "@/stores/retry-loop-store";
import { useSettingsStore } from "@/stores/settings-store";
import { RepairPromptCard } from "@/components/foundation/retry-loop/RepairPromptCard";
import { RepairFeedbackCard } from "@/components/foundation/retry-loop/RepairFeedbackCard";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { getErrorBankRecords } from "@/lib/foundation/sentence-builder/error-bank.service";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { soundEffects } from "@/lib/audio/audio-chimes";
import type { ErrorBankRecord } from "@/types/sentence-builder";

export default function SpokenRepairLabPage() {
  const {
    activeSession,
    metrics,
    isEvaluatingRepair,
    isGeneratingChallenge,
    isGeneratingCorrection,
    lastRepairResult,
    generationError,
    clearGenerationError,
    generateAiRepairChallenge,
    startRepairSession,
    submitRepairSpokenAttempt,
    closeActiveSession,
  } = useRetryLoopStore();

  const [errorRecords, setErrorRecords] = useState<ErrorBankRecord[]>([]);
  const [currentHintTier, setCurrentHintTier] = useState(0);
  const [autoStartMic, setAutoStartMic] = useState(false);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState<number | null>(null);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(1500);

  // Audio / Speech Hooks
  const tts = useBrowserTTS();
  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [elapsedDurationMs, setElapsedDurationMs] = useState(0);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const autoLaunchedRef = useRef(false);

  // Load Error Bank records for lobby and auto-launch if ?recordId=... is passed
  useEffect(() => {
    try {
      const records = getErrorBankRecords();
      setErrorRecords(records);

      if (typeof window !== "undefined" && !autoLaunchedRef.current && !activeSession) {
        const urlParams = new URLSearchParams(window.location.search);
        const recordId = urlParams.get("recordId") || urlParams.get("errorId");
        if (recordId) {
          const target = records.find((r) => r.id === recordId);
          if (target) {
            autoLaunchedRef.current = true;
            handleStartFromErrorBank(target);
          }
        }
      }
    } catch {}
  }, [activeSession]);

  // Handle Prep Countdown Timer when a new session starts
  useEffect(() => {
    if (!activeSession || lastRepairResult) {
      setPrepSecondsLeft(null);
      return;
    }

    setPrepSecondsLeft(2.0);
    const start = Date.now();
    const duration = 2000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const left = Math.max(0, (duration - elapsed) / 1000);
      setPrepSecondsLeft(Number(left.toFixed(1)));

      if (elapsed >= duration) {
        clearInterval(interval);
        setPrepSecondsLeft(null);
        if (autoStartMic) {
          handleStartRecord();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activeSession?.sessionId, autoStartMic, lastRepairResult]);

  // Track speech recording duration
  useEffect(() => {
    if (unifiedSTT.isListening) {
      durationTimerRef.current = setInterval(() => {
        setElapsedDurationMs(Date.now() - recordingStartTime);
      }, 100);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setElapsedDurationMs(0);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [unifiedSTT.isListening, recordingStartTime]);

  // Start Mic Recording
  const handleStartRecord = async () => {
    soundEffects.playMicStart();
    unifiedSTTRef.current.resetTranscript();
    setPendingSpokenText(null);
    setRecordingStartTime(Date.now());
    setElapsedDurationMs(0);
    try {
      await unifiedSTTRef.current.startListening();
    } catch {
      toast.error("Lỗi Micro", "Vui lòng cấp quyền micro cho trình duyệt.");
    }
  };

  // Stop Mic Recording -> Store in pending review state
  const handleStopRecord = async () => {
    if (!unifiedSTTRef.current.isListening) return;
    soundEffects.playMicStop();
    const durationMs = Math.max(600, Date.now() - recordingStartTime);

    try {
      const { text: spokenText } = await unifiedSTTRef.current.stopListening();
      if (spokenText) {
        setPendingSpokenText(spokenText);
        setPendingDurationMs(durationMs);
      } else {
        toast.info("Chưa phát hiện giọng nói", "Vui lòng nhấn Mic và thử nói lại câu đã sửa.");
      }
    } catch {
      toast.error("Lỗi hoàn thành thu âm", "Hãy thử nói lại câu.");
    }
  };

  // Evaluate attempt
  const evaluateSpokenAttempt = async (spokenText: string, durationMs: number) => {
    if (!activeSession) return;
    try {
      const res = await submitRepairSpokenAttempt({
        spokenTranscript: spokenText,
        responseLatencyMs: 1500,
        speechDurationMs: durationMs,
        expectedSentence: activeSession.targetCorrection.betterSentence,
      });

      if (res?.isSuccessful) {
        soundEffects.playAIReady();
      } else {
        soundEffects.playMicStop();
      }
    } finally {
      setPendingSpokenText(null);
    }
  };

  // User confirms submitting pending speech
  const handleConfirmSubmit = async () => {
    if (!pendingSpokenText) return;
    await evaluateSpokenAttempt(pendingSpokenText, pendingDurationMs);
  };

  // User decides to re-record
  const handleReRecord = () => {
    setPendingSpokenText(null);
    handleStartRecord();
  };

  // Handle Practice from Error Bank
  const handleStartFromErrorBank = async (record: ErrorBankRecord) => {
    const userText = record.examples[0]?.userText || record.labelVi || "lỗi khẩu ngữ";
    const correction = record.examples[0]?.correction || record.description || "câu chuẩn";
    const explanation = record.description || record.labelVi;

    setCurrentHintTier(0);
    setPendingSpokenText(null);
    await startRepairSession({
      originalTaskId: record.id,
      sourceContext: "retry_lab",
      originalPrompt: `Sửa lại lỗi sau trong câu: "${userText}"`,
      originalTranscript: userText,
      expectedSentence: correction,
      detectedErrors: [
        {
          type: record.category === "sentence_structure" ? "grammar" : record.category,
          userText,
          correction,
          explanation,
        },
      ],
    });
  };

  // Handle AI Instant Challenge
  const handleStartAiChallenge = async (category?: string) => {
    setCurrentHintTier(0);
    setPendingSpokenText(null);
    await generateAiRepairChallenge(category);
  };

  // Keyboard Shortcuts Handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture when typing in text fields
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      // Space: Toggle Mic / Re-record / Retry
      if (e.code === "Space") {
        e.preventDefault();
        if (activeSession && !lastRepairResult) {
          if (unifiedSTT.isListening) {
            handleStopRecord();
          } else if (pendingSpokenText) {
            handleReRecord();
          } else if (!isEvaluatingRepair) {
            handleStartRecord();
          }
        } else if (lastRepairResult) {
          // Retry same challenge
          useRetryLoopStore.setState({ lastRepairResult: null });
          setPendingSpokenText(null);
          setCurrentHintTier(0);
        }
      }

      // Backspace: Reset live transcript while keeping mic open
      if (e.code === "Backspace") {
        if (unifiedSTT.isListening) {
          e.preventDefault();
          unifiedSTTRef.current.resetTranscript();
          setPendingSpokenText(null);
          soundEffects.playMicStop();
        }
      }

      // Key H: Cycle Hints (0 -> 1 -> 2 -> 3 -> 4 -> 0)
      if (e.code === "KeyH" && !isEvaluatingRepair) {
        e.preventDefault();
        setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
      }

      // Enter: Confirm pending submit or Advance to next challenge
      if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluatingRepair) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (lastRepairResult) {
          e.preventDefault();
          handleStartAiChallenge();
        }
      }

      // Esc: Collapse hints or exit Studio
      if (e.code === "Escape") {
        e.preventDefault();
        if (currentHintTier > 0) {
          setCurrentHintTier(0);
        } else if (activeSession) {
          setPendingSpokenText(null);
          closeActiveSession();
        }
      }
    },
    [
      activeSession,
      lastRepairResult,
      unifiedSTT.isListening,
      currentHintTier,
      isEvaluatingRepair,
      pendingSpokenText,
      pendingDurationMs,
      handleConfirmSubmit,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const liveText = unifiedSTT.fullTranscript;

  // ==================== 1. STUDIO MODE (Active Session) ====================
  if (activeSession) {
    return (
      <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col overflow-hidden text-foreground rounded-3xl border border-border/80 bg-card shadow-xs">
        {/* Studio Top Header Bar */}
        <header className="h-14 border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeActiveSession}
              className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Thoát phòng thí nghiệm (Esc)"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Rời Studio</span>
            </Button>

            <div className="h-4 w-px bg-border/60 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <RotateCcw className="size-3.5 text-amber-500" />
                <span>Spoken Repair Lab</span>
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400 hidden md:inline-flex"
              >
                {activeSession.sourceContext === "retry_lab" ? "⚡ AI Challenge" : "📁 Error Bank"}
              </Badge>
            </div>
          </div>

          {/* Center: Preparation Timer */}
          {prepSecondsLeft !== null && prepSecondsLeft > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse">
              <Sparkles className="size-3.5" />
              <span className="text-xs font-bold font-mono">
                Chuẩn bị: {prepSecondsLeft.toFixed(1)}s
              </span>
            </div>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <GlobalAiSelector size="sm" />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleStartAiChallenge()}
              disabled={isGeneratingChallenge}
              className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 border-border/80 hover:border-primary/40 btn-spring shadow-2xs hidden sm:flex"
              title="AI Tạo câu sửa sai tiếp theo"
            >
              {isGeneratingChallenge ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-primary" />
              )}
              <span>Câu khác</span>
            </Button>
          </div>
        </header>

        {/* Generation Error Banner */}
        {generationError && (
          <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex items-center justify-between text-xs text-destructive shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{generationError}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartAiChallenge()}
                className="h-6 px-2 text-[11px] border-destructive/30 hover:bg-destructive/10 text-destructive"
              >
                Thử lại ngay
              </Button>
              <Link href="/settings">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                >
                  Kiểm tra API Key
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearGenerationError}
                className="size-6 p-0 text-destructive"
              >
                <X className="size-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Studio Main Body: 2 Columns Zero-Scroll */}
        <main className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-3 md:p-5 overflow-hidden">
          {/* Column 1: Repair Prompt & Hints Stepper (5 Cols) */}
          <section className="md:col-span-5 h-full overflow-hidden flex flex-col min-h-0">
            <RepairPromptCard
              session={activeSession}
              currentHintTier={currentHintTier}
              onSelectHintTier={setCurrentHintTier}
            />
          </section>

          {/* Column 2: Recording Controller or Detailed Evaluation Feedback (7 Cols) */}
          <section className="md:col-span-7 h-full overflow-hidden flex flex-col min-h-0">
            {!lastRepairResult ? (
              <SpeakingController
                status={
                  isEvaluatingRepair || unifiedSTT.isTranscribing
                    ? "processing"
                    : unifiedSTT.isListening
                    ? "recording"
                    : "idle"
                }
                isListening={unifiedSTT.isListening}
                liveTranscript={liveText}
                durationMs={elapsedDurationMs || unifiedSTT.audioRecorder.durationMs}
                autoStartMic={autoStartMic}
                onToggleAutoStartMic={setAutoStartMic}
                onStartRecord={handleStartRecord}
                onStopRecord={handleStopRecord}
                onSubmitTextFallback={(text) => evaluateSpokenAttempt(text, 1500)}
                onOpenHints={() => setCurrentHintTier((prev) => (prev >= 4 ? 1 : prev + 1))}
                isEvaluating={isEvaluatingRepair || unifiedSTT.isTranscribing}
                onResetLiveTranscript={() => {
                  unifiedSTTRef.current.resetTranscript();
                  setPendingSpokenText(null);
                }}
                pendingText={pendingSpokenText}
                onConfirmSubmit={handleConfirmSubmit}
                onReRecord={handleReRecord}
              />
            ) : (
              <RepairFeedbackCard
                session={activeSession}
                result={lastRepairResult}
                onRetry={() => {
                  useRetryLoopStore.setState({ lastRepairResult: null });
                  setPendingSpokenText(null);
                  setCurrentHintTier(0);
                }}
                onContinue={() => handleStartAiChallenge()}
              />
            )}
          </section>
        </main>

        {/* Studio Footer Keybindings Dock */}
        <footer className="h-10 border-t border-border/40 bg-card/80 px-4 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 select-none">
          <div className="flex items-center gap-3 overflow-x-auto py-1">
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
                Space
              </kbd>
              <span>{lastRepairResult ? "Nói lại" : pendingSpokenText ? "Thu âm lại" : "Nói / Dừng"}</span>
            </span>
            <span className="flex items-center gap-1 font-mono hidden sm:inline-flex">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
                Backspace
              </kbd>
              <span>Xóa nói lại</span>
            </span>
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
                H
              </kbd>
              <span>Đổi tầng gợi ý</span>
            </span>
            {pendingSpokenText && !isEvaluatingRepair ? (
              <span className="flex items-center gap-1 font-mono text-primary font-bold">
                <kbd className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground border text-[10px] font-bold">
                  Enter
                </kbd>
                <span>Nộp bài chấm điểm</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-mono hidden md:inline-flex">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
                  Enter
                </kbd>
                <span>Câu tiếp</span>
              </span>
            )}
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-bold text-foreground">
                Esc
              </kbd>
              <span>Đóng gợi ý / Thoát</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden md:inline">Spoken Repair Studio Active</span>
          </div>
        </footer>
      </div>
    );
  }

  // ==================== 2. LOBBY & DASHBOARD VIEW (When no active session) ====================
  return (
    <div className="space-y-8 pb-16 animate-in fade-in-0 duration-300 max-w-5xl mx-auto px-2 sm:px-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5">
          <Link href="/foundation">
            <Button variant="ghost" size="sm" className="size-9 p-0 rounded-full">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <RotateCcw className="size-4 text-amber-500" />
              <span>Spoken Repair Lab (Phòng Thí Nghiệm Sửa Sai)</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Chu trình Correct → Say Again: Biến nhận thức lỗi thành phản xạ khẩu ngữ tự nhiên
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlobalAiSelector size="sm" />
          <Badge variant="outline" className="text-xs font-mono border-amber-500/30 text-amber-600 dark:text-amber-400">
            Function 3 • Real AI
          </Badge>
        </div>
      </div>

      {/* Hero Action: AI Instant Challenge Generator */}
      <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-r from-primary/15 via-card to-amber-500/10 p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Sparkles className="size-4" />
              <span>Luyện Phản Xạ Sửa Sai Ngay Lập Tức</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-foreground">
              Khởi động Studio Sửa Lỗi với AI Thông Minh
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI sẽ mô phỏng các câu nói có lỗi điển hình của người Việt (thì quá khứ, chia động từ, giới từ, dịch thô). Nhiệm vụ của bạn là phát âm sửa lại cho tự nhiên nhất!
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => handleStartAiChallenge()}
            disabled={isGeneratingChallenge}
            className="rounded-2xl font-bold text-sm px-6 h-12 gap-2 btn-spring shadow-md shrink-0 w-full md:w-auto"
          >
            {isGeneratingChallenge ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>AI đang tạo câu...</span>
              </>
            ) : (
              <>
                <Play className="size-4 fill-current" />
                <span>Bắt đầu Luyện AI Ngay</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/80 text-center space-y-1 shadow-xs">
          <span className="text-[10px] text-muted-foreground font-semibold block">Tỉ lệ phục hồi (Recovery)</span>
          <span className="font-mono text-xl font-bold text-emerald-500">
            {metrics.errorRecoveryRate}%
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 text-center space-y-1 shadow-xs">
          <span className="text-[10px] text-muted-foreground font-semibold block">Sửa chuẩn lần đầu</span>
          <span className="font-mono text-xl font-bold text-primary">
            {metrics.firstRetrySuccessRate}%
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 text-center space-y-1 shadow-xs">
          <span className="text-[10px] text-muted-foreground font-semibold block">Tự sửa lỗi (Self-Correction)</span>
          <span className="font-mono text-xl font-bold text-indigo-500">
            {metrics.selfCorrectionCount}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 text-center space-y-1 shadow-xs">
          <span className="text-[10px] text-muted-foreground font-semibold block">Tổng lỗi đã sửa</span>
          <span className="font-mono text-xl font-bold text-foreground">
            {metrics.totalResolvedCount}
          </span>
        </div>
      </div>

      {/* Error Bank Records Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-amber-500" />
            <span>Mẫu lỗi thực tế từ Ngân hàng Lỗi (Error Bank):</span>
          </h2>
          <span className="text-xs text-muted-foreground font-mono">{errorRecords.length} mẫu lỗi đã lưu</span>
        </div>

        {errorRecords.length === 0 ? (
          <Card className="rounded-3xl border border-dashed border-border/80 p-8 text-center space-y-3 bg-muted/20">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <ShieldCheck className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Ngân hàng Lỗi cá nhân hiện đang trống</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Bạn chưa có lỗi nào ghi nhận từ Sentence Builder hay VN → EN. Nhưng bạn có thể bấm <strong>"Bắt đầu Luyện AI Ngay"</strong> ở trên để AI tạo các thử thách sửa sai kinh điển ngay lập tức!
              </p>
            </div>
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => handleStartAiChallenge()}
                className="rounded-xl font-bold text-xs gap-1.5"
              >
                <Sparkles className="size-3.5" />
                <span>Thực hành thử thách sửa lỗi AI</span>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {errorRecords.map((rec) => (
              <Card
                key={rec.id}
                className="rounded-3xl border border-border/80 bg-card hover:border-primary/50 transition-all p-5 space-y-3 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                      {rec.category}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Gặp {rec.frequency} lần
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-mono">
                      <span className="line-through text-red-500 font-semibold">
                        "{rec.examples[0]?.userText || rec.labelVi}"
                      </span>
                      <span className="text-muted-foreground mx-1.5">→</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        "{rec.examples[0]?.correction || rec.description}"
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rec.description || rec.labelVi}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Chính xác: <span className="font-mono font-bold text-foreground">{rec.accuracy}%</span>
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleStartFromErrorBank(rec)}
                    disabled={isGeneratingCorrection}
                    className="rounded-xl font-bold text-xs gap-1 h-8 px-3 btn-spring"
                  >
                    <RotateCcw className="size-3" />
                    <span>Vào Studio sửa câu này</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
