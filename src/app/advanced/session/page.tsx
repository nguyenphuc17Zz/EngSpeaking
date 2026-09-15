"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import {
  Sparkles, X, Trophy, Compass, ChevronDown, Wand2, Check, Coffee, Briefcase, Plane,
  Utensils, ShoppingBag, Laptop, MessageCircle, HeartPulse, GraduationCap, Shuffle,
  AlertTriangle, RefreshCw, Settings2, Clock, Flame,
} from "lucide-react";
import { PRESET_TOPICS, getTopicDisplay } from "@/lib/foundation/sentence-builder/topics";
import { useAdvancedStore } from "@/stores/advanced-store";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { AdvPromptCard } from "@/components/foundation/advanced/AdvPromptCard";
import { AdvScaffoldCard } from "@/components/foundation/advanced/AdvScaffoldCard";
import { AdvFeedbackCard } from "@/components/foundation/advanced/AdvFeedbackCard";
import { AdvSummaryModal } from "@/components/foundation/advanced/AdvSummaryModal";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { TRACK_META } from "@/lib/advanced/track-map";
import type { AdvancedLevel, AdvancedTrack } from "@/types/advanced";

const TOPIC_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles, Coffee, Briefcase, Plane, Utensils, ShoppingBag, Laptop, MessageCircle, HeartPulse, GraduationCap, Shuffle,
};

function AdvancedStudioInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentTask, isGenerating, isEvaluating, setIsEvaluating, isRegeneratingAI,
    sessionConfig, completedTasksCount, currentTaskIndex, isSessionCompleted, sessionSummary,
    hintTier, attemptCount, lastEvaluation, autoStartMic, prepCountdown, isCountingDown,
    adaptiveState, skillMastery, generationError,
    initSession, finishSessionManually, fetchFirstTask, generateNewTaskWithAI,
    processEvaluation, advanceToNextTask, setHintTier, incrementAttempt,
    setAutoStartMic, setPrepCountdown, setIsCountingDown, clearGenerationError, resetSession,
    selectedTopicId, customTopicText, setSelectedTopic, selectedTrack, selectedLevel,
  } = useAdvancedStore();

  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  useBrowserTTS();
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [customInputVal, setCustomInputVal] = useState(customTopicText || "");
  const [promptDisplayTime, setPromptDisplayTime] = useState(Date.now());
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState(2500);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Init from URL ?track=&level= once
  useEffect(() => {
    const track = (searchParams.get("track") as AdvancedTrack) || selectedTrack;
    const level = (searchParams.get("level") as AdvancedLevel) || selectedLevel;
    if (!currentTask && !isGenerating && !generationError) {
      void initSession({ mode: "endless", track, level });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTopicId === "custom") setCustomInputVal(customTopicText || "");
  }, [selectedTopicId, customTopicText]);

  const handleExit = () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (unifiedSTTRef.current.isListening) void unifiedSTTRef.current.stopListening().catch(() => {});
    setIsCountingDown(false);
    setPrepCountdown(null);
    setIsEvaluating(false);
    setPendingSpokenText(null);
    resetSession();
    router.push("/advanced");
  };

  const handleStartRecord = useCallback(async () => {
    if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null; }
    setIsCountingDown(false);
    setPrepCountdown(null);
    setPendingSpokenText(null);
    soundEffects.playMicStart();
    unifiedSTTRef.current.resetTranscript();
    setRecordingStartTime(Date.now());
    try {
      await unifiedSTTRef.current.startListening();
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền micro.");
    }
  }, [setIsCountingDown, setPrepCountdown]);

  const submitAttempt = useCallback(async (spokenText: string, speechDurationMs: number) => {
    if (!currentTask) return;
    setIsEvaluating(true);
    try {
      const responseLatencyMs = Math.max(400, recordingStartTime ? recordingStartTime - promptDisplayTime : 2000);
      let provider = "gemini";
      let model = "auto";
      try {
        const { useSettingsStore } = await import("@/stores/settings-store");
        const s = useSettingsStore.getState();
        provider = s.activeProvider || "gemini";
        model = (provider === "groq" ? s.preferredGroqModel : s.preferredGeminiModel) || "auto";
      } catch {}
      const res = await fetch("/api/advanced/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: currentTask, userTranscript: spokenText, responseLatencyMs, speechDurationMs, hintTierUsed: hintTier, attemptNumber: attemptCount, provider, model }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        soundEffects.playAIReady();
        processEvaluation(data.evaluation);
        if (data.evaluation.toulmin?.toulminScore === 100) soundEffects.playSuccessFanfare();
      } else {
        toast.error("Lỗi chấm điểm", data.error || "Không thể chấm lúc này.");
      }
    } catch {
      toast.error("Lỗi chấm điểm", "Không thể hoàn thành chấm điểm lúc này.");
    } finally {
      setIsEvaluating(false);
      setPendingSpokenText(null);
    }
  }, [currentTask, recordingStartTime, promptDisplayTime, hintTier, attemptCount, processEvaluation, setIsEvaluating]);

  const handleStopRecord = useCallback(async () => {
    if (!unifiedSTTRef.current.isListening) return;
    soundEffects.playMicStop();
    const durationMs = Math.max(800, Date.now() - recordingStartTime);
    try {
      const { text } = await unifiedSTTRef.current.stopListening();
      if (!text) {
        toast.error("Chưa ghi nhận âm thanh", "Hãy bấm mic và nói lại.");
        return;
      }
      setPendingSpokenText(text);
      setPendingDurationMs(durationMs);
    } catch {
      toast.error("Lỗi thu âm", "Hãy thử nói lại.");
    }
  }, [recordingStartTime]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText) return;
    await submitAttempt(pendingSpokenText, pendingDurationMs);
  }, [pendingSpokenText, pendingDurationMs, submitAttempt]);

  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    void handleStartRecord();
  }, [handleStartRecord]);

  const handleResetLive = useCallback(() => {
    unifiedSTTRef.current.resetTranscript();
    setPendingSpokenText(null);
    toast.info("Đã xoá câu nói", "Micro vẫn mở, hãy nói lại trôi chảy.");
  }, []);

  const handleRetry = useCallback(() => {
    incrementAttempt();
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    if (autoStartMic) void handleStartRecord();
  }, [incrementAttempt, autoStartMic, handleStartRecord]);

  const handleContinue = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    advanceToNextTask();
  }, [advanceToNextTask]);

  const handleSkip = useCallback(() => {
    setPendingSpokenText(null);
    unifiedSTTRef.current.resetTranscript();
    advanceToNextTask();
  }, [advanceToNextTask]);

  const handleTextFallback = async (text: string) => {
    await submitAttempt(text, 2500);
  };

  // Prep countdown per task
  useEffect(() => {
    if (!currentTask || lastEvaluation || isSessionCompleted) {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      setIsCountingDown(false);
      setPrepCountdown(null);
      return;
    }
    setPromptDisplayTime(Date.now());
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (unifiedSTTRef.current.isListening) void unifiedSTTRef.current.stopListening().catch(() => {});
    if (autoStartMic) {
      setIsCountingDown(true);
      let count = Math.max(1, Math.round(currentTask.prepTimeSec || 2.0));
      setPrepCountdown(count);
      prepTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          setIsCountingDown(false);
          setPrepCountdown(null);
          void handleStartRecordRef.current();
        } else setPrepCountdown(count);
      }, 1000);
    } else {
      setIsCountingDown(false);
      setPrepCountdown(null);
    }
    return () => { if (prepTimerRef.current) clearInterval(prepTimerRef.current); };
  }, [currentTask?.id, autoStartMic, lastEvaluation, isSessionCompleted, setIsCountingDown, setPrepCountdown]);

  const handleStartRecordRef = useRef(handleStartRecord);
  handleStartRecordRef.current = handleStartRecord;
  const handleStopRecordRef = useRef(handleStopRecord);
  handleStopRecordRef.current = handleStopRecord;
  const handleConfirmRef = useRef(handleConfirmSubmit);
  handleConfirmRef.current = handleConfirmSubmit;
  const handleRetryRef = useRef(handleRetry);
  handleRetryRef.current = handleRetry;
  const handleContinueRef = useRef(handleContinue);
  handleContinueRef.current = handleContinue;
  const handleSkipRef = useRef(handleSkip);
  handleSkipRef.current = handleSkip;
  const handleResetRef = useRef(handleResetLive);
  handleResetRef.current = handleResetLive;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (unifiedSTTRef.current.status === "recording") void handleStopRecordRef.current();
        else if (lastEvaluation) handleRetryRef.current();
        else if (pendingSpokenText) void handleStartRecordRef.current();
        else if (!isEvaluating) void handleStartRecordRef.current();
      } else if (e.code === "Backspace" && unifiedSTTRef.current.status === "recording") {
        e.preventDefault();
        handleResetRef.current();
      } else if (e.code === "KeyH" && !isEvaluating) {
        e.preventDefault();
        setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4);
      } else if (e.code === "KeyR" && unifiedSTTRef.current.status !== "recording" && !isEvaluating) {
        e.preventDefault();
        handleSkipRef.current();
      } else if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) { e.preventDefault(); void handleConfirmRef.current(); }
        else if (lastEvaluation) { e.preventDefault(); handleContinueRef.current(); }
      } else if (e.code === "Escape") {
        if (hintTier > 0) setHintTier(0);
        else handleExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEvaluating, lastEvaluation, pendingSpokenText, hintTier]);

  if (generationError && !currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-destructive/30 bg-destructive/5 space-y-5 max-w-xl mx-auto my-16 text-center">
        <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-base font-bold">Không thể tạo thử thách Advanced</h2>
        <p className="text-xs text-muted-foreground">{generationError}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button onClick={() => { clearGenerationError(); void fetchFirstTask(); }} className="gap-2 rounded-xl cursor-pointer">
            <RefreshCw className="size-4" /><span>Thử lại</span>
          </Button>
          <Link href="/settings"><Button variant="outline" className="gap-2 rounded-xl cursor-pointer"><Settings2 className="size-4" /><span>API Key & Model</span></Button></Link>
          <Button variant="ghost" onClick={() => router.push("/advanced")} className="rounded-xl cursor-pointer">Về Hub</Button>
        </div>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="p-8 rounded-3xl border border-border/80 bg-card space-y-4 max-w-lg mx-auto my-16 text-center">
        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto animate-pulse">
          <Sparkles className="size-6 animate-spin" />
        </div>
        <h2 className="text-base font-bold">AI đang thiết kế thử thách {TRACK_META[selectedTrack].labelVi}...</h2>
        <p className="text-xs text-muted-foreground">Level {adaptiveState.currentLevel} · Prep {adaptiveState.prepTimeSec}s · Blitz {adaptiveState.blitzLimitSec}s</p>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full h-full max-h-[calc(100vh-5.5rem)] flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card p-2.5 sm:p-3.5 shadow-xs animate-in fade-in-0 duration-200">
      <header className="flex items-center justify-between gap-3 border-b border-border/40 pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="sm" onClick={handleExit} className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" title="Thoát">
            <X className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold tracking-tight">Advanced · {TRACK_META[sessionConfig.track].labelVi}</span>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">{adaptiveState.currentLevel}</Badge>
            <Badge variant="outline" className="text-[10px] font-mono">Blitz {currentTask.blitzLimitSec}s</Badge>
            <button type="button" onClick={() => setIsTopicModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 text-xs font-mono transition-all cursor-pointer max-w-[220px] truncate">
              <Compass className="size-3 text-primary shrink-0" />
              <span className="truncate">{getTopicDisplay(currentTask?.topic || selectedTopicId).label}</span>
              <ChevronDown className="size-3 text-muted-foreground shrink-0" />
            </button>
            <GlobalAiSelector size="sm" />
          </div>
        </div>
        {isCountingDown && prepCountdown !== null ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-xs font-mono font-bold animate-pulse">
            <Clock className="size-3.5" /><span>Nói sau {prepCountdown}s...</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handleSkip} disabled={isGenerating || isEvaluating}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary cursor-pointer">
            <Sparkles className={`size-3.5 ${isGenerating ? "animate-spin" : ""}`} /><span>Thử thách khác</span>
            <span className="text-[9px] font-mono opacity-60 hidden sm:inline">[R]</span>
          </Button>
          {skillMastery.streakCount > 1 && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[11px] font-mono font-bold">
              <Flame className="size-3" /><span>Streak {skillMastery.streakCount}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold">{sessionConfig.mode === "endless" ? `Câu #${currentTaskIndex + 1}` : `${currentTaskIndex + 1}/${sessionConfig.targetCount}`}</span>
            {sessionConfig.mode === "endless" ? (
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">Đã xong {completedTasksCount}</Badge>
            ) : (
              <div className="w-16 sm:w-24"><Progress value={((currentTaskIndex + 1) / (sessionConfig.targetCount || 1)) * 100} className="h-1.5 rounded-full" /></div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={finishSessionManually} disabled={isGenerating || isEvaluating}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 cursor-pointer">
            <Trophy className="size-3.5" /><span className="hidden sm:inline">Kết thúc & Xem kết quả</span><span className="sm:hidden">Nghỉ</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-2 sm:p-2.5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3">
        <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
          <AdvPromptCard task={currentTask} currentTaskIndex={currentTaskIndex} totalTasks={sessionConfig.targetCount || Math.max(1, completedTasksCount + 1)}
            prepCountdown={prepCountdown} isCountingDown={isCountingDown} streak={skillMastery.streakCount}
            onNextTask={handleSkip} isGeneratingNext={isGenerating} onRegenerateWithAI={generateNewTaskWithAI} isRegeneratingAI={isRegeneratingAI} />
        </div>
        <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
          <AdvScaffoldCard task={currentTask} currentHintTier={hintTier} onSelectHintTier={setHintTier} />
        </div>
        <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
          {lastEvaluation ? (
            <AdvFeedbackCard evaluation={lastEvaluation} onRetry={handleRetry} onContinue={handleContinue} />
          ) : (
            <SpeakingController compact
              status={isEvaluating || unifiedSTT.isTranscribing ? "processing" : unifiedSTT.isListening ? "recording" : "idle"}
              isListening={unifiedSTT.isListening} liveTranscript={unifiedSTT.fullTranscript}
              durationMs={unifiedSTT.audioRecorder.durationMs} autoStartMic={autoStartMic} onToggleAutoStartMic={setAutoStartMic}
              onStartRecord={handleStartRecord} onStopRecord={handleStopRecord} onSubmitTextFallback={handleTextFallback}
              onOpenHints={() => setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4)}
              isEvaluating={isEvaluating || unifiedSTT.isTranscribing} onResetLiveTranscript={handleResetLive}
              pendingText={pendingSpokenText} onConfirmSubmit={handleConfirmSubmit} onReRecord={handleReRecord} />
          )}
        </div>
      </main>

      <footer className="flex items-center justify-between border-t border-border/40 pt-1.5 shrink-0 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>[Space]: {lastEvaluation ? "Nói lại" : pendingSpokenText ? "Thu lại" : "Thu âm/Dừng"}</span><span>•</span>
          <span>[H]: Gợi ý ({hintTier}/4)</span><span>•</span><span>[R]: Thử thách khác</span>
          {pendingSpokenText && !isEvaluating && <><span>•</span><span className="text-primary font-bold">[Enter]: Nộp bài</span></>}
          {lastEvaluation && <><span>•</span><span className="text-primary font-bold">[Enter]: Tiếp tục</span></>}
        </div>
        <div className="flex items-center gap-2">
          <span>Toulmin: {lastEvaluation?.toulmin?.toulminScore ?? "–"}%</span><span>•</span>
          <span>Mastery: {skillMastery.overallMastery}%</span>
        </div>
      </footer>

      <Dialog open={isTopicModalOpen} onOpenChange={setIsTopicModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-5 bg-card border border-border/80 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold flex items-center gap-2"><Compass className="size-5 text-primary" /><span>Đổi chủ đề Advanced</span></DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Chọn ngữ cảnh có sẵn hoặc nhập tình huống tùy chỉnh.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {PRESET_TOPICS.map((topic) => {
              const IconComp = TOPIC_ICONS[topic.icon] || Sparkles;
              const isSel = selectedTopicId === topic.id;
              return (
                <button key={topic.id} type="button" onClick={() => { setSelectedTopic(topic.id, ""); setCustomInputVal(""); setIsTopicModalOpen(false); toast.success("Đã chọn chủ đề", topic.labelVi); }}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left cursor-pointer ${isSel ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border/70 hover:border-primary/40"}`}>
                  <div className={`size-7 rounded-xl flex items-center justify-center shrink-0 ${isSel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <IconComp className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate">{topic.labelVi}</span>
                    <span className="text-[10px] text-muted-foreground font-mono block truncate">{topic.labelEn}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="p-3 rounded-2xl border border-border/70 bg-muted/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs"><Wand2 className="size-3.5 text-primary" /><span className="font-semibold">Hoặc nhập bối cảnh tùy chỉnh:</span></div>
            <div className="flex gap-2">
              <input type="text" value={customInputVal} onChange={(e) => setCustomInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && customInputVal.trim()) { setSelectedTopic("custom", customInputVal.trim()); setIsTopicModalOpen(false); } }}
                placeholder="VD: Đàm phán SaaS, phỏng vấn PM..." className="flex-1 h-9 px-3 text-xs rounded-xl bg-background border border-border/80" />
              <Button type="button" size="sm" onClick={() => { if (customInputVal.trim()) { setSelectedTopic("custom", customInputVal.trim()); setIsTopicModalOpen(false); } }} className="h-9 px-3 rounded-xl text-xs gap-1 cursor-pointer">
                <Check className="size-3" /><span>Áp dụng</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdvSummaryModal isOpen={isSessionCompleted} summary={sessionSummary} onRestart={() => { resetSession(); void initSession({ mode: sessionConfig.mode, track: sessionConfig.track, level: adaptiveState.currentLevel }); }} />
    </div>
  );
}

export default function AdvancedSessionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Đang tải Studio Advanced...</div>}>
      <AdvancedStudioInner />
    </Suspense>
  );
}
