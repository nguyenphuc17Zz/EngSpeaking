"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import {
  RotateCcw,
  Sparkles,
  Zap,
  TrendingUp,
  AlertTriangle,
  Flame,
  Volume2,
  RefreshCw,
  Loader2,
  Settings,
  X,
  Trophy,
  Compass,
  ChevronDown,
  Wand2,
  Coffee,
  Briefcase,
  Plane,
  Utensils,
  Laptop,
  ShoppingBag,
  HeartPulse,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import { useRetryLoopStore } from "@/stores/retry-loop-store";
import { RepairPromptCard } from "@/components/foundation/retry-loop/RepairPromptCard";
import { RepairContextCard } from "@/components/foundation/retry-loop/RepairContextCard";
import { RepairFeedbackCard } from "@/components/foundation/retry-loop/RepairFeedbackCard";
import { RepairSummaryModal } from "@/components/foundation/retry-loop/RepairSummaryModal";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { getErrorBankRecords } from "@/lib/foundation/sentence-builder/error-bank.service";
import { PRESET_TOPICS, getTopicDisplay } from "@/lib/foundation/sentence-builder/topics";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { soundEffects } from "@/lib/audio/audio-chimes";

const TOPIC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Coffee,
  Briefcase,
  Plane,
  Utensils,
  Laptop,
  ShoppingBag,
  HeartPulse,
};

export default function SpokenRepairLabPage() {
  const router = useRouter();

  const {
    activeSession,
    metrics,
    isEvaluatingRepair,
    isGeneratingChallenge,
    lastRepairResult,
    generationError,
    selectedTopicId,
    customTopicText,
    currentChallengeIndex,
    completedChallengesCount,
    isSessionCompleted,
    sessionSummary,
    clearGenerationError,
    generateAiRepairChallenge,
    startRepairSession,
    submitRepairSpokenAttempt,
    setSelectedTopic,
    finishSessionManually,
    resetSession,
    closeActiveSession,
  } = useRetryLoopStore();

  const [currentHintTier, setCurrentHintTier] = useState(0);
  const [autoStartMic, setAutoStartMic] = useState(false);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState<number | null>(null);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(1500);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState("");

  // Audio / Speech Hooks
  const tts = useBrowserTTS();
  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [elapsedDurationMs, setElapsedDurationMs] = useState(0);
  const [promptDisplayTime, setPromptDisplayTime] = useState(Date.now());
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const autoLaunchedRef = useRef(false);

  // Zero-Lobby: Auto-launch first challenge or load from Error Bank on mount
  useEffect(() => {
    if (autoLaunchedRef.current) return;

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const recordId = urlParams.get("recordId") || urlParams.get("errorId");
      if (recordId) {
        try {
          const records = getErrorBankRecords();
          const target = records.find((r) => r.id === recordId);
          if (target) {
            autoLaunchedRef.current = true;
            startRepairSession({
              originalTaskId: target.id,
              sourceContext: "retry_lab",
              originalPrompt: target.targetSentence,
              originalTranscript: target.userSpokenTranscript || target.erroneousSentence,
              expectedSentence: target.targetSentence,
              detectedErrors: target.detectedErrors?.map((e) => ({
                type: e.type,
                userText: e.userErroneousWord || "",
                correction: e.correctedWord || "",
                explanation: e.explanationVi || "",
              })),
            });
            return;
          }
        } catch {}
      }
    }

    if (!activeSession && !isGeneratingChallenge) {
      autoLaunchedRef.current = true;
      generateAiRepairChallenge();
    }
  }, [activeSession, isGeneratingChallenge, generateAiRepairChallenge, startRepairSession]);

  // Track prompt display time for latency calculation
  useEffect(() => {
    if (activeSession) {
      setPromptDisplayTime(Date.now());
    }
  }, [activeSession?.sessionId]);

  // Handle Prep Countdown Timer when a new session starts
  useEffect(() => {
    if (!activeSession || lastRepairResult) {
      setPrepSecondsLeft(null);
      return;
    }

    if (unifiedSTTRef.current.isListening) {
      unifiedSTTRef.current.stopListening().catch(() => {});
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
  const handleStartRecord = useCallback(async () => {
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
  }, []);

  // Stop Mic Recording -> Pending Review
  const handleStopRecord = useCallback(async () => {
    if (!unifiedSTTRef.current.isListening) return;
    soundEffects.playMicStop();
    const durationMs = Math.max(700, Date.now() - recordingStartTime);

    try {
      const { text: spokenText } = await unifiedSTTRef.current.stopListening();
      if (!spokenText) {
        toast.error("Chưa ghi nhận được âm thanh", "Vui lòng bấm mic và nói lại câu.");
        return;
      }
      setPendingSpokenText(spokenText);
      setPendingDurationMs(durationMs);
    } catch {
      toast.error("Lỗi hoàn thành thu âm", "Hãy thử nói lại câu.");
    }
  }, [recordingStartTime]);

  // Confirm submit speech attempt
  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText || !activeSession) return;
    const responseLatency = Math.max(400, recordingStartTime ? recordingStartTime - promptDisplayTime : 1500);

    const result = await submitRepairSpokenAttempt({
      spokenTranscript: pendingSpokenText,
      responseLatencyMs: responseLatency,
      speechDurationMs: pendingDurationMs,
      expectedSentence: activeSession.targetCorrection.betterSentence,
    });

    if (result?.isSuccessful) {
      soundEffects.playAIReady();
    }
    setPendingSpokenText(null);
  }, [pendingSpokenText, activeSession, recordingStartTime, promptDisplayTime, pendingDurationMs, submitRepairSpokenAttempt]);

  // Re-record
  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartRecord();
  }, [handleStartRecord]);

  // Next challenge
  const handleNextChallenge = useCallback(() => {
    if (isGeneratingChallenge || isEvaluatingRepair) return;
    setPendingSpokenText(null);
    setCurrentHintTier(0);
    useRetryLoopStore.setState({ lastRepairResult: null });
    generateAiRepairChallenge();
  }, [isGeneratingChallenge, isEvaluatingRepair, generateAiRepairChallenge]);

  // Select Topic from Dialog
  const handleSelectTopic = (topicId: string, customText?: string) => {
    setSelectedTopic(topicId, customText);
    setIsTopicModalOpen(false);
    const display = getTopicDisplay(customText ? `custom_scenario: ${customText}` : topicId);
    toast.success("Đã chọn chủ đề", display.label);
    setPendingSpokenText(null);
    setCurrentHintTier(0);
    generateAiRepairChallenge(undefined, customText ? `custom_scenario: ${customText}` : topicId);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (lastRepairResult) {
          useRetryLoopStore.setState({ lastRepairResult: null });
          setPendingSpokenText(null);
          setCurrentHintTier(0);
          if (autoStartMic) handleStartRecord();
        } else if (pendingSpokenText) {
          handleReRecord();
        } else if (unifiedSTTRef.current.isListening) {
          handleStopRecord();
        } else {
          handleStartRecord();
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleNextChallenge();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
      } else if (e.key === "Backspace") {
        if (unifiedSTTRef.current.isListening) {
          e.preventDefault();
          unifiedSTTRef.current.resetTranscript();
          setPendingSpokenText(null);
        }
      } else if (e.key === "Enter") {
        if (pendingSpokenText && !isEvaluatingRepair) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (lastRepairResult) {
          e.preventDefault();
          handleNextChallenge();
        }
      } else if (e.key === "Escape") {
        if (isTopicModalOpen) {
          setIsTopicModalOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isTopicModalOpen,
    lastRepairResult,
    pendingSpokenText,
    isEvaluatingRepair,
    autoStartMic,
    handleStartRecord,
    handleStopRecord,
    handleReRecord,
    handleConfirmSubmit,
    handleNextChallenge,
  ]);

  const liveText = pendingSpokenText || unifiedSTT.transcript || unifiedSTT.interimTranscript;

  // 1. Loading State (Zero-Lobby Initial Fetch)
  if (!activeSession) {
    return (
      <div className="p-8 rounded-3xl border border-border/80 bg-card space-y-4 max-w-lg mx-auto my-16 text-center animate-in fade-in-0 shadow-sm">
        <div className="size-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="size-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">AI đang khởi tạo bài tập Spoken Repair...</h2>
          <p className="text-xs text-muted-foreground">
            Chủ đề: {getTopicDisplay(selectedTopicId).label}. Vào phòng tập sửa lỗi ngay.
          </p>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  // 2. Main Studio View (Professional 3-Column Zero-Scroll Layout)
  return (
    <div className="w-full h-full max-h-[calc(100vh-5.5rem)] flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-2.5 sm:p-3.5 shadow-xs animate-in fade-in-0 duration-200">
      {/* Studio Top Header */}
      <header className="flex items-center justify-between border-b border-border/40 pb-2.5 shrink-0 gap-3">
        {/* Left: Exit button & Inline Topic Selector */}
        <div className="flex items-center gap-2.5">
          <Link href="/foundation">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Thoát về Foundation Hub"
            >
              <X className="size-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <RotateCcw className="size-3.5 text-amber-500" />
              <span>Spoken Repair Lab</span>
            </span>

            {/* In-Studio Topic Selector Badge */}
            <button
              type="button"
              onClick={() => setIsTopicModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-foreground text-xs font-mono transition-all cursor-pointer group max-w-[200px] sm:max-w-[260px] truncate"
              title="Bấm để đổi chủ đề luyện tập"
            >
              <Compass className="size-3 text-amber-500 shrink-0 group-hover:rotate-45 transition-transform" />
              <span className="truncate font-medium">
                {getTopicDisplay(activeSession.topic || selectedTopicId).label}
              </span>
              <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-0.5" />
            </button>

            <GlobalAiSelector size="sm" />
          </div>
        </div>

        {/* Center: Preparation Countdown Badge */}
        {prepSecondsLeft !== null && prepSecondsLeft > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold animate-pulse">
            <Clock className="size-3.5" />
            <span>Nói sau {prepSecondsLeft.toFixed(1)}s...</span>
          </div>
        ) : null}

        {/* Right Actions: Next challenge, Counter & Finish */}
        <div className="flex items-center gap-2.5">
          {/* Next Task Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNextChallenge}
            disabled={isGeneratingChallenge || isEvaluatingRepair}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary transition-all shadow-2xs btn-spring"
            title="Đổi sang câu sửa lỗi tiếp theo (phím R)"
          >
            {isGeneratingChallenge ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5 text-primary" />
            )}
            <span className="hidden sm:inline">Câu tiếp theo</span>
            <span className="text-[9px] font-mono opacity-60 hidden sm:inline">[R]</span>
          </Button>

          {/* Endless Progress Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground">
              Câu #{currentChallengeIndex + 1}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400"
            >
              Đã sửa {completedChallengesCount}
            </Badge>
          </div>

          {/* Finish & View Summary Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={finishSessionManually}
            disabled={isGeneratingChallenge || isEvaluatingRepair}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 transition-all shadow-2xs btn-spring"
            title="Kết thúc buổi tập và xem báo cáo tổng kết"
          >
            <Trophy className="size-3.5" />
            <span className="hidden sm:inline">Kết thúc & Xem kết quả</span>
            <span className="sm:hidden">Nghỉ tập</span>
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
              onClick={handleNextChallenge}
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

      {/* Main Studio Body: 3-Column Zero-Scroll Layout */}
      <main className="flex-1 min-h-0 p-2 sm:p-2.5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3">
        {/* Column 1 (4 cols): Repair Prompt & Focus Card */}
        <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
          <RepairPromptCard
            session={activeSession}
            currentHintTier={currentHintTier}
            onSelectHintTier={setCurrentHintTier}
          />
        </div>

        {/* Column 2 (5 cols): Context, Structure & 4-Tier Ladder */}
        <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
          <RepairContextCard
            session={activeSession}
            currentHintTier={currentHintTier}
            onSelectHintTier={setCurrentHintTier}
          />
        </div>

        {/* Column 3 (3 cols): Speaking Controller or Feedback Card */}
        <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
          {!lastRepairResult ? (
            <SpeakingController
              compact={true}
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
              onSubmitTextFallback={(text) => {
                submitRepairSpokenAttempt({
                  spokenTranscript: text,
                  responseLatencyMs: 1500,
                  speechDurationMs: 1500,
                  expectedSentence: activeSession.targetCorrection.betterSentence,
                });
              }}
              onOpenHints={() => setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1))}
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
              onContinue={handleNextChallenge}
            />
          )}
        </div>
      </main>

      {/* Studio Footer Keybindings Dock */}
      <footer className="flex items-center justify-between border-t border-border/40 pt-1.5 shrink-0 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3 overflow-x-auto py-0.5">
          <span>
            [Space]: {lastRepairResult ? "Nói lại" : pendingSpokenText ? "Thu âm lại" : "Thu âm/Dừng"}
          </span>
          <span>•</span>
          <span className="hidden sm:inline">[Backspace]: Xóa nói lại</span>
          <span className="hidden sm:inline">•</span>
          <span>[H]: Gợi ý ({currentHintTier}/4)</span>
          <span>•</span>
          <span>[R]: Câu tiếp</span>
          {pendingSpokenText && !isEvaluatingRepair && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Nộp bài</span>
            </>
          )}
          {lastRepairResult && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Câu tiếp theo</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden md:inline">Spoken Repair Studio Active</span>
        </div>
      </footer>

      {/* In-Studio Topic Selector Dialog */}
      <Dialog open={isTopicModalOpen} onOpenChange={setIsTopicModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-5 md:p-6 bg-card border border-border/80 shadow-2xl space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Compass className="size-5 text-amber-500" />
              <span>Đổi chủ đề luyện Spoken Repair</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Chọn một ngữ cảnh có sẵn hoặc gõ tình huống tùy chỉnh để AI sinh câu có lỗi thực tế theo bối cảnh đó.
            </DialogDescription>
          </DialogHeader>

          {/* Preset Topics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {PRESET_TOPICS.map((topic) => {
              const IconComp = TOPIC_ICONS[topic.icon] || Sparkles;
              const isSelected = selectedTopicId === topic.id;

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleSelectTopic(topic.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer text-left btn-spring ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40 shadow-xs"
                      : "border-border/70 bg-card hover:border-amber-500/40 hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`size-7 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <IconComp className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-foreground block truncate">
                      {topic.labelVi}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block truncate">
                      {topic.labelEn}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Topic Input */}
          <div className="p-3 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wand2 className="size-3.5 text-amber-500" />
              <span className="font-semibold text-foreground">Hoặc nhập bối cảnh tùy chỉnh:</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInputVal}
                onChange={(e) => setCustomInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customInputVal.trim()) {
                    handleSelectTopic("custom", customInputVal.trim());
                  }
                }}
                placeholder="VD: Phỏng vấn xin việc, đi mua sắm ở siêu thị..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Button
                type="button"
                size="sm"
                disabled={!customInputVal.trim()}
                onClick={() => {
                  if (customInputVal.trim()) {
                    handleSelectTopic("custom", customInputVal.trim());
                  }
                }}
                className="rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
              >
                Áp dụng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Repair Session Summary Modal */}
      <RepairSummaryModal
        isOpen={isSessionCompleted}
        summary={sessionSummary}
        onRestart={() => {
          resetSession();
          generateAiRepairChallenge();
        }}
      />
    </div>
  );
}
