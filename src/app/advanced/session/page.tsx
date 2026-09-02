"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  Square,
  Play,
  Volume2,
  Keyboard,
  ArrowLeft,
  ArrowRight,
  Flame,
  Zap,
  CheckCircle2,
  Sparkles,
  Send,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Wand2,
  Shuffle,
  X,
  Loader2,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { StatusBadge } from "@/components/voice/StatusBadge";
import { TurnList } from "@/components/conversation/TurnList";
import { QuickHintsDrawer, type DynamicScaffoldingHints, type TacticalGuide } from "@/components/voice/QuickHintsDrawer";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { toast } from "@/lib/toast";
import type { AdvancedTrainingSession } from "@/types/advanced";
import type { ConversationTurn, TurnPedagogy, SessionStatus } from "@/types/conversation";
import { cn } from "@/lib/utils";

export default function AdvancedSessionPage() {
  const router = useRouter();
  const settings = useSettingsStore();
  const recorder = useAudioRecorder();
  const speech = useSpeechRecognition("en-US");
  const tts = useBrowserTTS();

  // ─── Session State ───────────────────────────────────────────────────
  const [session, setSession] = useState<AdvancedTrainingSession | null>(null);
  const [currentBlockIdx, setCurrentBlockIdx] = useState(0);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // ─── Dynamic Hints & Timing Tracker ───────────────────────────────────
  const [dynamicHints, setDynamicHints] = useState<DynamicScaffoldingHints | null>(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [aiFinishedSpeechTime, setAiFinishedSpeechTime] = useState<number>(Date.now());
  const [speechStartMs, setSpeechStartMs] = useState<number>(0);

  // ─── Evaluation Statistics ───────────────────────────────────────────
  const [sessionStats, setSessionStats] = useState({
    scores: [] as number[],
    latencies: [] as number[],
    errorsCount: 0,
    startTime: Date.now(),
  });

  const startTimeRef = useRef<number>(Date.now());
  const turnsEndRef = useRef<HTMLDivElement | null>(null);

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);

  // Load session from storage or auto-initialize
  useEffect(() => {
    const raw = localStorage.getItem("advanced_session");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setSession(parsed);
      } catch {}
    } else {
      fetch("/api/advanced/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            targetSkills: ["rapidResponse"],
            durationMinutes: 10,
            pressureLevel: "challenging",
            topic: "auto",
            goal: "rapidResponse",
          },
          provider: settings.conversation.provider === "browser" ? "gemini" : settings.conversation.provider,
          model: settings.conversation.model,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.session) {
            setSession(d.session);
            localStorage.setItem("advanced_session", JSON.stringify(d.session));
          }
        })
        .catch(() => {});
    }
  }, [settings.conversation.provider, settings.conversation.model]);

  const currentBlock = session?.blocks[currentBlockIdx];

  // Auto-scroll on new turns
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // Live Timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard Hotkeys (Space to toggle speaking)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (sessionStatus === "recording") {
          handleStopAndProcess();
        } else if (["idle", "ready", "listening"].includes(sessionStatus)) {
          handleStartSpeaking();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessionStatus]);

  // Audio Speech Playback
  const speak = useCallback(
    async (text: string) => {
      tts.stop();
      setSessionStatus("speaking");
      try {
        await tts.speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 1 });
      } catch {
        // Fallback
      } finally {
        setSessionStatus("listening");
        setAiFinishedSpeechTime(Date.now());
      }
    },
    [tts]
  );

  // ─── Block Initialization & AI Opening Instruction ────────────────────
  useEffect(() => {
    if (currentBlock?.instructions) {
      const openingTurn: ConversationTurn = {
        id: `adv_ai_block_${currentBlockIdx}`,
        role: "assistant",
        text: currentBlock.instructions,
        timestamp: new Date().toISOString(),
        provider: settings.conversation.provider,
        model: settings.conversation.model,
      };

      setTurns((prev) => {
        if (prev.some((t) => t.id === openingTurn.id)) return prev;
        return [...prev, openingTurn];
      });

      // Load initial hints for current block
      loadBlockHints(currentBlock.instructions, currentBlock.objective);
      speak(currentBlock.instructions);
    }
  }, [currentBlockIdx, currentBlock?.id]);

  const loadBlockHints = async (instruction: string, objective: string) => {
    setIsLoadingHints(true);
    try {
      const scenarioContext = `Advanced Speaking Challenge: ${session?.modules[0] || "Advanced"}. Objective: ${objective}. Question/Instruction: "${instruction}"`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.conversation.provider,
          model: settings.conversation.model,
          mode: "opening_pedagogical",
          scenarioContext,
        }),
      });
      const data = await res.json();
      if (data.result?.hints) {
        setDynamicHints(data.result.hints);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingHints(false);
    }
  };

  // ─── Speaking Controls ────────────────────────────────────────────────
  const handleStartSpeaking = useCallback(async () => {
    soundEffects.playMicStart();
    speech.resetTranscript();
    setSpeechStartMs(Date.now());
    setSessionStatus("recording");

    try {
      await recorder.start();
      speech.startListening();
    } catch {
      toast.error("Lỗi Microphone", "Vui lòng cho phép truy cập micro.");
      setSessionStatus("listening");
    }
  }, [recorder, speech]);

  const handleStopAndProcess = useCallback(async () => {
    soundEffects.playMicStop();
    speech.stopListening();
    setSessionStatus("thinking");
    setIsProcessing(true);

    try {
      const recording = await recorder.stop();
      await new Promise((r) => setTimeout(r, 250));

      const spokenText =
        speech.fullTranscript.trim() ||
        speech.transcript.trim() ||
        textInput.trim();

      if (!spokenText) {
        toast.info("Chưa nghe rõ", "Vui lòng nói lại hoặc gõ văn bản.");
        setSessionStatus("listening");
        setIsProcessing(false);
        return;
      }

      // Measured latency from AI finish to speech start
      const latencyMs = Math.max(200, speechStartMs - aiFinishedSpeechTime);

      // Create audio URL from recorded blob for self-voice review
      let audioBlobUrl: string | undefined = undefined;
      if (recording?.blob) {
        audioBlobUrl = URL.createObjectURL(recording.blob);
      }

      const userTurnId = `adv_user_${Date.now()}`;
      const userTurnPedagogy: TurnPedagogy = {
        latencyMs,
        audioBlobUrl,
      };
      const userTurn: ConversationTurn = {
        id: userTurnId,
        role: "user",
        text: spokenText,
        timestamp: new Date().toISOString(),
        durationMs: recording?.durationMs || 0,
        pedagogy: userTurnPedagogy,
      };

      setTurns((prev) => [...prev, userTurn]);
      setTextInput("");

      // Pedagogical Evaluation Call
      const turnsPayload = turns.map((t) => ({
        role: t.role as "user" | "assistant" | "system",
        content: t.text,
      }));

      const scenarioContext = `Advanced Drill: ${session?.modules[0] || "Advanced"}. Pressure: ${session?.context?.pressureLevel || "challenging"}. Current objective: ${currentBlock?.objective || "Phản biện và lập luận sắc sảo"}`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.conversation.provider,
          model: settings.conversation.model,
          mode: "pedagogical_reply",
          turns: turnsPayload,
          currentUserText: spokenText,
          scenarioContext,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Không nhận được phản hồi từ AI.");
      }

      const result = data.result;
      const aiReplyText = result.replyText || "Excellent point. How would you counter the opposing argument?";
      const ped = result.pedagogy;

      // Update user turn with pedagogical feedback
      userTurn.pedagogy = {
        ...userTurn.pedagogy,
        grammarIssue: ped?.grammarIssue || null,
        grammarFix: ped?.grammarFix || null,
        nativeReformulation: ped?.nativeReformulation || spokenText,
        turnScore: ped?.turnScore || 85,
        coachTipVi: ped?.coachTipVi || "Tiếp tục đẩy mạnh lập luận!",
      };

      // Record statistics
      setSessionStats((prev) => ({
        ...prev,
        scores: [...prev.scores, ped?.turnScore || 85],
        latencies: [...prev.latencies, latencyMs],
        errorsCount: prev.errorsCount + (ped?.grammarIssue ? 1 : 0),
      }));

      // Update dynamic hints for the next question
      if (result.hints) {
        setDynamicHints(result.hints);
      }

      // Add AI Response Turn
      soundEffects.playAIReady();
      const aiTurn: ConversationTurn = {
        id: `adv_ai_${Date.now()}`,
        role: "assistant",
        text: aiReplyText,
        timestamp: new Date().toISOString(),
        provider: settings.conversation.provider,
        model: settings.conversation.model,
      };

      setTurns((prev) => [...prev, aiTurn]);
      await speak(aiReplyText);
    } catch (err: unknown) {
      toast.error("Lỗi đối thoại", err instanceof Error ? err.message : String(err));
      setSessionStatus("listening");
    } finally {
      setIsProcessing(false);
    }
  }, [
    recorder,
    speech,
    textInput,
    speechStartMs,
    aiFinishedSpeechTime,
    turns,
    settings,
    session,
    currentBlock,
    speak,
  ]);

  const handleRefreshHints = useCallback(async () => {
    if (!currentBlock) return;
    setIsLoadingHints(true);
    try {
      const lastAITurn = [...turns].reverse().find((t) => t.role === "assistant");
      const lastAIText = lastAITurn?.text || currentBlock.instructions;

      const scenarioContext = `Advanced Drill: ${session?.modules[0] || "Advanced"}. Current question/prompt: "${lastAIText}"`;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.conversation.provider,
          model: settings.conversation.model,
          mode: "opening_pedagogical",
          scenarioContext,
        }),
      });
      const data = await res.json();
      if (data.result?.hints) {
        setDynamicHints(data.result.hints);
        toast.success("Đã làm mới gợi ý AI!");
      }
    } catch {
      toast.error("Không thể làm mới gợi ý lúc này");
    } finally {
      setIsLoadingHints(false);
    }
  }, [currentBlock, turns, session, settings]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    handleStopAndProcess();
  };

  const handleReplayLastAI = () => {
    const lastAITurn = [...turns].reverse().find((t) => t.role === "assistant");
    if (lastAITurn) {
      speak(lastAITurn.text);
    }
  };

  const handleNextBlock = () => {
    if (session && currentBlockIdx < session.blocks.length - 1) {
      setCurrentBlockIdx((i) => i + 1);
      toast.info(`Chuyển sang Thử thách ${currentBlockIdx + 2}/${session.blocks.length}`);
    } else {
      setShowCompletedModal(true);
    }
  };

  const handlePrevBlock = () => {
    if (currentBlockIdx > 0) {
      setCurrentBlockIdx((i) => i - 1);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ─── Computed Statistics for Modal ────────────────────────────────────
  const avgScore = sessionStats.scores.length
    ? Math.round(sessionStats.scores.reduce((a, b) => a + b, 0) / sessionStats.scores.length)
    : 88;

  const avgLatency = sessionStats.latencies.length
    ? Math.round(sessionStats.latencies.reduce((a, b) => a + b, 0) / sessionStats.latencies.length)
    : 1100;

  const durationMin = Math.max(1, Math.round(elapsedSec / 60));

  const currentTacticalGuide: TacticalGuide = {
    recommendedTone: "Sắc sảo, mạch lạc và quyết đoán chuẩn C1.",
    strategyTip: currentBlock?.objective || "Tập trung giải quyết phản biện trước, sau đó đưa ra kết luận thuyết phục.",
    pitfallsToAvoid: "Tránh ngập ngừng quá 3 giây và không dùng các từ đệm vô nghĩa (um, uh).",
  };

  const handleSwitchChallenge = async (customPrompt?: string) => {
    setIsSwitching(true);
    toast.info("Đang tạo thử thách mới...", "Khởi tạo ngữ cảnh và các block luyện tập.");
    try {
      const res = await fetch("/api/advanced/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            targetSkills: [session?.modules[0] || "rapidResponse"],
            durationMinutes: 10,
            pressureLevel: session?.context?.pressureLevel || "challenging",
            topic: customPrompt || "auto",
            scenario: customPrompt || undefined,
            goal: session?.modules[0] || "rapidResponse",
          },
          provider: settings.conversation.provider === "browser" ? "gemini" : settings.conversation.provider,
          model: settings.conversation.model,
        }),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        localStorage.setItem("advanced_session", JSON.stringify(data.session));
        setCurrentBlockIdx(0);
        setTurns([]);
        setShowSwitchModal(false);
        setNewTopicInput("");
        toast.success("Đã nạp thử thách mới!");
      }
    } catch {
      toast.error("Không thể tạo thử thách lúc này");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background select-none overflow-hidden">
      {/* ── TOP NAV BAR (Compact 52px) ── */}
      <header className="h-13 border-b border-border/80 bg-card/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2.5 shrink-0 z-10">
        {/* Left: Back + Title + Module info */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/advanced">
            <Button variant="ghost" size="sm" className="size-7 p-0 rounded-xl" title="Quay lại Hub">
              <ArrowLeft className="size-3.5" />
            </Button>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="size-6 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Flame className="size-3.5" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-tight text-foreground truncate max-w-[130px] sm:max-w-[180px]">
              {session?.modules[0] || "Thử Thách Nâng Cao"}
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono h-5 hidden md:inline-flex">
            {session?.context?.pressureLevel || "challenging"}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSwitchModal(true)}
            className="h-6 px-1.5 rounded-lg text-[10px] font-bold gap-1 text-primary border-primary/40 hover:bg-primary/10"
            title="Đổi hoặc sinh thử thách mới bằng AI"
          >
            <Sparkles className="size-2.5" />
            <span className="hidden sm:inline">AI Đổi Thử Thách</span>
          </Button>
        </div>

        {/* Center: Block Navigation + Live Timer */}
        <div className="flex items-center gap-2">
          {session?.blocks && (
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
              <button
                onClick={handlePrevBlock}
                disabled={currentBlockIdx === 0}
                className="size-5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="size-3" />
              </button>
              <span className="text-[10px] font-mono font-bold px-1 text-foreground">
                Block {currentBlockIdx + 1}/{session.blocks.length}
              </span>
              <button
                onClick={handleNextBlock}
                className="size-5 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="size-3" />
              </button>
            </div>
          )}

          <Badge variant="outline" className="text-[10px] font-mono h-5 text-muted-foreground">
            ⏱ {formatTimer(elapsedSec)}
          </Badge>
        </div>

        {/* Right: AI Selector + End Session */}
        <div className="flex items-center gap-1.5 shrink-0">
          <GlobalAiSelector />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCompletedModal(true)}
            className="h-7 px-2.5 rounded-xl text-xs font-bold gap-1 border-border/80"
          >
            <CheckCircle2 className="size-3 text-emerald-500" />
            <span>Kết thúc</span>
          </Button>
        </div>
      </header>

      {/* ── MAIN CONTENT (7:5 Ratio, Zero Body Scroll) ── */}
      <main className="flex-1 p-2.5 sm:p-3 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 min-h-0">
        {/* LEFT (7 cols): Dialogue Canvas */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
          {/* Active Block Objective Strip */}
          {currentBlock && (
            <div className="px-3 py-2 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-foreground truncate">
                    Mục tiêu: {currentBlock.objective}
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
                    {currentBlock.type}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {currentBlock.skillTargets.join(", ")}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextBlock}
                className="h-6 px-2 rounded-lg text-[10px] font-bold gap-1 shrink-0 border-border/80"
              >
                <span>Tiếp</span>
                <ChevronRight className="size-3" />
              </Button>
            </div>
          )}

          {/* Transcript Message Scroll Area strictly inside */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3">
            <TurnList turns={turns} />
            <div ref={turnsEndRef} />
          </div>

          {/* Bottom Live STT Banner */}
          {sessionStatus === "recording" && (
            <div className="px-3.5 py-1.5 bg-primary/10 border-t border-primary/25 shrink-0 flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <p className="text-xs font-mono text-primary truncate">
                {speech.fullTranscript || speech.transcript || "Đang lắng nghe bạn nói..."}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT (5 cols): Voice Hub + Embedded Scaffolding */}
        <div className="lg:col-span-5 h-full flex flex-col gap-2.5 sm:gap-3 min-h-0 overflow-hidden">
          {/* Voice Hub (Upper Section) */}
          <div className="shrink-0 p-3.5 rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-primary/5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xs">
            <VoiceOrb status={sessionStatus} size="sm" className="my-1" />
            <div className="mb-2">
              <StatusBadge status={sessionStatus} />
            </div>

            {/* Speaking Controller Buttons */}
            <div className="w-full flex items-center justify-center gap-1.5">
              <Button
                variant={sessionStatus === "recording" ? "destructive" : "default"}
                size="lg"
                onClick={sessionStatus === "recording" ? handleStopAndProcess : handleStartSpeaking}
                disabled={isProcessing}
                className="flex-1 h-10 rounded-xl font-bold text-xs gap-1.5 shadow-xs transition-all"
              >
                {sessionStatus === "recording" ? (
                  <>
                    <Square className="size-3.5" />
                    <span>Dừng & Chấm Điểm</span>
                    <kbd className="text-[9px] font-mono px-1 py-0.5 bg-white/20 rounded">Space</kbd>
                  </>
                ) : (
                  <>
                    <Mic className="size-3.5" />
                    <span>{sessionStatus === "speaking" ? "Ngắt lời AI" : "Bắt Đầu Nói"}</span>
                    <kbd className="text-[9px] font-mono px-1 py-0.5 bg-primary-foreground/20 rounded">Space</kbd>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReplayLastAI}
                className="h-10 px-2.5 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
                title="Nghe lại câu cuối của AI"
              >
                <Volume2 className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyboardInput(!showKeyboardInput)}
                className={`h-10 px-2.5 rounded-xl border-border/80 ${
                  showKeyboardInput ? "bg-primary/10 text-primary border-primary/40" : ""
                }`}
                title="Gõ phím thay thế"
              >
                <Keyboard className="size-4" />
              </Button>
            </div>

            {/* Fallback Keyboard Input Form */}
            {showKeyboardInput && (
              <form onSubmit={handleTextSubmit} className="w-full mt-2 flex gap-1.5">
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Gõ câu trả lời tiếng Anh..."
                  rows={2}
                  className="text-xs bg-background rounded-xl resize-none p-2"
                />
                <Button type="submit" size="sm" className="h-full rounded-xl px-2.5 font-bold" disabled={isProcessing}>
                  <Send className="size-3.5" />
                </Button>
              </form>
            )}
          </div>

          {/* Quick Hints 3-Tier Scaffolding Embedded Panel (Lower Section) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <QuickHintsDrawer
              scenarioGoal={currentBlock?.objective}
              hints={dynamicHints}
              tacticalGuide={currentTacticalGuide}
              isLoadingHints={isLoadingHints}
              onRefreshHints={handleRefreshHints}
              onSelectHint={(text) => {
                setTextInput(text);
                toast.success("Đã nạp mẫu câu!", text);
              }}
            />
          </div>
        </div>
      </main>

      {/* ── SWITCH / GENERATE NEW CHALLENGE MODAL ── */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">AI Đổi Thử Thách Mới</h3>
                  <p className="text-[11px] text-muted-foreground">Tạo bối cảnh nói nâng cao theo chủ đề tự chọn</p>
                </div>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="size-7 rounded-xl hover:bg-muted/50 flex items-center justify-center text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                Nhập chủ đề thử thách mới:
              </label>
              <Textarea
                value={newTopicInput}
                onChange={(e) => setNewTopicInput(e.target.value)}
                placeholder="Ví dụ: Phản biện luận điểm tự động hóa; Đàm phán sáp nhập doanh nghiệp..."
                rows={3}
                className="text-xs bg-background rounded-xl resize-none p-2.5"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSwitchChallenge()}
                disabled={isSwitching}
                className="flex-1 h-10 rounded-xl font-bold text-xs gap-1.5"
              >
                <Shuffle className="size-3.5 text-amber-500" />
                <span>Ngẫu nhiên</span>
              </Button>

              <Button
                size="sm"
                onClick={() => handleSwitchChallenge(newTopicInput)}
                disabled={isSwitching || !newTopicInput.trim()}
                className="flex-1 h-10 rounded-xl font-bold text-xs gap-1.5"
              >
                {isSwitching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Wand2 className="size-3.5" />
                )}
                <span>Tạo thử thách</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SESSION COMPLETED MODAL ── */}
      <SessionCompletedModal
        open={showCompletedModal}
        onOpenChange={setShowCompletedModal}
        sessionTitle={session?.modules[0] || "Thử Thách Nâng Cao"}
        durationMinutes={durationMin}
        turnsCount={turns.length}
        avgTtfwMs={avgLatency}
        overallScore={avgScore}
        errorsDetected={sessionStats.errorsCount}
        onRestart={() => router.push("/advanced")}
      />
    </div>
  );
}
