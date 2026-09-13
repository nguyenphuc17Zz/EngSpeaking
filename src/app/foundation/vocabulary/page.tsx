"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { ArrowLeft, BookOpen, Sparkles, AlertTriangle, Volume2, RotateCcw, ChevronDown } from "lucide-react";

import { useVocabularyStore } from "@/stores/vocabulary-context-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { useSettingsStore } from "@/stores/settings-store";
import { transcribeViaServer } from "@/lib/stt/service";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";

import { VocabularyCommandSearch } from "@/components/foundation/vocabulary/VocabularyCommandSearch";
import { VocabularyPhoneticsCard } from "@/components/foundation/vocabulary/VocabularyPhoneticsCard";
import { VocabularyContextCard } from "@/components/foundation/vocabulary/VocabularyContextCard";
import { VocabularyFeedbackCard } from "@/components/foundation/vocabulary/VocabularyFeedbackCard";

export default function VocabularyContextPage() {
  const router = useRouter();
  const {
    activeStep,
    currentWord,
    selectedSentenceIndex,
    recentWords,
    historyStack,
    isSearching,
    isEnrichingContext,
    isEvaluating,
    aiError,
    lastWordEvaluation,
    lastSentenceEvaluation,
    selectedCefrFilter,
    selectedPosFilter,
    setCefrFilter,
    setPosFilter,
    setActiveStep,
    setSelectedSentenceIndex,
    selectWord,
    shuffleRandomWord,
    goToPreviousWord,
    searchWord,
    deepEnrichWithAI,
    processWordEvaluation,
    processSentenceEvaluation,
    resetEvaluations,
  } = useVocabularyStore();

  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");
  const tts = useBrowserTTS();
  const keybindings = useSettingsStore((s) => s.vocabularyKeybindings);

  const [speakingMode, setSpeakingMode] = useState<"guided" | "spontaneous">("guided");
  const [currentHintTier, setCurrentHintTier] = useState(0);
  const [autoStartMic, setAutoStartMic] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Reset hint tier on step or word change & release mic
  useEffect(() => {
    setCurrentHintTier(0);
    setPendingSpokenText(null);
    setPromptDisplayTime(Date.now());
    speechRec.stopListening();
    if (recorder.status === "recording") {
      recorder.cancel?.();
    }
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
    soundEffects.playMicStop();

    // 1. ALWAYS unconditionally stop Web Speech API first
    speechRec.stopListening();

    let sttProvider = "browser";
    let sttModel = "auto";
    try {
      const { useSettingsStore } = await import("@/stores/settings-store");
      const settings = useSettingsStore.getState();
      sttProvider = settings.stt?.provider || "browser";
      sttModel = settings.stt?.model || "auto";
    } catch {}

    // 2. Stop audio recorder if active
    if (recorder.status === "recording") {
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
    } else {
      const spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
      if (spokenText) {
        setPendingSpokenText(spokenText);
      }
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

  // Phát âm từ vựng hiện tại qua TTS (Phím A)
  const handlePlayWord = useCallback(() => {
    if (!currentWord?.word) return;
    tts.speak(sanitizeTextForTTS(currentWord.word));
    toast.info("Đang phát âm từ", currentWord.word);
  }, [currentWord?.word, tts]);

  // Phát âm câu ngữ cảnh mẫu qua TTS (Phím S)
  const handlePlaySentence = useCallback(() => {
    const textToSpeak =
      activeStep === 2 && activeSentence?.sentenceEn
        ? activeSentence.sentenceEn
        : currentWord?.word;
    if (!textToSpeak) return;
    tts.speak(sanitizeTextForTTS(textToSpeak));
    toast.info(activeStep === 2 ? "Đang phát âm câu ngữ cảnh" : "Đang phát âm từ", textToSpeak);
  }, [activeStep, activeSentence?.sentenceEn, currentWord?.word, tts]);

  // Xóa câu nói dở / xóa nội dung vừa nói để nói lại từ đầu (Phím Z)
  const handleClearSpeech = useCallback(() => {
    if (recorder.status === "recording") {
      speechRec.resetTranscript();
      setPendingSpokenText(null);
      toast.info("Đã xóa câu nói dở [Z]", "Tiếp tục nói lại từ đầu...");
    } else if (pendingSpokenText) {
      speechRec.resetTranscript();
      setPendingSpokenText(null);
      toast.info("Đã xóa nội dung vừa nói [Z]", "Bạn có thể nhấn Space để nói lại.");
    } else if (hasEvaluation) {
      handleRetry();
      toast.info("Đã xóa kết quả lượt này", "Sẵn sàng làm lại câu mới.");
    }
  }, [recorder.status, pendingSpokenText, hasEvaluation, speechRec, handleRetry]);

  // Dynamic Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      // Ignore Ctrl+K (handled by search)
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyK") return;

      const playWordKey = keybindings?.playWord || "KeyA";
      const playSentenceKey = keybindings?.playSentence || "KeyS";
      const clearSpeechKey = keybindings?.clearSpeech || "KeyZ";
      const prevWordKey = keybindings?.previousWord || "KeyQ";
      const toggleMicKey = keybindings?.toggleMic || "Space";
      const submitKey = keybindings?.submitOrNext || "Enter";
      const hintsKey = keybindings?.toggleHints || "KeyH";
      const randomWordKey = keybindings?.randomWord || "KeyR";

      // Phím A: Nghe phát âm từ
      if ((e.code === playWordKey || e.code === "KeyA" || e.code === "KeyP") && !isEvaluating) {
        e.preventDefault();
        handlePlayWord();
      }
      // Phím S: Nghe câu ngữ cảnh
      else if ((e.code === playSentenceKey || e.code === "KeyS") && !isEvaluating) {
        e.preventDefault();
        handlePlaySentence();
      }
      // Phím Z (hoặc Backspace / Delete): Xóa câu nói dở / Xóa nội dung vừa nói
      else if (
        e.code === clearSpeechKey ||
        e.code === "KeyZ" ||
        e.code === "Backspace" ||
        e.code === "Delete"
      ) {
        if (recorder.status === "recording" || pendingSpokenText || hasEvaluation) {
          e.preventDefault();
          handleClearSpeech();
        }
      }
      // Phím Q: Quay lại từ trước đó (Khi bấm lộn từ)
      else if (
        (e.code === prevWordKey || e.code === "KeyQ") &&
        recorder.status !== "recording" &&
        !hasEvaluation &&
        !isEvaluating
      ) {
        if (historyStack && historyStack.length > 0) {
          e.preventDefault();
          setPendingSpokenText(null);
          goToPreviousWord();
        }
      }
      // Phím Space: Bật / Dừng thu âm / Nói lại
      else if (e.code === toggleMicKey || e.code === "Space") {
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
      }
      // Phím H: Gợi ý
      else if (e.code === hintsKey || e.code === "KeyH") {
        if (!hasEvaluation && !isEvaluating) {
          e.preventDefault();
          setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
        }
      }
      // Phím Enter: Nộp bài / Tiếp tục
      else if (e.code === submitKey || e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (hasEvaluation) {
          e.preventDefault();
          handleContinue();
        }
      }
      // Phím R: Đổi từ vựng ngẫu nhiên
      else if ((e.code === randomWordKey || e.code === "KeyR") && recorder.status !== "recording" && !hasEvaluation && !isEvaluating) {
        e.preventDefault();
        setPendingSpokenText(null);
        shuffleRandomWord();
      }
      // Phím 1 & 2: Chuyển nhanh giữa Bước 1 & Bước 2
      else if (e.code === "Digit1" || e.code === "Numpad1") {
        e.preventDefault();
        setActiveStep(1);
      } else if (e.code === "Digit2" || e.code === "Numpad2") {
        e.preventDefault();
        setActiveStep(2);
      }
      // Phím Esc: Đóng gợi ý
      else if (e.code === "Escape") {
        if (currentHintTier > 0) {
          e.preventDefault();
          setCurrentHintTier(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    keybindings,
    recorder.status,
    isEvaluating,
    isSearching,
    hasEvaluation,
    pendingSpokenText,
    currentHintTier,
    historyStack,
    handleStartRecord,
    handleStopRecord,
    handleConfirmSubmit,
    handleReRecord,
    handleRetry,
    handleContinue,
    handlePlayWord,
    handlePlaySentence,
    handleClearSpeech,
    goToPreviousWord,
    shuffleRandomWord,
    setActiveStep,
  ]);

  return (
    <div className="w-full h-full max-h-[calc(100vh-5.5rem)] bg-card text-foreground flex flex-col overflow-hidden rounded-3xl border border-border/80 shadow-xs">
      {/* ── Studio Header ── */}
      <header className="h-13 border-b border-border/60 px-4 sm:px-6 flex items-center justify-between bg-card/60 backdrop-blur-md shrink-0 gap-3">
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

        {/* Right: Step Toggle + Next Word + Search + GlobalAiSelector */}
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

          {/* Cụm Bộ lọc Đôi CEFR & Loại từ (Part of Speech) */}
          <div className="hidden sm:flex items-center gap-1 bg-muted/50 p-0.5 rounded-xl border border-border/60">
            <div className="relative flex items-center">
              <select
                value={selectedCefrFilter}
                onChange={(e) => setCefrFilter(e.target.value)}
                className="h-7 text-[11px] font-semibold bg-transparent text-foreground pl-2 pr-5 rounded-lg border-0 cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none appearance-none hover:bg-muted/80 transition-colors"
                title="Lọc cấp độ CEFR khi đổi từ"
              >
                <option value="all" className="bg-popover text-popover-foreground">Tất cả Level</option>
                <option value="A1" className="bg-popover text-popover-foreground">A1 · Căn bản</option>
                <option value="A2" className="bg-popover text-popover-foreground">A2 · Sơ cấp</option>
                <option value="B1" className="bg-popover text-popover-foreground">B1 · Trung cấp</option>
                <option value="B2" className="bg-popover text-popover-foreground">B2 · Trung cấp trên</option>
                <option value="C1" className="bg-popover text-popover-foreground">C1 · Cao cấp</option>
              </select>
              <ChevronDown className="size-3 text-muted-foreground absolute right-1.5 pointer-events-none" />
            </div>

            <div className="w-[1px] h-3.5 bg-border/80 shrink-0" />

            <div className="relative flex items-center">
              <select
                value={selectedPosFilter}
                onChange={(e) => setPosFilter(e.target.value)}
                className="h-7 text-[11px] font-semibold bg-transparent text-foreground pl-2 pr-5 rounded-lg border-0 cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none appearance-none hover:bg-muted/80 transition-colors"
                title="Lọc loại từ (Động từ, Danh từ, Tính từ...) khi đổi từ"
              >
                <option value="all" className="bg-popover text-popover-foreground">Tất cả từ loại</option>
                <option value="verb" className="bg-popover text-popover-foreground">Động từ (Verb)</option>
                <option value="noun" className="bg-popover text-popover-foreground">Danh từ (Noun)</option>
                <option value="adjective" className="bg-popover text-popover-foreground">Tính từ (Adj)</option>
                <option value="adverb" className="bg-popover text-popover-foreground">Trạng từ (Adv)</option>
              </select>
              <ChevronDown className="size-3 text-muted-foreground absolute right-1.5 pointer-events-none" />
            </div>
          </div>

          {/* Previous Word Button (Khi lỡ bấm nhầm hoặc muốn quay lại) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPreviousWord()}
            disabled={!historyStack || historyStack.length === 0 || isSearching}
            className="h-8 px-2 rounded-xl text-xs gap-1 border-border/80 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all shadow-2xs btn-spring"
            title={
              historyStack && historyStack.length > 0
                ? `Quay lại từ vừa học trước đó: "${historyStack[0]?.word}" (Phím Q)`
                : "Chưa có từ trước đó"
            }
          >
            <RotateCcw className="size-3" />
            <span className="hidden md:inline">Trước</span>
            <span className="text-[9px] font-mono opacity-60 hidden sm:inline">[Q]</span>
          </Button>

          {/* Next Word Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => shuffleRandomWord()}
            disabled={isSearching}
            className="h-8 px-2.5 rounded-xl font-bold text-xs gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-primary transition-all shadow-2xs btn-spring"
            title="Đổi sang từ tiếp theo trong kho từ điển (Phím R)"
          >
            <Sparkles
              className={`size-3.5 ${
                isEnrichingContext
                  ? "animate-spin text-amber-500"
                  : isSearching
                  ? "animate-spin"
                  : ""
              }`}
            />
            <span>Tiếp theo</span>
            <span className="text-[9px] font-mono opacity-60 hidden sm:inline">[R]</span>
          </Button>

          {/* Command Search (Tra từ bất kỳ bằng AI) */}
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

      {/* ── Main Studio Body: Professional 3-Column Split ── */}
      <main className="flex-1 min-h-0 p-2.5 sm:p-3.5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 lg:gap-3">
        {/* Column 1 (4 cols): Word & Phonetics Anatomy - Always instant render */}
        <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
          <VocabularyPhoneticsCard
            step={activeStep}
            wordItem={currentWord}
            isEnriching={isEnrichingContext}
            onDeepEnrichWithAI={deepEnrichWithAI}
            onNextWord={() => shuffleRandomWord()}
            isSearchingNext={isEnrichingContext}
          />
        </div>

        {/* Column 2 (5 cols): Context, Collocations & Progressive Hints - Instant render with background AI */}
        <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
          <VocabularyContextCard
            step={activeStep}
            wordItem={currentWord}
            sentenceItem={activeSentence}
            selectedSentenceIndex={selectedSentenceIndex}
            onSelectSentenceIndex={setSelectedSentenceIndex}
            currentHintTier={currentHintTier}
            onSelectHintTier={setCurrentHintTier}
            speakingMode={speakingMode}
            onSelectSpeakingMode={setSpeakingMode}
            isEnrichingContext={isEnrichingContext}
            aiError={aiError}
            onRegenerateWithAI={deepEnrichWithAI}
          />
        </div>

        {/* Column 3 (3 cols): Compact Interactive Voice Studio OR Feedback Card */}
        <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
          {hasEvaluation ? (
            <VocabularyFeedbackCard
              step={activeStep}
              wordPronuncEval={lastWordEvaluation}
              sentenceEval={lastSentenceEvaluation}
              onRetry={handleRetry}
              onContinue={handleContinue}
              continueLabel={
                activeStep === 1 && lastWordEvaluation?.isSuccessful
                  ? "Sang Bước 2 →"
                  : activeStep === 1
                  ? "Thử lại phát âm"
                  : activeStep === 2 && speakingMode === "guided" && lastSentenceEvaluation?.isSuccessful
                  ? "Phản xạ tự do →"
                  : activeStep === 2 && !lastSentenceEvaluation?.isSuccessful
                  ? "Nói lại câu này"
                  : "Từ tiếp theo →"
              }
            />
          ) : (
            <SpeakingController
              compact
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
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* Mic space toggle */}
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">Space</kbd>
            <span>
              {hasEvaluation
                ? "Nói lại"
                : pendingSpokenText
                ? "Thu lại"
                : recorder.status === "recording"
                ? "Dừng nói"
                : "Bật mic"}
            </span>
          </span>

          {/* Phím A: Nghe từ */}
          <span className="flex items-center gap-1 text-foreground/80 font-medium">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-primary">A</kbd>
            <span>Nghe từ</span>
          </span>

          {/* Phím S: Nghe câu */}
          <span className="flex items-center gap-1 text-foreground/80 font-medium">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-indigo-500">S</kbd>
            <span>Nghe câu</span>
          </span>

          {/* Phím Z: Xóa nói dở / xóa câu vừa nói */}
          {(recorder.status === "recording" || pendingSpokenText) && (
            <span className="flex items-center gap-1 text-red-500 font-semibold animate-pulse">
              <kbd className="px-1.5 py-0.5 rounded bg-red-500/20 text-[10px] font-mono font-bold">Z</kbd>
              <span>{pendingSpokenText ? "Xóa câu vừa nói" : "Xóa nói dở"}</span>
            </span>
          )}

          {/* Gợi ý */}
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">H</kbd>
            <span>Gợi ý ({currentHintTier}/4)</span>
          </span>

          {/* Từ trước & Từ tiếp */}
          {!hasEvaluation && (
            <span className="flex items-center gap-1">
              {historyStack && historyStack.length > 0 && (
                <>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold text-muted-foreground">Q</kbd>
                  <span>Từ trước</span>
                  <span className="opacity-40">·</span>
                </>
              )}
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">R</kbd>
              <span>Từ tiếp</span>
            </span>
          )}

          {/* Phím 1 / 2 chuyển bước */}
          <span className="hidden md:inline-flex items-center gap-1 text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">1</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">2</kbd>
            <span>Chuyển bước</span>
          </span>

          {/* Nộp bài */}
          {pendingSpokenText && !isEvaluating && (
            <span className="flex items-center gap-1 text-primary font-bold">
              <kbd className="px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono">Enter</kbd>
              <span>Nộp bài</span>
            </span>
          )}

          {/* Tiếp tục */}
          {hasEvaluation && (
            <span className="flex items-center gap-1 text-primary font-bold">
              <kbd className="px-1.5 py-0.5 rounded bg-primary/20 text-[10px] font-mono">Enter</kbd>
              <span>Tiếp tục</span>
            </span>
          )}

          {/* Tra từ */}
          <span className="hidden lg:inline-flex items-center gap-1">
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
