"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { ArrowLeft, BookOpen, Sparkles, AlertTriangle } from "lucide-react";

import { useVocabularyStore } from "@/stores/vocabulary-context-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { transcribeViaServer } from "@/lib/stt/service";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";

import { VocabularyCommandSearch } from "@/components/foundation/vocabulary/VocabularyCommandSearch";
import { VocabularyPromptCard } from "@/components/foundation/vocabulary/VocabularyPromptCard";
import { VocabularyFeedbackCard } from "@/components/foundation/vocabulary/VocabularyFeedbackCard";

export default function VocabularyContextPage() {
  const router = useRouter();
  const {
    activeStep,
    currentWord,
    selectedSentenceIndex,
    recentWords,
    isSearching,
    isEvaluating,
    lastWordEvaluation,
    lastSentenceEvaluation,
    setActiveStep,
    setSelectedSentenceIndex,
    selectWord,
    shuffleRandomWord,
    searchWord,
    deepEnrichWithAI,
    processWordEvaluation,
    processSentenceEvaluation,
    resetEvaluations,
  } = useVocabularyStore();

  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");

  const [speakingMode, setSpeakingMode] = useState<"guided" | "spontaneous">("guided");
  const [currentHintTier, setCurrentHintTier] = useState(0);
  const [autoStartMic, setAutoStartMic] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Reset hint tier on step or word change
  useEffect(() => {
    setCurrentHintTier(0);
    setPendingSpokenText(null);
    setPromptDisplayTime(Date.now());
    if (activeStep === 1) {
      setSpeakingMode("guided");
    }
  }, [activeStep, currentWord.id]);

  // Recording duration timer
  useEffect(() => {
    if (recorder.status === "recording") {
      const recStart = Date.now();
      durationRef.current = setInterval(() => {
        setRecordingDurationMs(Date.now() - recStart);
      }, 100);
    } else {
      if (durationRef.current) clearInterval(durationRef.current);
      setRecordingDurationMs(0);
    }
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [recorder.status]);

  const handleStartRecord = useCallback(async () => {
    soundEffects.playMicStart();
    speechRec.resetTranscript();
    setPendingSpokenText(null);

    let sttProvider = "browser";
    try {
      const { useSettingsStore } = await import("@/stores/settings-store");
      sttProvider = useSettingsStore.getState().stt?.provider || "browser";
    } catch {}

    try {
      await recorder.start();
      if (sttProvider === "browser") {
        speechRec.startListening();
      }
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro.");
    }
  }, [recorder, speechRec]);

  const executeEvaluation = useCallback(
    async (spokenText: string) => {
      let provider = "gemini";
      let model = "auto";
      try {
        const { useSettingsStore } = await import("@/stores/settings-store");
        const s = useSettingsStore.getState();
        provider = s.activeProvider || "gemini";
        model = (provider === "groq" ? s.preferredGroqModel : s.preferredGeminiModel) || "auto";
      } catch {}

      useVocabularyStore.setState({ isEvaluating: true });
      try {
        const res = await fetch("/api/foundation/vocabulary/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: activeStep,
            mode: speakingMode,
            wordItem: currentWord,
            sentenceItem: currentWord.contextSentences[selectedSentenceIndex],
            spontaneousChallenge: currentWord.spontaneousChallenge,
            userTranscript: spokenText,
            provider,
            model,
          }),
        });

        const data = await res.json();
        if (data.evaluation) {
          soundEffects.playAIReady();
          if (activeStep === 1) {
            processWordEvaluation(data.evaluation);
          } else {
            processSentenceEvaluation(data.evaluation);
          }
        } else {
          toast.error("Lỗi đánh giá", data.error || "Không nhận được phản hồi từ AI.");
        }
      } catch {
        toast.error("Lỗi đánh giá", "Không thể hoàn tất đánh giá lúc này.");
      } finally {
        useVocabularyStore.setState({ isEvaluating: false });
        setPendingSpokenText(null);
      }
    },
    [activeStep, speakingMode, currentWord, selectedSentenceIndex, processWordEvaluation, processSentenceEvaluation]
  );

  // Stop recording -> Store in pending review state
  const handleStopRecord = useCallback(async () => {
    if (recorder.status !== "recording") return;
    soundEffects.playMicStop();

    let sttProvider = "browser";
    let sttModel = "auto";
    try {
      const { useSettingsStore } = await import("@/stores/settings-store");
      const settings = useSettingsStore.getState();
      sttProvider = settings.stt?.provider || "browser";
      sttModel = settings.stt?.model || "auto";
    } catch {}

    if (sttProvider === "browser") {
      speechRec.stopListening();
    }

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
        await new Promise((r) => setTimeout(r, 250));
        spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
      }

      if (!spokenText) {
        toast.info("Chưa phát hiện giọng nói", "Vui lòng bấm mic và thử nói lại.");
        return;
      }
      setPendingSpokenText(spokenText);
    } catch {
      toast.error("Lỗi xử lý", "Không thể dừng micro.");
    }
  }, [recorder, speechRec]);

  // Confirm submit pending speech
  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText) return;
    await executeEvaluation(pendingSpokenText);
  }, [pendingSpokenText, executeEvaluation]);

  // Re-record
  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartRecord();
  }, [handleStartRecord]);

  const handleSubmitTextFallback = useCallback(
    async (text: string) => {
      await executeEvaluation(text.trim());
    },
    [executeEvaluation]
  );

  // Retry: clear eval, reset mic
  const handleRetry = useCallback(() => {
    resetEvaluations();
    setPendingSpokenText(null);
    speechRec.resetTranscript();
    setPromptDisplayTime(Date.now());
  }, [resetEvaluations, speechRec]);

  // Continue after feedback
  const handleContinue = useCallback(() => {
    setPendingSpokenText(null);
    const eval1 = lastWordEvaluation;
    const eval2 = lastSentenceEvaluation;
    if (activeStep === 1 && eval1?.isSuccessful) {
      // Auto-advance to Step 2
      setActiveStep(2);
      setSpeakingMode("guided");
    } else if (activeStep === 1) {
      // Retry Step 1
      handleRetry();
    } else if (activeStep === 2 && speakingMode === "guided" && eval2?.isSuccessful) {
      // Advance to Spontaneous challenge
      setSpeakingMode("spontaneous");
      handleRetry();
    } else if (activeStep === 2 && eval2?.isSuccessful) {
      // Step 2 Spontaneous done → shuffle next word
      shuffleRandomWord();
    } else {
      handleRetry();
    }
  }, [activeStep, speakingMode, lastWordEvaluation, lastSentenceEvaluation, setActiveStep, handleRetry, shuffleRandomWord]);

  const hasEvaluation =
    (activeStep === 1 && !!lastWordEvaluation) ||
    (activeStep === 2 && !!lastSentenceEvaluation);

  const activeSentence =
    currentWord.contextSentences[selectedSentenceIndex] ||
    currentWord.contextSentences[0];

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      // Ignore Ctrl+K (handled by search)
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyK") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (hasEvaluation) {
          handleRetry();
        } else if (recorder.status === "recording") {
          handleStopRecord();
        } else if (pendingSpokenText) {
          handleReRecord();
        } else if (!isEvaluating && !isSearching) {
          handleStartRecord();
        }
      } else if (e.code === "Backspace" && recorder.status === "recording") {
        e.preventDefault();
        speechRec.resetTranscript();
        setPendingSpokenText(null);
        toast.info("Đã xóa câu nói dở", "Tiếp tục nói lại từ đầu...");
      } else if (e.code === "KeyH" && !hasEvaluation && !isEvaluating) {
        e.preventDefault();
        setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
      } else if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (hasEvaluation) {
          e.preventDefault();
          handleContinue();
        }
      } else if (e.code === "KeyR" && recorder.status !== "recording" && !hasEvaluation && !isEvaluating) {
        e.preventDefault();
        setPendingSpokenText(null);
        shuffleRandomWord();
      } else if (e.code === "Escape") {
        e.preventDefault();
        router.push("/foundation");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    recorder.status,
    isEvaluating,
    isSearching,
    hasEvaluation,
    pendingSpokenText,
    handleStartRecord,
    handleStopRecord,
    handleConfirmSubmit,
    handleReRecord,
    handleRetry,
    handleContinue,
    shuffleRandomWord,
    router,
    speechRec,
  ]);

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] bg-card text-foreground flex flex-col overflow-hidden rounded-3xl border border-border/80 shadow-xs select-none">
      {/* ── Studio Header ── */}
      <header className="h-14 border-b border-border/60 px-4 sm:px-6 flex items-center justify-between bg-card/60 backdrop-blur-md shrink-0 gap-3">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/foundation">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-full hover:bg-muted shrink-0"
              title="Thoát Studio (Esc)"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="size-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground truncate">
              Spoken Vocabulary Studio
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono hidden md:inline-flex shrink-0">
              {currentWord.word} · {currentWord.cefrLevel}
            </Badge>
          </div>
        </div>

        {/* Right: Step Toggle + Search + Random + GlobalAiSelector */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Step Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
            <button
              onClick={() => setActiveStep(1)}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeStep === 1
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              1. Phát âm
            </button>
            <button
              onClick={() => setActiveStep(2)}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeStep === 2
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              2. Câu ngữ cảnh
            </button>
          </div>

          {/* Command Search */}
          <VocabularyCommandSearch
            currentWordId={currentWord.id}
            recentWords={recentWords}
            isSearching={isSearching}
            onSearch={searchWord}
            onSelectWord={selectWord}
            onShuffleRandomWord={shuffleRandomWord}
          />

          <GlobalAiSelector size="sm" />
        </div>
      </header>

      {/* ── Main Studio Body: 2-Column Split ── */}
      <main className="flex-1 p-3 sm:p-4 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
        {/* Left Column (5 cols): Prompt Card OR Skeleton */}
        <div className="lg:col-span-5 h-full overflow-hidden">
          {isSearching ? (
            <Card className="h-full rounded-3xl border border-border/80 bg-card p-6 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                <Sparkles className="size-7 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">AI đang phân tích từ vựng...</p>
                <p className="text-xs text-muted-foreground">Xây dựng IPA, Collocations, Câu ngữ cảnh</p>
              </div>
              <Skeleton className="h-28 w-full rounded-2xl mt-3" />
            </Card>
          ) : (
            <VocabularyPromptCard
              step={activeStep}
              wordItem={currentWord}
              sentenceItem={activeSentence}
              selectedSentenceIndex={selectedSentenceIndex}
              onSelectSentenceIndex={setSelectedSentenceIndex}
              currentHintTier={currentHintTier}
              onSelectHintTier={setCurrentHintTier}
              isEnriching={isSearching}
              onDeepEnrichWithAI={deepEnrichWithAI}
              speakingMode={speakingMode}
              onSelectSpeakingMode={setSpeakingMode}
            />
          )}
        </div>

        {/* Right Column (7 cols): Speaking Controller OR Feedback Card */}
        <div className="lg:col-span-7 h-full overflow-hidden">
          {hasEvaluation ? (
            <VocabularyFeedbackCard
              step={activeStep}
              wordPronuncEval={lastWordEvaluation}
              sentenceEval={lastSentenceEvaluation}
              onRetry={handleRetry}
              onContinue={handleContinue}
              continueLabel={
                activeStep === 1 && lastWordEvaluation?.isSuccessful
                  ? "Sang Bước 2: Câu ngữ cảnh →"
                  : activeStep === 1
                  ? "Thử lại phát âm"
                  : activeStep === 2 && speakingMode === "guided" && lastSentenceEvaluation?.isSuccessful
                  ? "Thử thách phản xạ tự do →"
                  : activeStep === 2 && !lastSentenceEvaluation?.isSuccessful
                  ? "Nói lại câu này"
                  : "Từ tiếp theo →"
              }
            />
          ) : (
            <SpeakingController
              status={
                isEvaluating
                  ? "processing"
                  : recorder.status === "recording"
                  ? "recording"
                  : "idle"
              }
              isListening={speechRec.isListening}
              liveTranscript={speechRec.fullTranscript || speechRec.transcript}
              durationMs={recordingDurationMs}
              autoStartMic={autoStartMic}
              onToggleAutoStartMic={setAutoStartMic}
              onStartRecord={handleStartRecord}
              onStopRecord={handleStopRecord}
              onSubmitTextFallback={handleSubmitTextFallback}
              onOpenHints={() => setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1))}
              isEvaluating={isEvaluating}
              onResetLiveTranscript={() => {
                speechRec.resetTranscript();
                setPendingSpokenText(null);
              }}
              pendingText={pendingSpokenText}
              onConfirmSubmit={handleConfirmSubmit}
              onReRecord={handleReRecord}
            />
          )}
        </div>
      </main>

      {/* ── Footer Cheatsheet ── */}
      <footer className="h-10 border-t border-border/40 px-4 sm:px-6 flex items-center justify-between text-[11px] text-muted-foreground bg-card/40 shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">Space</kbd>
            <span>
              {hasEvaluation
                ? "Nói lại"
                : pendingSpokenText
                ? "Thu âm lại"
                : recorder.status === "recording"
                ? "Dừng nói"
                : "Bật mic"}
            </span>
          </span>
          {recorder.status === "recording" && (
            <span className="flex items-center gap-1 text-red-500 font-semibold animate-pulse">
              <kbd className="px-1.5 py-0.5 rounded bg-red-500/20 text-[10px] font-mono font-bold">Backspace</kbd>
              <span>Xóa nói dở</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">H</kbd>
            <span>Gợi ý ({currentHintTier}/4)</span>
          </span>
          {!hasEvaluation && (
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">R</kbd>
              <span>Đổi từ ngẫu nhiên</span>
            </span>
          )}
          {pendingSpokenText && !isEvaluating && (
            <span className="flex items-center gap-1 text-primary font-bold">
              <kbd className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono">Enter</kbd>
              <span>Nộp bài chấm điểm</span>
            </span>
          )}
          {hasEvaluation && (
            <span className="flex items-center gap-1 text-primary font-bold">
              <kbd className="px-1.5 py-0.5 rounded bg-primary/20 text-[10px] font-mono">Enter</kbd>
              <span>Tiếp tục</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">Ctrl+K</kbd>
            <span>Tra từ</span>
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px]">
          <kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd> Thoát
        </span>
      </footer>
    </div>
  );
}
