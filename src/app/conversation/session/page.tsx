"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  CheckCircle2,
  Heart,
  Shield,
  Send,
  Sparkles,
  Users,
  Target,
  MessageSquare,
} from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { VoiceOrb, type VoiceOrbStatus } from "@/components/voice/VoiceOrb";
import { StatusBadge } from "@/components/voice/StatusBadge";
import { TurnList } from "@/components/conversation/TurnList";
import { QuickHintsDrawer, type DynamicScaffoldingHints } from "@/components/voice/QuickHintsDrawer";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { toast } from "@/lib/toast";
import type { ConversationTurn, TurnPedagogy, SessionStatus } from "@/types/conversation";
import { cn } from "@/lib/utils";

export default function ConversationSessionPage() {
  const router = useRouter();
  const { world, turns, isThinking, setThinking, addTurn, setWorld } = useConversationStore();
  const settings = useSettingsStore();
  const recorder = useAudioRecorder();
  const speech = useSpeechRecognition("en-US");
  const tts = useBrowserTTS();

  // ─── Interaction & UI State ───────────────────────────────────────────
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [worldId, setWorldId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // ─── Dynamic Hints & Timing Tracker ───────────────────────────────────
  const [dynamicHints, setDynamicHints] = useState<DynamicScaffoldingHints | null>(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [aiFinishedSpeechTime, setAiFinishedSpeechTime] = useState<number>(Date.now());
  const [speechStartMs, setSpeechStartMs] = useState<number>(0);

  // ─── Session Evaluation Stats ─────────────────────────────────────────
  const [sessionStats, setSessionStats] = useState({
    scores: [] as number[],
    latencies: [] as number[],
    errorsCount: 0,
    startTime: Date.now(),
  });

  const startTimeRef = useRef<number>(Date.now());
  const turnsEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new turns
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isThinking]);

  // Timer tick
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWorldId(localStorage.getItem("conversation_world_id"));
    }
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

  // Audio Playback
  const speak = useCallback(
    async (text: string) => {
      tts.stop();
      setSessionStatus("speaking");
      try {
        await tts.speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 0.95 });
      } catch {
        // Fallback
      } finally {
        setSessionStatus("listening");
        setAiFinishedSpeechTime(Date.now());
      }
    },
    [tts]
  );

  // ─── Initial World AI Greeting ─────────────────────────────────────────
  useEffect(() => {
    if (world && turns.length === 0 && !isThinking) {
      const initGreeting = async () => {
        setThinking(true);
        setSessionStatus("thinking");
        setIsLoadingHints(true);
        try {
          const provider =
            settings.conversation.provider === "browser"
              ? "gemini"
              : settings.conversation.provider;
          const model = settings.conversation.model;

          const res = await fetch("/api/conversation/turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              worldId,
              worldState: world,
              transcript: "(Start conversation — greet the user and set the scene)",
              recentTurns: [],
              provider,
              model,
            }),
          });
          const data = await res.json();
          if (data.response?.responseText) {
            soundEffects.playAIReady();
            const aiTurn: ConversationTurn = {
              id: `ct_ai_${Date.now()}`,
              role: "assistant",
              text: data.response.responseText,
              timestamp: new Date().toISOString(),
              provider,
              model,
            };
            addTurn(aiTurn);

            if (data.nextWorldState) {
              setWorld(data.nextWorldState);
            }
            if (data.response.hints) {
              setDynamicHints(data.response.hints);
            }
            await speak(data.response.responseText);
          }
        } catch {
          toast.error("Lỗi kết nối", "Không thể bắt đầu kịch bản.");
          setSessionStatus("listening");
        } finally {
          setThinking(false);
          setIsLoadingHints(false);
        }
      };
      initGreeting();
    }
  }, [world?.scenario?.id]);

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
    setThinking(true);

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
        setThinking(false);
        return;
      }

      // Measured latency from AI speech finish to user speech start
      const latencyMs = Math.max(200, speechStartMs - aiFinishedSpeechTime);

      // Create audio URL from recorded blob for self-voice review
      let audioBlobUrl: string | undefined = undefined;
      if (recording?.blob) {
        audioBlobUrl = URL.createObjectURL(recording.blob);
      }

      const userTurnId = `ct_user_${Date.now()}`;
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

      addTurn(userTurn);
      setTextInput("");

      const provider =
        settings.conversation.provider === "browser"
          ? "gemini"
          : settings.conversation.provider;
      const model = settings.conversation.model;

      const recentTurnsPayload = [...turns, userTurn].map((t) => ({
        role: t.role,
        text: t.text,
      }));

      const res = await fetch("/api/conversation/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worldId,
          worldState: world,
          transcript: spokenText,
          recentTurns: recentTurnsPayload,
          provider,
          model,
          durationMs: recording?.durationMs || 0,
          timeToFirstWordMs: latencyMs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Không nhận được phản hồi từ AI.");
      }

      const aiResponse = data.response;
      const aiReplyText = aiResponse?.responseText || "Could you tell me more about that?";
      const ped = aiResponse?.pedagogy;

      // Update user turn with pedagogical feedback
      userTurn.pedagogy = {
        ...userTurn.pedagogy,
        grammarIssue: ped?.grammarIssue || null,
        grammarFix: ped?.grammarFix || null,
        nativeReformulation: ped?.nativeReformulation || spokenText,
        turnScore: ped?.turnScore || 85,
        coachTipVi: ped?.coachTipVi,
      };

      // Record statistics
      setSessionStats((prev) => ({
        ...prev,
        scores: [...prev.scores, ped?.turnScore || 85],
        latencies: [...prev.latencies, latencyMs],
        errorsCount: prev.errorsCount + (ped?.grammarIssue ? 1 : 0),
      }));

      // Update world state if returned
      if (data.nextWorldState) {
        setWorld(data.nextWorldState);
      }

      // Update dynamic hints for the AI character's next question
      if (aiResponse?.hints) {
        setDynamicHints(aiResponse.hints);
      }

      // Add AI assistant turn
      soundEffects.playAIReady();
      addTurn({
        id: `ct_ai_${Date.now()}`,
        role: "assistant",
        text: aiReplyText,
        timestamp: new Date().toISOString(),
        provider,
        model,
      });

      await speak(aiReplyText);
    } catch (err: unknown) {
      toast.error("Lỗi đối thoại", err instanceof Error ? err.message : String(err));
      setSessionStatus("listening");
    } finally {
      setIsProcessing(false);
      setThinking(false);
    }
  }, [
    recorder,
    speech,
    textInput,
    speechStartMs,
    aiFinishedSpeechTime,
    addTurn,
    turns,
    settings,
    world,
    worldId,
    setWorld,
    speak,
    setThinking,
  ]);

  const handleRefreshHints = useCallback(async () => {
    if (!world) return;
    setIsLoadingHints(true);
    try {
      const lastAITurn = [...turns].reverse().find((t) => t.role === "assistant");
      const lastAIText = lastAITurn?.text || world.scenario.userGoal;

      const scenarioContext = `Roleplay Scenario: ${world.scenario.topic}. AI Role: ${world.activeCharacter.role || world.scenario.character.role}. User Role: Candidate/Partner. AI's latest statement: "${lastAIText}"`;

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
  }, [world, turns, settings]);

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
    : 85;

  const avgLatency = sessionStats.latencies.length
    ? Math.round(sessionStats.latencies.reduce((a, b) => a + b, 0) / sessionStats.latencies.length)
    : 1400;

  const durationMin = Math.max(1, Math.round(elapsedSec / 60));

  const trustPercent = world?.activeCharacter?.trust ?? 60;
  const patiencePercent = world?.activeCharacter?.patience ?? 70;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background select-none overflow-hidden">
      {/* ── TOP NAV BAR (Compact 52px) ── */}
      <header className="h-13 border-b border-border/80 bg-card/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2.5 shrink-0 z-10">
        {/* Left: Back + Title + Character info */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/conversation">
            <Button variant="ghost" size="sm" className="size-7 p-0 rounded-xl" title="Quay lại Hub">
              <ArrowLeft className="size-3.5" />
            </Button>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="size-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="size-3.5" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-tight text-foreground truncate max-w-[140px] sm:max-w-[200px]">
              {world?.scenario?.topic || "Thế Giới Nhập Vai"}
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono h-5 hidden md:inline-flex">
            {world?.scenario?.mode || "roleplay"}
          </Badge>
        </div>

        {/* Center: Turn Counter + Live Timer */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-mono h-5">
            Lượt {turns.length}
          </Badge>
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
          {/* Character & Scenario Banner Strip */}
          {world && (
            <div className="px-3 py-2 border-b border-border/60 bg-muted/20 flex flex-col gap-1.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="size-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Users className="size-3" />
                  </div>
                  <span className="font-bold text-xs text-foreground truncate">
                    {world.activeCharacter.name || world.scenario.character.role}
                  </span>
                  <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0 h-4">
                    {world.activeCharacter.mood}
                  </Badge>
                </div>

                {/* Affinity Indicators (Trust & Patience) */}
                <div className="flex items-center gap-2.5 text-[10px] font-mono shrink-0">
                  <div className="flex items-center gap-1" title="Độ hảo cảm (Trust)">
                    <Heart className="size-2.5 text-rose-500 fill-current" />
                    <span>{trustPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1" title="Độ kiên nhẫn (Patience)">
                    <Shield className="size-2.5 text-blue-500 fill-current" />
                    <span>{patiencePercent}%</span>
                  </div>
                </div>
              </div>

              {/* Goal Objective Strip */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                <Target className="size-2.5 text-amber-500 shrink-0" />
                <span className="font-semibold text-foreground shrink-0">Mục tiêu:</span>
                <span className="truncate">{world.scenario.userGoal}</span>
              </div>
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
              scenarioGoal={world?.scenario?.userGoal}
              hints={dynamicHints}
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

      {/* ── SESSION COMPLETED MODAL ── */}
      <SessionCompletedModal
        open={showCompletedModal}
        onOpenChange={setShowCompletedModal}
        sessionTitle={world?.scenario?.topic || "Thế Giới Nhập Vai"}
        durationMinutes={durationMin}
        turnsCount={turns.length}
        avgTtfwMs={avgLatency}
        overallScore={avgScore}
        errorsDetected={sessionStats.errorsCount}
        onRestart={() => router.push("/conversation")}
      />
    </div>
  );
}
