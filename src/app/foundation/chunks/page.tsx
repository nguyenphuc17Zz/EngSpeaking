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
} from "lucide-react";

import { useChunkStore } from "@/stores/chunk-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { Waveform } from "@/components/voice/Waveform";

import { ChunkPromptCard } from "@/components/foundation/chunks/ChunkPromptCard";
import { ChunkFeedbackCard } from "@/components/foundation/chunks/ChunkFeedbackCard";
import { MyChunksDrawer } from "@/components/foundation/chunks/MyChunksDrawer";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";

export default function ChunkAutomaticityPage() {
  const router = useRouter();
  const {
    mode,
    library,
    currentChainTask,
    currentSingleTask,
    isGenerating,
    isEvaluating,
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
  const [fallbackTextInput, setFallbackTextInput] = useState("");
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
    setFallbackTextInput("");
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
    setFallbackTextInput("");
    try {
      await recorder.start();
      speechRec.startListening();
    } catch {
      toast.error("Không thể mở Micro", "Vui lòng cấp quyền truy cập micro trong trình duyệt.");
    }
  }, [recorder, speechRec]);

  // Stop Mic and Evaluate
  const handleStopRecord = useCallback(async () => {
    if (recorder.status !== "recording") return;

    soundEffects.playMicStop();
    speechRec.stopListening();

    const measuredLatency = Math.max(500, Date.now() - promptDisplayTime);

    try {
      await recorder.stop();
      await new Promise((r) => setTimeout(r, 400));
      const spokenText =
        speechRec.fullTranscript.trim() || speechRec.transcript.trim() || fallbackTextInput.trim();

      if (!spokenText) {
        toast.error("Chưa nhận diện được giọng nói", "Vui lòng nói to rõ ràng hơn hoặc nhập chữ thay thế.");
        return;
      }

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
    }
  }, [
    recorder,
    speechRec,
    fallbackTextInput,
    promptDisplayTime,
    mode,
    currentChainTask,
    currentSingleTask,
    processChainEvaluation,
    processSingleEvaluation,
  ]);

  // Text submit fallback
  const handleSubmitFallbackText = async () => {
    if (!fallbackTextInput.trim()) return;
    const measuredLatency = Math.max(500, Date.now() - promptDisplayTime);

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

    try {
      const res = await fetch("/api/foundation/chunks/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          task: mode === "chain_builder" ? currentChainTask : currentSingleTask,
          userTranscript: fallbackTextInput.trim(),
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
      }
    } catch {
      toast.error("Lỗi đánh giá", "Không thể hoàn tất đánh giá lúc này.");
    }
  };

  const handleContinue = () => {
    speechRec.resetTranscript();
    setFallbackTextInput("");
    if (mode === "chain_builder") {
      fetchNextChainTask();
    } else {
      fetchNextSingleTask();
    }
  };

  const handleRetryCurrent = () => {
    useChunkStore.setState({ lastChainEvaluation: null, lastSingleEvaluation: null });
    speechRec.resetTranscript();
    setFallbackTextInput("");
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
        } else if (!isEvaluating && !isGenerating) {
          handleStartRecord();
        }
      } else if (e.code === "Backspace" && recorder.status === "recording") {
        e.preventDefault();
        speechRec.resetTranscript();
        toast.info("Đã xóa câu nói dở", "Tiếp tục nói lại từ đầu...");
      } else if (e.code === "KeyH" && !lastChainEvaluation && !lastSingleEvaluation) {
        e.preventDefault();
        setCurrentHintTier((prev) => (prev >= 4 ? 0 : prev + 1));
      } else if (e.code === "Enter" && (lastChainEvaluation || lastSingleEvaluation)) {
        e.preventDefault();
        handleContinue();
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
    isGenerating,
    lastChainEvaluation,
    lastSingleEvaluation,
    handleStartRecord,
    handleStopRecord,
    handleContinue,
    router,
    speechRec,
  ]);

  return (
    <div className="fixed inset-0 h-screen w-screen bg-background text-foreground flex flex-col justify-between overflow-hidden z-40 select-none">
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
            <Card className="h-full rounded-3xl border border-border/80 bg-card shadow-sm flex flex-col justify-between p-5 sm:p-6 overflow-hidden">
              {/* Top Prompt Guidance */}
              <div className="space-y-2 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Mic className="size-4 text-primary" />
                    <span>Bộ Điều Khiển Thu Âm Khẩu Ngữ (Speaking Controller)</span>
                  </span>

                  {recorder.status === "recording" && (
                    <Badge className="bg-red-500 text-white font-mono text-[10px] animate-pulse">
                      ● Đang thu âm ({(recordingDurationMs / 1000).toFixed(1)}s)
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {mode === "chain_builder"
                    ? "Hãy nối liền cả 4 khối thành 1 phát ngôn hoàn chỉnh không ngập ngừng."
                    : "Hãy dùng cụm mục tiêu để phản xạ thành câu trả lời tự nhiên."}
                </p>
              </div>

              {/* Center Recording Area & Waveform */}
              <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-4 text-center">
                {recorder.status === "recording" ? (
                  <div className="w-full space-y-4 animate-in fade-in-0">
                    <Waveform active={true} variant="primary" />

                    <div className="min-h-16 p-3.5 rounded-2xl bg-muted/40 border border-border/60 max-w-md mx-auto">
                      <p className="font-mono text-sm sm:text-base font-bold text-foreground">
                        "{speechRec.fullTranscript || speechRec.transcript || "Đang lắng nghe..."}"
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold">Backspace</kbd>
                      <span>để xóa câu nói dở</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleStartRecord}
                      disabled={isGenerating || isEvaluating}
                      className="size-24 sm:size-28 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex flex-col items-center justify-center shadow-lg shadow-primary/25 btn-spring mx-auto transition-transform hover:scale-105 active:scale-95"
                    >
                      <Mic className="size-8 sm:size-10 mb-1" />
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider">
                        Bấm nói
                      </span>
                    </button>

                    <div className="text-xs text-muted-foreground">
                      <span>Nhấn phím </span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold text-foreground">
                        Space
                      </kbd>
                      <span> để kích hoạt micro rảnh tay</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Controller & Fallback Text Input */}
              <div className="pt-4 border-t border-border/40 space-y-3">
                {recorder.status === "recording" ? (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleStopRecord}
                    disabled={isEvaluating}
                    className="w-full h-12 rounded-2xl font-bold gap-2 text-sm shadow-md animate-pulse"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>AI đang phân tích độ trễ & liên kết khối...</span>
                      </>
                    ) : (
                      <>
                        <Square className="size-4 fill-white" />
                        <span>Hoàn tất & Đánh giá ngay</span>
                        <kbd className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded font-mono">
                          Space
                        </kbd>
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={fallbackTextInput}
                      onChange={(e) => setFallbackTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSubmitFallbackText();
                        }
                      }}
                      placeholder="Hoặc gõ câu bạn định nói vào đây nếu micro có sự cố..."
                      className="flex-1 h-10 px-3 rounded-xl border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={handleSubmitFallbackText}
                      disabled={!fallbackTextInput.trim() || isEvaluating}
                      className="h-10 px-4 rounded-xl text-xs font-bold shrink-0"
                    >
                      Gửi
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Studio Footer Dock: Hands-free Keybindings */}
      <footer className="h-10 border-t border-border/40 px-4 sm:px-6 flex items-center justify-between bg-card/40 backdrop-blur-xs text-[11px] text-muted-foreground font-mono shrink-0">
        <div className="flex items-center gap-4 overflow-x-auto">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Space</kbd>
            <span>Bật/Tắt Mic & Thử lại</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Backspace</kbd>
            <span>Xóa câu dở</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">H</kbd>
            <span>Đổi gợi ý T1-T4</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd>
            <span>Chuỗi tiếp theo</span>
          </span>
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
