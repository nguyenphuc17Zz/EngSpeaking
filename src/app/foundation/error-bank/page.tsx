"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Brain,
  Search,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Activity,
  Flame,
  Mic,
  MessageSquare,
  Repeat,
  Loader2,
  Clock,
  ArrowRight,
  X,
  Target,
  Trophy,
  AlertTriangle,
  Compass,
  ChevronDown,
  Wand2,
  Check,
  Coffee,
  Briefcase,
  Plane,
  Utensils,
  ShoppingBag,
  Laptop,
  HeartPulse,
} from "lucide-react";
import { PRESET_TOPICS, getTopicDisplay } from "@/lib/foundation/sentence-builder/topics";

const TOPIC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Coffee,
  Briefcase,
  Plane,
  Utensils,
  ShoppingBag,
  Laptop,
  MessageSquare,
  HeartPulse,
};

import { useErrorBankStore } from "@/stores/error-bank-store";
import { ErrorAnalyticsOverview } from "@/components/foundation/error-bank/ErrorAnalyticsOverview";
import { ErrorCard } from "@/components/foundation/error-bank/ErrorCard";
import { ErrorDetailModal } from "@/components/foundation/error-bank/ErrorDetailModal";
import { DiagnosticReportCard } from "@/components/foundation/error-bank/DiagnosticReportCard";
import { cn } from "@/lib/utils";
import { ErrorDrillPromptCard } from "@/components/foundation/error-bank/ErrorDrillPromptCard";
import { ErrorDrillContextCard } from "@/components/foundation/error-bank/ErrorDrillContextCard";
import { ErrorDrillFeedbackCard } from "@/components/foundation/error-bank/ErrorDrillFeedbackCard";
import { ErrorDrillSummaryModal } from "@/components/foundation/error-bank/ErrorDrillSummaryModal";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { toast } from "@/lib/toast";
import type { MainErrorCategory, ErrorStatus, FossilizationLevel } from "@/types/error-bank";

const MAIN_CATEGORY_TABS: Array<{ id: MainErrorCategory | "all"; label: string }> = [
  { id: "all", label: "Tất cả mẫu lỗi" },
  { id: "grammar", label: "Ngữ pháp" },
  { id: "vocabulary", label: "Từ vựng" },
  { id: "pronunciation", label: "Phát âm" },
  { id: "fluency", label: "Trôi chảy" },
];

const STATUS_FILTERS: Array<{ id: ErrorStatus | "all"; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "active", label: "Đang gặp" },
  { id: "persistent", label: "Tái phát" },
  { id: "recovering", label: "Phục hồi" },
  { id: "mastered", label: "Làm chủ" },
];

const FOSSILIZATION_FILTERS: Array<{ id: FossilizationLevel | "all"; label: string }> = [
  { id: "all", label: "Tất cả nguy cơ" },
  { id: "fossilized", label: "🔥 Hóa đá (>65%)" },
  { id: "habitual", label: "🟡 Thói quen" },
  { id: "emerging", label: "🟢 Mới chớm" },
];

export default function ErrorBankDashboardPage() {
  const {
    records,
    selectedCategory,
    selectedStatus,
    selectedFossilization,
    dueFilter,
    searchQuery,
    selectedRecord,
    contextPack,
    diagnosticReport,
    isDiagnosing,
    activeTab,
    // Drill state
    drillQueue,
    currentDrillIndex,
    drillHistory,
    isDrillEvaluating,
    lastDrillResult,
    drillGenerationError,
    isDrillSessionCompleted,
    drillSummary,
    sessionConfig,
    sessionHistory,
    completedTasksCount,
    hintTier: storeHintTier,
    attemptCount,
    autoStartMic,
    setAutoStartMic,
    prepCountdown,
    setPrepCountdown,
    isCountingDown,
    setIsCountingDown,
    adaptiveState,
    skillMastery,
    selectedTopicId,
    customTopicText,
    setSelectedTopic,
    setHintTier: setStoreHintTier,
    incrementAttempt,
    // Actions
    loadLocalRecords,
    setCategory,
    setStatus,
    setFossilization,
    setDueFilter,
    setSearchQuery,
    selectRecord,
    flagFalsePositive,
    generateDiagnosticReport,
    setActiveTab,
    initDrillSession,
    initDrillFromRecord,
    submitDrillAttempt,
    advanceDrillQueue,
    finishDrillSession,
    finishSessionManually,
    dismissDrillSummary,
    resetDrillSession,
    clearDrillError,
  } = useErrorBankStore();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [currentHintTier, setCurrentHintTier] = useState(0);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState(1500);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [promptDisplayTime, setPromptDisplayTime] = useState(Date.now());
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);

  // Sync local hint tier with store (SB/VN-EN/Survival aligned single source going forward)
  useEffect(() => {
    setStoreHintTier(currentHintTier as 0 | 1 | 2 | 3 | 4);
  }, [currentHintTier, setStoreHintTier]);

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;

  useEffect(() => {
    loadLocalRecords();
  }, [loadLocalRecords]);

  // Reset hint tier when changing drill record
  useEffect(() => {
    setCurrentHintTier(0);
    setPendingSpokenText(null);
    setPromptDisplayTime(Date.now());
  }, [currentDrillIndex]);

  const handleOpenDetail = (record: (typeof records)[0]) => {
    selectRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleDrillNow = (record: (typeof records)[0]) => {
    initDrillFromRecord(record);
    setCurrentHintTier(0);
    setPendingSpokenText(null);
  };

  const handleDrillAll = () => {
    initDrillSession(filteredRecords.length > 0 ? filteredRecords : records);
    setCurrentHintTier(0);
    setPendingSpokenText(null);
  };

  const handleRunDiagnostic = async () => {
    setDiagError(null);
    try {
      await generateDiagnosticReport();
    } catch (e: unknown) {
      setDiagError(e instanceof Error ? e.message : String(e));
    }
  };

  // Speaking handlers
  const handleStartRecord = useCallback(async () => {
    soundEffects.playMicStart();
    unifiedSTTRef.current.resetTranscript();
    setPendingSpokenText(null);
    setRecordingStartTime(Date.now());
    try {
      await unifiedSTTRef.current.startListening();
    } catch {
      toast.error("Lỗi Micro", "Vui lòng cấp quyền micro cho trình duyệt.");
    }
  }, []);

  const handleStopRecord = useCallback(async () => {
    if (!unifiedSTTRef.current.isListening) return;
    soundEffects.playMicStop();
    const durationMs = Math.max(700, Date.now() - recordingStartTime);
    try {
      const { text } = await unifiedSTTRef.current.stopListening();
      if (!text) {
        toast.error("Chưa ghi nhận âm thanh", "Bấm mic và nói lại câu.");
        return;
      }
      setPendingSpokenText(text);
      setPendingDurationMs(durationMs);
    } catch {
      toast.error("Lỗi thu âm", "Hãy thử lại.");
    }
  }, [recordingStartTime]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText) return;
    const responseLatency = Math.max(400, recordingStartTime ? recordingStartTime - promptDisplayTime : 1500);
    await submitDrillAttempt({
      userTranscript: pendingSpokenText,
      latencyMs: responseLatency,
      speechDurationMs: pendingDurationMs,
      hintTierUsed: currentHintTier,
      attemptNumber: attemptCount,
    });
    setPendingSpokenText(null);
  }, [pendingSpokenText, recordingStartTime, promptDisplayTime, pendingDurationMs, currentHintTier, attemptCount, submitDrillAttempt]);

  const handleSayItBetter = useCallback(() => {
    incrementAttempt(true);
    setPendingSpokenText(null);
    toast.info("Chế độ 'Say It Better'", "Hãy nhại lại câu bản xứ tự nhiên hơn!");
    if (autoStartMic) handleStartRecord();
  }, [incrementAttempt, autoStartMic]);

  const handlePracticeVariant = useCallback(
    (variantText: string) => {
      incrementAttempt(true);
      setPendingSpokenText(null);
      toast.info("Luyện nói bản này", `Mẫu: "${variantText}". Hãy bấm mic để nói!`);
      if (autoStartMic) handleStartRecord();
    },
    [incrementAttempt, autoStartMic]
  );

  // Prep countdown for auto-start mic (SB/VN-EN/Survival aligned)
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const currentRecord = drillQueue[currentDrillIndex];
    if (activeTab !== "drill" || !currentRecord || lastDrillResult || isDrillSessionCompleted) {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      setIsCountingDown(false);
      setPrepCountdown(null);
      return;
    }
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (autoStartMic) {
      setIsCountingDown(true);
      let count = Math.max(1, Math.round(adaptiveState.prepTimeSec ?? 2.5));
      setPrepCountdown(count);
      prepTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          setIsCountingDown(false);
          setPrepCountdown(null);
          handleStartRecord();
        } else {
          setPrepCountdown(count);
        }
      }, 1000);
    } else {
      setIsCountingDown(false);
      setPrepCountdown(null);
    }
    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [activeTab, currentDrillIndex, autoStartMic, lastDrillResult, isDrillSessionCompleted, drillQueue, adaptiveState.prepTimeSec, setIsCountingDown, setPrepCountdown]);

  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartRecord();
  }, [handleStartRecord]);

  const handleNextDrill = useCallback(() => {
    advanceDrillQueue();
    setPendingSpokenText(null);
    setCurrentHintTier(0);
  }, [advanceDrillQueue]);

  const handleRetryDrill = useCallback(() => {
    incrementAttempt(false);
    setPendingSpokenText(null);
    setCurrentHintTier(0);
    setPromptDisplayTime(Date.now());
    if (autoStartMic) handleStartRecord();
  }, [incrementAttempt, autoStartMic]);

  // Recording duration tracker (SB/VN-EN/Survival aligned)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (unifiedSTT.isListening) {
      const start = Date.now();
      durationTimerRef.current = setInterval(() => {
        setRecordingDurationMs(Date.now() - start);
      }, 100);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setRecordingDurationMs(0);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [unifiedSTT.isListening]);

  const [customInputVal, setCustomInputVal] = useState(customTopicText || "");
  useEffect(() => {
    setCustomInputVal(customTopicText || "");
  }, [customTopicText]);

  // Keyboard shortcuts for Drill Studio
  useEffect(() => {
    if (activeTab !== "drill") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (lastDrillResult) {
          handleRetryDrill();
          return;
        }
        if (pendingSpokenText) handleReRecord();
        else if (unifiedSTTRef.current.isListening) handleStopRecord();
        else handleStartRecord();
      } else if (e.code === "Backspace" && unifiedSTTRef.current.isListening) {
        e.preventDefault();
        unifiedSTTRef.current.resetTranscript();
        setPendingSpokenText(null);
        toast.info("Đã xóa câu nói dở", "Tiếp tục nói lại từ đầu...");
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setCurrentHintTier((p) => (p >= 4 ? 0 : p + 1));
      } else if (e.key === "Enter") {
        if (pendingSpokenText && !isDrillEvaluating) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (lastDrillResult) {
          e.preventDefault();
          handleNextDrill();
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (lastDrillResult) handleRetryDrill();
        else if (!unifiedSTTRef.current.isListening) handleNextDrill();
      } else if (e.key === "Escape") {
        if (currentHintTier > 0) setCurrentHintTier(0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    activeTab,
    lastDrillResult,
    pendingSpokenText,
    isDrillEvaluating,
    handleStartRecord,
    handleStopRecord,
    handleReRecord,
    handleConfirmSubmit,
    handleNextDrill,
    handleRetryDrill,
  ]);

  // Filtered records list
  const now = Date.now();
  const filteredRecords = records.filter((r) => {
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
    if (selectedFossilization !== "all" && r.fossilizationLevel !== selectedFossilization) return false;
    if (dueFilter === "due_today") {
      const isDue = r.nextReviewDueAt && new Date(r.nextReviewDueAt).getTime() <= now;
      const isLowR = (r.retrievability || 100) < 90;
      if (!isDue && !isLowR) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !r.labelVi.toLowerCase().includes(q) &&
        !r.canonicalName.toLowerCase().includes(q) &&
        !r.descriptionVi.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const currentDrillRecord = drillQueue[currentDrillIndex] ?? null;
  const isLastDrill = currentDrillIndex >= drillQueue.length - 1;
  const liveText = pendingSpokenText || unifiedSTT.transcript || unifiedSTT.interimTranscript;

  // ════════════════════════════════════════════════════════════════════
  // ── TAB 2: ERROR DRILL STUDIO ────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  if (activeTab === "drill") {
    if (!currentDrillRecord) {
      return (
        <div className="p-8 rounded-3xl border border-border/80 bg-card space-y-4 max-w-lg mx-auto my-16 text-center">
          <p className="text-muted-foreground text-sm">Không có lỗi nào trong hàng drill. Quay lại tổng quan.</p>
          <Button onClick={() => setActiveTab("overview")} variant="outline" className="rounded-2xl">
            <ArrowLeft className="size-4 mr-2" /> Quay lại
          </Button>
        </div>
      );
    }

    const latestExample = currentDrillRecord.examples[currentDrillRecord.examples.length - 1];
    const targetCorrection = latestExample?.correction || currentDrillRecord.canonicalName;

    return (
      <div className="w-full h-full max-h-[calc(100vh-5.5rem)] flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-2.5 sm:p-3.5 shadow-xs animate-in fade-in-0 duration-200">
        {/* Studio Header */}
        <header className="flex items-center justify-between border-b border-border/40 pb-2.5 shrink-0 gap-3">
          {/* Left */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("overview")}
              className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
              title="Thoát về Tổng quan"
            >
              <X className="size-4" />
            </Button>
            <span className="text-xs md:text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <Target className="size-3.5 text-rose-500" />
              Error Drill Studio
            </span>
            <button
              type="button"
              onClick={() => setIsTopicModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-foreground text-xs font-mono transition-all cursor-pointer group max-w-[200px] truncate"
              title="Bấm để đổi chủ đề grounding cho drill"
            >
              <Compass className="size-3 text-primary shrink-0 group-hover:rotate-45 transition-transform" />
              <span className="truncate font-medium">{getTopicDisplay(selectedTopicId).label}</span>
              <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-0.5" />
            </button>
          </div>

          {/* Center */}
          <div className="flex items-center gap-2">
            {isCountingDown && prepCountdown !== null ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-mono font-bold animate-pulse">
                <Clock className="size-3.5" />
                <span>Nói sau {prepCountdown}s...</span>
              </div>
            ) : (
              <>
                <span className="text-xs font-mono font-bold text-foreground">
                  {sessionConfig.mode === "endless"
                    ? `Lỗi #${currentDrillIndex + 1}`
                    : `Lỗi ${currentDrillIndex + 1}/${sessionConfig.targetCount || drillQueue.length}`}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-rose-500/30 text-rose-600 dark:text-rose-400">
                  ✓ Đã drill {drillHistory.filter((h) => h.evaluation.corrected).length}
                </Badge>
              </>
            )}
            {skillMastery.streakCount > 1 && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[11px] font-mono font-bold">
                <Flame className="size-3" />
                <span>Streak {skillMastery.streakCount}</span>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {(drillHistory.length > 0 || sessionHistory.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={finishSessionManually}
                className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600"
                title="Kết thúc và xem kết quả"
              >
                <Trophy className="size-3.5" />
                <span className="hidden sm:inline">Xem kết quả</span>
              </Button>
            )}
          </div>
        </header>

        {/* Error Banner */}
        {drillGenerationError && (
          <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 flex items-center justify-between text-xs text-destructive shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{drillGenerationError}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={clearDrillError} className="size-6 p-0 text-destructive">
              <X className="size-3" />
            </Button>
          </div>
        )}

        {/* Main 3-Column Studio */}
        <main className="flex-1 min-h-0 p-2 sm:p-2.5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3">
          {/* Col 1 (4): Error Prompt */}
          <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
            <ErrorDrillPromptCard
              record={currentDrillRecord}
              currentIndex={currentDrillIndex}
              totalInQueue={drillQueue.length}
            />
          </div>

          {/* Col 2 (5): Context & Hints */}
          <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
            <ErrorDrillContextCard
              record={currentDrillRecord}
              currentHintTier={currentHintTier}
              onSelectHintTier={setCurrentHintTier}
            />
          </div>

          {/* Col 3 (3): Speaking Controller or Feedback */}
          <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
            {!lastDrillResult ? (
              <SpeakingController
                compact={true}
                status={
                  isDrillEvaluating || unifiedSTT.isTranscribing
                    ? "processing"
                    : unifiedSTT.isListening
                      ? "recording"
                      : "idle"
                }
                isListening={unifiedSTT.isListening}
                liveTranscript={liveText}
                durationMs={recordingDurationMs || unifiedSTT.audioRecorder.durationMs}
                autoStartMic={autoStartMic}
                onToggleAutoStartMic={setAutoStartMic}
                onStartRecord={handleStartRecord}
                onStopRecord={handleStopRecord}
                onSubmitTextFallback={(text) => {
                  submitDrillAttempt({
                    userTranscript: text,
                    latencyMs: 1500,
                    speechDurationMs: 1500,
                    hintTierUsed: currentHintTier,
                    attemptNumber: attemptCount,
                  });
                }}
                onOpenHints={() => setCurrentHintTier((p) => (p >= 4 ? 0 : p + 1))}
                isEvaluating={isDrillEvaluating || unifiedSTT.isTranscribing}
                onResetLiveTranscript={() => {
                  unifiedSTTRef.current.resetTranscript();
                  setPendingSpokenText(null);
                }}
                pendingText={pendingSpokenText}
                onConfirmSubmit={handleConfirmSubmit}
                onReRecord={handleReRecord}
              />
            ) : (
              <ErrorDrillFeedbackCard
                record={currentDrillRecord}
                result={lastDrillResult}
                userTranscript={
                  drillHistory[drillHistory.length - 1]?.userTranscript || ""
                }
                targetCorrection={targetCorrection}
                onRetry={handleRetryDrill}
                onNext={handleNextDrill}
                isLastInQueue={isLastDrill}
                onFinish={finishSessionManually}
                onSayItBetter={handleSayItBetter}
                onPracticeVariant={handlePracticeVariant}
              />
            )}
          </div>
        </main>

        {/* Footer Keybindings (SB/VN-EN/Survival aligned) */}
        <footer className="flex items-center justify-between border-t border-border/40 pt-1.5 shrink-0 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5">
            <span>[Space]: {lastDrillResult ? "Nói lại" : pendingSpokenText ? "Thu âm lại" : "Thu âm/Dừng"}</span>
            <span>•</span>
            <span>[Backspace]: Xoá nói lại</span>
            <span>•</span>
            <span>[H]: Gợi ý ({currentHintTier}/4)</span>
            <span>•</span>
            <span>[R]: {lastDrillResult ? "Nói lại" : "Tiếp theo"}</span>
            {pendingSpokenText && !isDrillEvaluating && (
              <>
                <span>•</span>
                <span className="text-primary font-bold">[Enter]: Nộp bài</span>
              </>
            )}
            {lastDrillResult && (
              <>
                <span>•</span>
                <span className="text-primary font-bold">[Enter]: Tiếp theo</span>
              </>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px]">
            <span>Mastery: {skillMastery.overallMastery}%</span>
            <span>·</span>
            <span>Độ khó: {adaptiveState.currentDifficulty}/10</span>
            <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="hidden md:inline">Drill Studio</span>
          </div>
        </footer>

        {/* Topic Selector Dialog (SB/VN-EN/Survival aligned) */}
        <Dialog open={isTopicModalOpen} onOpenChange={setIsTopicModalOpen}>
          <DialogContent className="sm:max-w-xl rounded-3xl p-5 md:p-6 bg-card border border-border/80 shadow-2xl space-y-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base md:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Compass className="size-5 text-primary" />
                <span>Chủ đề grounding cho drill</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Chủ đề không đổi pattern lỗi — chỉ giúp câu ví dụ và Say It Better gần bối cảnh bạn hay gặp.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {PRESET_TOPICS.map((topic) => {
                const IconComp = TOPIC_ICONS[topic.icon] || Sparkles;
                const isSelected = selectedTopicId === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setSelectedTopic(topic.id, "");
                      setIsTopicModalOpen(false);
                      toast.success("Đã chọn chủ đề", topic.labelVi);
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer text-left btn-spring ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs"
                        : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div
                      className={`size-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <IconComp className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-foreground block truncate">{topic.labelVi}</span>
                      <span className="text-[10px] text-muted-foreground font-mono block truncate">{topic.labelEn}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-3 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wand2 className="size-3.5 text-primary" />
                <span className="font-semibold text-foreground">Hoặc nhập bối cảnh tùy chỉnh:</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInputVal}
                  onChange={(e) => setCustomInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customInputVal.trim()) {
                      setSelectedTopic("custom", customInputVal.trim());
                      setIsTopicModalOpen(false);
                      toast.success("Đã chọn chủ đề tùy chỉnh", customInputVal.trim());
                    }
                  }}
                  placeholder="Ví dụ: Họp với sếp, Phỏng vấn visa..."
                  className="flex-1 h-9 px-3 text-xs rounded-xl bg-background border border-border/80 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 transition-all"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (customInputVal.trim()) {
                      setSelectedTopic("custom", customInputVal.trim());
                      setIsTopicModalOpen(false);
                      toast.success("Đã chọn chủ đề tùy chỉnh", customInputVal.trim());
                    } else {
                      toast.info("Vui lòng nhập chủ đề trước khi áp dụng");
                    }
                  }}
                  className="h-9 px-3 rounded-xl text-xs gap-1 font-semibold"
                >
                  <Check className="size-3" />
                  <span>Áp dụng</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Drill Summary Modal */}
        <ErrorDrillSummaryModal
          isOpen={isDrillSessionCompleted}
          summary={drillSummary}
          onDrillAgain={() => {
            resetDrillSession();
          }}
          onBackToOverview={() => {
            dismissDrillSummary();
          }}
        />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // ── TAB 1: OVERVIEW DASHBOARD ────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-none space-y-3 sm:space-y-3.5 pb-12 animate-in fade-in-0 duration-200">
      {/* ── TOP TOOLBAR FULL WIDTH (Compact Single Row) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 backdrop-blur-md border border-border/80 rounded-2xl px-3.5 py-2.5 shadow-xs w-full">
        {/* Left: Back + Title + Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
              title="Quay lại Trang chủ"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <div className="size-7.5 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Brain className="size-4" />
            </div>
            <span className="font-serif font-bold text-sm sm:text-base tracking-tight text-foreground">
              Ngân Hàng Lỗi & Trí Nhớ Khẩu Ngữ
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono h-5 hidden sm:inline-flex rounded-full px-2">
              FSRS • BKT • L1
            </Badge>
          </div>
        </div>

        {/* Right: Tab Switcher (Tổng quan vs Drill Studio) */}
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-full border border-border/60">
          <button
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-all cursor-pointer bg-primary text-primary-foreground font-semibold shadow-xs"
          >
            <Brain className="size-3.5" />
            <span>Tổng quan</span>
            {records.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-primary-foreground text-[10px] font-mono font-bold">
                {records.length}
              </span>
            )}
          </button>
          <button
            onClick={handleDrillAll}
            disabled={records.filter((r) => r.status !== "mastered").length === 0}
            className={cn(
              "flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-all cursor-pointer",
              records.filter((r) => r.status !== "mastered").length === 0
                ? "opacity-50 cursor-not-allowed text-muted-foreground"
                : "text-muted-foreground hover:text-foreground font-medium"
            )}
          >
            <Target className="size-3.5" />
            <span>Error Drill Studio</span>
            {contextPack.reviewDueList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 text-[10px] font-mono font-bold animate-pulse">
                {contextPack.reviewDueList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── COMPACT AI DOCTOR & FSRS DUE ACTION BAR (Single Row) ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-background shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Activity className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xs sm:text-sm text-foreground">
                AI Bác Sĩ Khẩu Ngữ (Spoken Pathologist)
              </span>
              {diagError && <span className="text-xs text-destructive font-medium">⚠️ {diagError}</span>}
            </div>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
              Phân lập Retrieval Gap vs Knowledge Gap • Tự động kê đơn 3 bài tập khắc phục thói quen L1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {contextPack.reviewDueList.length > 0 && (
            <Button
              size="sm"
              onClick={() => {
                const dueRecords = records.filter(
                  (r) => contextPack.reviewDueList.some((d) => d.patternKey === r.patternKey)
                );
                initDrillSession(dueRecords.length > 0 ? dueRecords : records);
              }}
              className="h-8 px-3 rounded-xl font-bold text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
            >
              <Clock className="size-3.5" />
              <span>Drill {contextPack.reviewDueList.length} lỗi đến hạn</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleRunDiagnostic}
            disabled={isDiagnosing}
            className="h-8 px-3.5 rounded-xl font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
          >
            {isDiagnosing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Đang chẩn đoán...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                <span>{diagnosticReport ? "Cập nhật Chẩn Đoán" : "🩺 Nhận Chẩn Đoán"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Diagnostic Report */}
      {diagnosticReport && <DiagnosticReportCard report={diagnosticReport} />}

      {/* 4 KPI Cards */}
      <ErrorAnalyticsOverview records={records} contextPack={contextPack} />

      {/* ── INTEGRATED COMPACT FILTER BAR ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-xs space-y-2.5">
        {/* Row 1: Category Tabs + Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {MAIN_CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.id)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-semibold",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                      : "border-border/70 text-muted-foreground hover:text-foreground bg-background"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm mẫu lỗi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 rounded-xl text-xs bg-background border-border/80"
            />
          </div>
        </div>

        {/* Row 2: Fossilization + Status + Due */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mr-1">
                <Flame className="size-3 text-rose-500" /> Hóa đá:
              </span>
              {FOSSILIZATION_FILTERS.map((f) => {
                const isActive = selectedFossilization === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFossilization(f.id)}
                    className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-lg border transition-colors cursor-pointer",
                      isActive
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border-rose-500/30"
                        : "border-border/50 text-muted-foreground hover:text-foreground bg-background"
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="h-3.5 w-px bg-border/60 hidden sm:block" />

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground font-medium mr-1 hidden sm:inline">
                Trạng thái:
              </span>
              {STATUS_FILTERS.map((st) => {
                const isActive = selectedStatus === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setStatus(st.id)}
                    className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-lg border transition-colors cursor-pointer",
                      isActive
                        ? "bg-muted text-foreground font-bold border-border/80"
                        : "border-border/50 text-muted-foreground hover:text-foreground bg-background"
                    )}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setDueFilter(dueFilter === "all" ? "due_today" : "all")}
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer",
              dueFilter === "due_today"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "border-border/80 text-muted-foreground hover:text-foreground bg-background"
            )}
          >
            <Clock className="size-3.5" />
            <span>Chỉ xem FSRS ({contextPack.reviewDueList.length})</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {records.length === 0 ? (
        <div className="p-10 md:p-14 rounded-3xl border border-dashed border-border/80 text-center space-y-5 bg-card/40 max-w-2xl mx-auto">
          <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
            <Brain className="size-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">Ngân hàng Lỗi Cá nhân chưa có dữ liệu</h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Lỗi ngữ pháp, phát âm và ngắc ngứ từ Sentence Builder & VN→EN Speaking sẽ tự động được ghi nhận và đưa vào thuật toán FSRS & BKT khi bạn thực hành:
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            <Link href="/foundation/sentence-builder">
              <Button variant="outline" size="sm" className="w-full rounded-2xl text-xs font-semibold h-10 gap-1.5 border-border/80 hover:border-primary/50">
                <Mic className="size-3.5 text-primary" />
                <span>Sentence Builder</span>
              </Button>
            </Link>
            <Link href="/foundation/vn-to-en">
              <Button variant="outline" size="sm" className="w-full rounded-2xl text-xs font-semibold h-10 gap-1.5 border-border/80 hover:border-emerald-500/50">
                <Repeat className="size-3.5 text-emerald-500" />
                <span>VN → EN Speaking</span>
              </Button>
            </Link>
            <Link href="/conversation">
              <Button variant="outline" size="sm" className="w-full rounded-2xl text-xs font-semibold h-10 gap-1.5 border-border/80 hover:border-violet-500/50">
                <MessageSquare className="size-3.5 text-violet-500" />
                <span>Hội thoại AI</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-border/80 text-center space-y-3 bg-card/40">
          <Brain className="size-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">Không tìm thấy mẫu lỗi phù hợp</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Thử thay đổi bộ lọc danh mục, mức độ hóa đá hoặc từ khóa tìm kiếm.
          </p>
        </div>
      ) : (
        <>
          {/* Drill All Button */}
          {filteredRecords.filter((r) => r.status !== "mastered").length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {filteredRecords.length} mẫu lỗi — {filteredRecords.filter((r) => r.status !== "mastered").length} có thể drill
              </p>
              <Button
                size="sm"
                onClick={handleDrillAll}
                className="rounded-2xl text-xs font-bold gap-1.5 h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white btn-spring"
              >
                <Target className="size-3.5" />
                Drill tất cả ({filteredRecords.filter((r) => r.status !== "mastered").length})
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
            {filteredRecords.map((rec) => (
              <ErrorCard
                key={rec.id}
                record={rec}
                onOpenDetail={handleOpenDetail}
                onDrillNow={handleDrillNow}
              />
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <ErrorDetailModal
        record={selectedRecord}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onFlagFalsePositive={(id) => {
          flagFalsePositive(id);
          setIsDetailModalOpen(false);
        }}
      />
    </div>
  );
}
