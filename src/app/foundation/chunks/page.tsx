"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Mic,
  Square,
  RotateCcw,
  Zap,
  AlertTriangle,
  Loader2,
  Delete,
  Volume2,
  Settings2,
  Dices,
  GitFork,
  Target,
} from "lucide-react";

import { useChunkStore } from "@/stores/chunk-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { transcribeViaServer } from "@/lib/stt/service";
import { Waveform } from "@/components/voice/Waveform";

import { ChunkPromptCard } from "@/components/foundation/chunks/ChunkPromptCard";
import { ChunkContextCard } from "@/components/foundation/chunks/ChunkContextCard";
import { ChunkFeedbackCard } from "@/components/foundation/chunks/ChunkFeedbackCard";
import { MyChunksDrawer } from "@/components/foundation/chunks/MyChunksDrawer";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";

export default function ChunkAutomaticityPage() {
  const router = useRouter();
  const {
    mode,
    library,
    currentChainTask,
    currentSingleTask,
    selectedStrategy,
    setSelectedStrategy,
    isGenerating,
    isEvaluating,
    setIsEvaluating,
    generationError,
    lastChainEvaluation,
    lastSingleEvaluation,
    setMode,
    loadLibrary,
    fetchNextChainTask,
    fetchNextSingleTask,
    clearGenerationError,
    saveCustomChunk,
    processChainEvaluation,
    processSingleEvaluation,
  } = useChunkStore();

  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [promptDisplayTime, setPromptDisplayTime] = useState<number>(Date.now());
  const [currentHintTier, setCurrentHintTier] = useState<number>(0);
  const [autoStartMic, setAutoStartMic] = useState(false);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingLatencyMs, setPendingLatencyMs] = useState<number>(2000);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize
  useEffect(() => {
    loadLibrary();
    if (!currentChainTask && mode === "chain_builder") {
      fetchNextChainTask();
    } else if (!currentSingleTask && mode === "single_chunk") {
      fetchNextSingleTask();
    }
  }, [loadLibrary, currentChainTask, currentSingleTask, mode, fetchNextChainTask, fetchNextSingleTask]);

  // Track prompt display time & reset hint tier
  useEffect(() => {
    setPromptDisplayTime(Date.now());
    setCurrentHintTier(0);
    setPendingSpokenText(null);
    speechRec.stopListening();
    if (recorder.status === "recording") {
      recorder.cancel?.();
    }
  }, [currentChainTask?.id, currentSingleTask?.id]);



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

  // Start Mic
  const handleStartRecord = useCallback(async () => {
    soundEffects.playMicStart();
    speechRec.resetTranscript();
    setPendingSpokenText(null);
    const settings = useSettingsStore.getState();
    const isBrowserSTT = (settings.stt?.provider || "browser") === "browser";
    try {
      await recorder.start();
      if (isBrowserSTT) {
        speechRec.startListening();
      }
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro trong trình duyệt.");
    }
  }, [recorder, speechRec]);

  // Execute AI evaluation
  const executeEvaluation = useCallback(
    async (spokenText: string, measuredLatency: number) => {
      if (!spokenText.trim()) return;

      setIsEvaluating(true);
      try {
        // Load active provider & model
        let provider = "gemini";
        let model = "auto";
        try {
          const { useSettingsStore } = await import("@/stores/settings-store");
          const settings = useSettingsStore.getState();
          provider = settings.generation?.provider || settings.activeProvider || "gemini";
          model =
            settings.generation?.model ||
            (provider === "groq" ? settings.preferredGroqModel : settings.preferredGeminiModel) ||
            "auto";
        } catch {}

        const res = await fetch("/api/foundation/chunks/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            task: mode === "chain_builder" ? currentChainTask : currentSingleTask,
            userTranscript: spokenText,
            responseLatencyMs: measuredLatency,
            provider,
            model,
          }),
        });

        const data = await res.json();
        if (data.evaluation) {
          soundEffects.playAIReady();
          if (mode === "chain_builder") {
            processChainEvaluation(data.evaluation);
          } else {
            processSingleEvaluation(data.evaluation);
          }
        } else {
          toast.error("Lỗi đánh giá", data.error || "Không thể hoàn tất đánh giá lúc này.");
        }
      } catch {
        toast.error("Lỗi đánh giá", "Không thể hoàn tất đánh giá lúc này.");
      } finally {
        setIsEvaluating(false);
        setPendingSpokenText(null);
      }
    },
    [
      mode,
      currentChainTask,
      currentSingleTask,
      processChainEvaluation,
      processSingleEvaluation,
      setIsEvaluating,
    ]
  );

  // Stop Mic -> Store in pending review state
  const handleStopRecord = useCallback(async () => {
    soundEffects.playMicStop();

    // 1. ALWAYS unconditionally stop Web Speech API first
    speechRec.stopListening();

    const settings = useSettingsStore.getState();
    const sttProvider = settings.stt?.provider || "browser";
    const sttModel =
      settings.stt?.model ||
      (sttProvider === "groq" ? "whisper-large-v3" : "onnx-community/whisper-tiny.en");

    const measuredLatency = Math.max(500, Date.now() - promptDisplayTime);

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
          await new Promise((r) => setTimeout(r, 400));
          spokenText =
            speechRec.fullTranscript.trim() || speechRec.transcript.trim();
        }

        if (!spokenText) {
          toast.error("Chưa nhận diện được giọng nói", "Vui lòng bấm mic và nói lại.");
          return;
        }

        setPendingSpokenText(spokenText);
        setPendingLatencyMs(measuredLatency);
      } catch {
        toast.error("Lỗi xử lý", "Không thể dừng micro.");
      }
    } else {
      const spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
      if (spokenText) {
        setPendingSpokenText(spokenText);
        setPendingLatencyMs(measuredLatency);
      }
    }
  }, [recorder, speechRec, promptDisplayTime]);

  // Confirm submit pending speech
  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingSpokenText) return;
    await executeEvaluation(pendingSpokenText, pendingLatencyMs);
  }, [pendingSpokenText, pendingLatencyMs, executeEvaluation]);

  // Re-record
  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartRecord();
  }, [handleStartRecord]);

  const handleContinue = () => {
    setPendingSpokenText(null);
    speechRec.resetTranscript();
    if (mode === "chain_builder") {
      fetchNextChainTask();
    } else {
      fetchNextSingleTask();
    }
  };

  const handleRetryCurrent = () => {
    useChunkStore.setState({ lastChainEvaluation: null, lastSingleEvaluation: null });
    setPendingSpokenText(null);
    speechRec.resetTranscript();
    setPromptDisplayTime(Date.now());
  };

  // Keyboard Shortcuts (Space, Backspace, H, Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (lastChainEvaluation || lastSingleEvaluation) {
          handleRetryCurrent();
        } else if (recorder.status === "recording") {
          handleStopRecord();
        } else if (pendingSpokenText) {
          handleReRecord();
        } else if (!isEvaluating && !isGenerating) {
          handleStartRecord();
        }
      } else if (e.code === "Backspace" && recorder.status === "recording") {
        e.preventDefault();
        speechRec.resetTranscript();
        setPendingSpokenText(null);
        toast.info("Đã xóa câu nói dở", "Tiếp tục nói lại từ đầu...");
      } else if (e.code === "KeyH" && !lastChainEvaluation && !lastSingleEvaluation && !isEvaluating) {
        e.preventDefault();
        setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
      } else if (e.code === "KeyR" && recorder.status !== "recording" && !isEvaluating) {
        e.preventDefault();
        handleContinue();
      } else if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (lastChainEvaluation || lastSingleEvaluation) {
          e.preventDefault();
          handleContinue();
        }
      } else if (e.code === "Escape") {
        if (isLibraryOpen) {
          e.preventDefault();
          setIsLibraryOpen(false);
        } else if (currentHintTier > 0) {
          e.preventDefault();
          setCurrentHintTier(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    lastChainEvaluation,
    lastSingleEvaluation,
    recorder.status,
    isEvaluating,
    isGenerating,
    pendingSpokenText,
    isLibraryOpen,
    currentHintTier,
    handleStartRecord,
    handleStopRecord,
    handleConfirmSubmit,
    handleReRecord,
    router,
    speechRec,
  ]);

  return (
    <div className="w-full h-full max-h-[calc(100vh-5.5rem)] flex flex-col bg-background overflow-hidden select-none">
      {/* Studio Header */}
      <header className="h-14 border-b border-border/60 px-4 sm:px-6 flex items-center justify-between bg-card/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/foundation">
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-full hover:bg-muted"
              title="Thoát Studio (Esc)"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Layers className="size-4" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-foreground">
              Chunk Automaticity Studio
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono hidden sm:inline-flex">
              {mode === "chain_builder" ? "Speech Chain Assembly" : "Progressive Recall"}
            </Badge>
          </div>
        </div>

        {/* Right Controls: Mode Toggle, My Chunks Drawer, GlobalAiSelector */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
            <button
              onClick={() => {
                setMode("chain_builder");
                setPendingSpokenText(null);
                fetchNextChainTask();
              }}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg font-semibold transition-all",
                mode === "chain_builder"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Speech Chain (4 Khối)
            </button>
            <button
              onClick={() => {
                setMode("single_chunk");
                setPendingSpokenText(null);
                fetchNextSingleTask();
              }}
              className={cn(
                "text-xs px-2.5 py-1 rounded-lg font-semibold transition-all",
                mode === "single_chunk"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Single Recall (T1-T4)
            </button>
          </div>

          {mode === "chain_builder" && (
            <div className="hidden lg:flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-xl border border-border/60">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Mô hình:
              </span>
              <select
                value={selectedStrategy}
                onChange={(e) => {
                  setSelectedStrategy(e.target.value as any);
                  fetchNextChainTask(e.target.value as any);
                }}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
              >
                <option value="opinion_defense">Lập trường & Biện minh</option>
                <option value="concession_counter">Nhượng bộ & Phản biện (7.5+)</option>
                <option value="problem_solution">Chẩn đoán & Giải pháp</option>
                <option value="hypothetical_projection">Giả định & Hệ quả</option>
                <option value="cause_effect_chain">Chuỗi nhân quả động</option>
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLibraryOpen(true)}
            className="rounded-xl text-xs font-semibold h-8 gap-1.5 border-border/80 hidden md:inline-flex"
          >
            <BookOpen className="size-3.5" />
            <span>My Chunks ({library.length})</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleContinue}
            disabled={isGenerating || isEvaluating}
            className="rounded-xl text-xs font-semibold h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            title="Chuỗi tiếp theo (phím R)"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Chuỗi tiếp [R]</span>
          </Button>

          <GlobalAiSelector size="sm" />
        </div>
      </header>

      {/* Main Studio Body: 3-Column Zero-Scroll Studio */}
      <main className="flex-1 p-3 sm:p-4 overflow-hidden min-h-0">
        <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
          {/* Column 1 (4 cols): Prompt Card */}
          <div className="lg:col-span-4 h-full min-h-0 overflow-hidden flex flex-col">
            {isGenerating ? (
              <Card className="h-full rounded-3xl border border-border/80 bg-card p-6 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
                  <Sparkles className="size-7 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">
                    AI đang thiết kế chuỗi khối Speech Chain...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chuẩn bị 4 khối kết nối tự nhiên theo chủ đề đời sống
                  </p>
                </div>
                <Skeleton className="h-32 w-full rounded-2xl mt-4" />
              </Card>
            ) : generationError ? (
              <Card className="h-full rounded-3xl border border-red-500/30 bg-red-500/5 p-6 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="size-12 rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Không thể tạo bài tập từ AI</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">{generationError}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      clearGenerationError();
                      if (mode === "chain_builder") fetchNextChainTask();
                      else fetchNextSingleTask();
                    }}
                    className="rounded-xl font-bold text-xs gap-1.5 h-9 px-4 btn-spring"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Thử lại ngay</span>
                  </Button>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs h-9 px-3 gap-1.5">
                      <Settings2 className="size-3.5" />
                      <span>Cài đặt AI Model</span>
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <ChunkPromptCard
                mode={mode}
                chainTask={currentChainTask}
                singleTask={currentSingleTask}
                currentHintTier={currentHintTier}
                onSelectHintTier={setCurrentHintTier}
              />
            )}
          </div>

          {/* Column 2 (5 cols): Context / Structure / 4-Tier Ladder Card */}
          <div className="lg:col-span-5 h-full min-h-0 overflow-hidden flex flex-col">
            <ChunkContextCard
              mode={mode}
              chainTask={currentChainTask}
              singleTask={currentSingleTask}
              currentHintTier={currentHintTier}
              onSelectHintTier={setCurrentHintTier}
            />
          </div>

          {/* Column 3 (3 cols): Compact Speaking Controller OR Feedback */}
          <div className="lg:col-span-3 h-full min-h-0 overflow-hidden flex flex-col">
            {lastChainEvaluation || lastSingleEvaluation ? (
              <ChunkFeedbackCard
                chainEvaluation={lastChainEvaluation}
                singleEvaluation={lastSingleEvaluation}
                onRetry={handleRetryCurrent}
                onContinue={handleContinue}
              />
            ) : (
              <SpeakingController
                compact={true}
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
                onSubmitTextFallback={(text) => executeEvaluation(text, 1500)}
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
        </div>
      </main>

      {/* Studio Footer Dock: Hands-free Keybindings */}
      <footer className="h-10 border-t border-border/40 px-4 sm:px-6 flex items-center justify-between bg-card/40 backdrop-blur-xs text-[11px] text-muted-foreground font-mono shrink-0">
        <div className="flex items-center gap-4 overflow-x-auto">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Space</kbd>
            <span>
              {lastChainEvaluation || lastSingleEvaluation
                ? "Nói lại"
                : pendingSpokenText
                ? "Thu âm lại"
                : recorder.status === "recording"
                ? "Dừng nói"
                : "Bật mic"}
            </span>
          </span>
          {recorder.status === "recording" && (
            <span className="flex items-center gap-1.5 text-red-500 font-semibold animate-pulse">
              <kbd className="px-1 py-0.5 rounded bg-red-500/20 text-red-500 border border-red-500/30 text-[10px]">
                Backspace
              </kbd>
              <span>Xóa câu dở</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">H</kbd>
            <span>Đổi gợi ý T1-T4</span>
          </span>
          {pendingSpokenText && !isEvaluating && (
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <kbd className="px-1 py-0.5 rounded bg-primary text-primary-foreground border text-[10px]">Enter</kbd>
              <span>Nộp bài chấm điểm</span>
            </span>
          )}
          {(lastChainEvaluation || lastSingleEvaluation) && (
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <kbd className="px-1 py-0.5 rounded bg-primary text-primary-foreground border text-[10px]">Enter</kbd>
              <span>Chuỗi tiếp theo</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Esc</kbd>
            <span>Thoát Studio</span>
          </span>
        </div>

        <span className="hidden sm:inline text-primary font-bold">
          100% Real Dynamic AI Engine
        </span>
      </footer>

      {/* My Chunks Drawer */}
      <MyChunksDrawer
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        library={library}
        onSaveCustomChunk={saveCustomChunk}
        onSelectChunkForPractice={(chunk) => {
          setMode("single_chunk");
          fetchNextSingleTask(chunk);
        }}
      />
    </div>
  );
}
