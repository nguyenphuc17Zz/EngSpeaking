"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
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
    if (recorder.status !== "recording") return;

    soundEffects.playMicStop();
    const settings = useSettingsStore.getState();
    const sttProvider = settings.stt?.provider || "browser";
    const sttModel =
      settings.stt?.model ||
      (sttProvider === "groq" ? "whisper-large-v3" : "onnx-community/whisper-tiny.en");

    speechRec.stopListening();
    const measuredLatency = Math.max(500, Date.now() - promptDisplayTime);

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
      } else if (e.code === "Enter") {
        if (pendingSpokenText && !isEvaluating) {
          e.preventDefault();
          handleConfirmSubmit();
        } else if (lastChainEvaluation || lastSingleEvaluation) {
          e.preventDefault();
          handleContinue();
        }
      } else if (e.code === "Escape") {
        e.preventDefault();
        router.push("/foundation");
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
    handleStartRecord,
    handleStopRecord,
    handleConfirmSubmit,
    handleReRecord,
    router,
    speechRec,
  ]);

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] bg-card text-foreground flex flex-col justify-between overflow-hidden rounded-3xl border border-border/80 shadow-xs select-none">
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
              onClick={() => setMode("chain_builder")}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                mode === "chain_builder"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chain Builder
            </button>
            <button
              onClick={() => setMode("single_chunk")}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                mode === "single_chunk"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Single Chunk
            </button>
          </div>

          {/* Pragmatic Strategy Selector (Chain Builder) */}
          {mode === "chain_builder" && (
            <div className="hidden lg:flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-xl border border-border/60 text-xs">
              <GitFork className="size-3.5 text-primary shrink-0" />
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value as any)}
                className="bg-transparent border-0 text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
                title="Chọn chiến lược lập luận ngữ dụng"
              >
                <option value="all">Ngẫu nhiên mọi chiến lược</option>
                <option value="opinion_defense">Lập trường & Biện minh</option>
                <option value="concession_counter">Nhượng bộ & Phản biện (7.5+)</option>
                <option value="problem_solution">Chẩn đoán & Giải pháp</option>
                <option value="hypothetical_projection">Giả định & Hệ quả</option>
                <option value="cause_effect_chain">Chuỗi nhân quả động</option>
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextChainTask()}
                disabled={isGenerating || isEvaluating}
                className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                title="Đổi tình huống AI ngẫu nhiên mới"
              >
                <Dices className="size-3.5" />
              </Button>
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

          <GlobalAiSelector size="sm" />
        </div>
      </header>

      {/* Main Studio Body: 2-Column Split Studio */}
      <main className="flex-1 p-3 sm:p-5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (5 Cols): Prompt Card OR Skeleton OR Error */}
        <div className="lg:col-span-5 h-full overflow-hidden flex flex-col justify-between">
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

        {/* Right Column (7 Cols): Speaking Controller OR Evaluation Feedback */}
        <div className="lg:col-span-7 h-full overflow-hidden flex flex-col justify-between">
          {lastChainEvaluation || lastSingleEvaluation ? (
            <ChunkFeedbackCard
              chainEvaluation={lastChainEvaluation}
              singleEvaluation={lastSingleEvaluation}
              onRetry={handleRetryCurrent}
              onContinue={handleContinue}
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
