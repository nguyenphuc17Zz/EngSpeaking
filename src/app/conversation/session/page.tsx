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
  Radio,
  LifeBuoy,
  Zap,
  Flame,
  Trophy,
} from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { transcribeViaServer } from "@/lib/stt/service";
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
import type { PragmaticSpeechAct, SpeakingObjective } from "@/types/conversation-world";
import {
  calculateSpeechRateWpm,
  calculateTypeTokenRatio,
  SmartVadStateController,
} from "@/lib/audio/smart-vad.engine";
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

  // ─── Affective & Pragmatic Live State ──────────────────────────────────
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [activePragmaticAct, setActivePragmaticAct] = useState<PragmaticSpeechAct | null>(null);
  const [activePragmaticFeedback, setActivePragmaticFeedback] = useState<string | null>(null);
  const [unlockedObjectiveAlert, setUnlockedObjectiveAlert] = useState<SpeakingObjective | null>(null);
  const [isLifelineVisible, setIsLifelineVisible] = useState(false);
  const [lifelineElapsedMs, setLifelineElapsedMs] = useState(0);
  const isAiSpeakingRef = useRef(false);
  const smartVadRef = useRef<SmartVadStateController | null>(null);

  // ─── Session Evaluation Stats ─────────────────────────────────────────
  const [sessionStats, setSessionStats] = useState({
    scores: [] as number[],
    latencies: [] as number[],
    wpms: [] as number[],
    ttrs: [] as number[],
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



  // ─── Speaking Controls ────────────────────────────────────────────────
  const handleStartSpeaking = useCallback(async () => {
    soundEffects.playMicStart();
    speech.resetTranscript();
    setSpeechStartMs(Date.now());
    setSessionStatus("recording");
    setIsLifelineVisible(false);

    const sttProvider = settings.stt?.provider || "browser";

    try {
      await recorder.start();
      if (sttProvider === "browser") {
        speech.startListening();
      }
    } catch {
      toast.error("Lỗi Microphone", "Vui lòng cho phép truy cập micro.");
      setSessionStatus("listening");
    }
  }, [recorder, speech, settings.stt?.provider]);

  // ─── Barge-in Interruption Handler (<50ms audio mute) ────────────────
  const handleBargeIn = useCallback(() => {
    tts.stop();
    isAiSpeakingRef.current = false;
    soundEffects.playMicStart();
    toast.info("⚡ Đã ngắt lời AI (Barge-in)", "AI đã nhường quyền nói cho bạn.");
    handleStartSpeaking();
  }, [tts, handleStartSpeaking]);

  // ─── Audio Synthesis Playback with Hands-Free Auto-Mic ────────────────
  const speak = useCallback(
    async (text: string) => {
      tts.stop();
      setSessionStatus("speaking");
      isAiSpeakingRef.current = true;
      try {
        await tts.speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 0.95 });
      } catch {
        // Fallback
      } finally {
        isAiSpeakingRef.current = false;
        setSessionStatus("listening");
        setAiFinishedSpeechTime(Date.now());

        if (handsFreeMode) {
          setTimeout(() => {
            if (!isProcessing) {
              handleStartSpeaking();
            }
          }, 400);
        }
      }
    },
    [tts, handsFreeMode, isProcessing, handleStartSpeaking]
  );

  const handleStopAndProcess = useCallback(async () => {
    soundEffects.playMicStop();
    // 1. ALWAYS unconditionally stop Web Speech API first
    speech.stopListening();

    const sttProvider = settings.stt?.provider || "browser";
    setSessionStatus("thinking");
    setIsProcessing(true);
    setThinking(true);
    setIsLifelineVisible(false);

    try {
      const recording = await recorder.stop();
      let spokenText = "";

      if (sttProvider !== "browser" && recording?.blob) {
        try {
          const res = await transcribeViaServer(recording.blob, {
            provider: sttProvider === "auto" ? "whisper-local" : sttProvider,
            model: settings.stt?.model || "auto",
            language: "en-US",
          });
          spokenText = res.text.trim();
        } catch {
          spokenText = speech.fullTranscript.trim() || speech.transcript.trim();
        }
      } else {
        await new Promise((r) => setTimeout(r, 250));
        spokenText =
          speech.fullTranscript.trim() ||
          speech.transcript.trim() ||
          textInput.trim();
      }

      if (!spokenText) {
        toast.info("Chưa nghe rõ", "Vui lòng nói lại hoặc gõ văn bản.");
        setSessionStatus("listening");
        setIsProcessing(false);
        setThinking(false);
        return;
      }

      // Measured latency & speech metrics
      const durationMs = recording?.durationMs || 3500;
      const latencyMs = Math.max(200, speechStartMs - aiFinishedSpeechTime);
      const turnWpm = calculateSpeechRateWpm(spokenText, durationMs);
      const turnTtr = calculateTypeTokenRatio(spokenText);

      // Create audio URL from recorded blob for self-voice review
      let audioBlobUrl: string | undefined = undefined;
      if (recording?.blob) {
        audioBlobUrl = URL.createObjectURL(recording.blob);
      }

      const userTurnId = `ct_user_${Date.now()}`;
      const userTurnPedagogy: TurnPedagogy = {
        latencyMs,
        audioBlobUrl,
        speechRateWpm: turnWpm,
        lexicalDiversityTtr: turnTtr,
      };
      const userTurn: ConversationTurn = {
        id: userTurnId,
        role: "user",
        text: spokenText,
        timestamp: new Date().toISOString(),
        durationMs,
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
          durationMs,
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

      // Update pragmatic act & feedback
      if (aiResponse?.pragmaticAct) {
        setActivePragmaticAct(aiResponse.pragmaticAct);
        setActivePragmaticFeedback(aiResponse.pragmaticFeedbackVi || null);
      }

      // Check if a hidden objective was unlocked
      if (aiResponse?.unlockedObjective) {
        setUnlockedObjectiveAlert(aiResponse.unlockedObjective);
        soundEffects.playSuccessFanfare();
        toast.success("🎉 MỤC TIÊU ẨN ĐÃ MỞ KHÓA!", aiResponse.unlockedObjective.description);
      }

      // Update user turn with pedagogical feedback
      userTurn.pedagogy = {
        ...userTurn.pedagogy,
        grammarIssue: ped?.grammarIssue || null,
        grammarFix: ped?.grammarFix || null,
        nativeReformulation: ped?.nativeReformulation || spokenText,
        turnScore: ped?.turnScore || 85,
        coachTipVi: ped?.coachTipVi,
        speechRateWpm: turnWpm,
        lexicalDiversityTtr: turnTtr,
      };

      // Record statistics
      setSessionStats((prev) => ({
        ...prev,
        scores: [...prev.scores, ped?.turnScore || 85],
        latencies: [...prev.latencies, latencyMs],
        wpms: [...prev.wpms, turnWpm],
        ttrs: [...prev.ttrs, turnTtr],
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

  // Keyboard Hotkeys (Space to toggle speaking / Barge-in)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (sessionStatus === "speaking" || isAiSpeakingRef.current) {
          handleBargeIn();
        } else if (sessionStatus === "recording") {
          handleStopAndProcess();
        } else if (["idle", "ready", "listening"].includes(sessionStatus)) {
          handleStartSpeaking();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sessionStatus, handleBargeIn, handleStopAndProcess, handleStartSpeaking]);

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
  }, [world?.scenario?.id, addTurn, setThinking, setWorld, speak, settings, world, worldId, turns.length, isThinking]);

  // ─── Smart VAD Controller Setup ───────────────────────────────────────
  useEffect(() => {
    if (!handsFreeMode) {
      smartVadRef.current?.destroy();
      smartVadRef.current = null;
      return;
    }

    smartVadRef.current = new SmartVadStateController({
      silenceThresholdMs: 1200,
      onSilenceEndpoint: () => {
        if (sessionStatus === "recording" && !isProcessing) {
          handleStopAndProcess();
        }
      },
      onBargeIn: () => {
        if (isAiSpeakingRef.current || sessionStatus === "speaking") {
          handleBargeIn();
        }
      },
    });

    return () => {
      smartVadRef.current?.destroy();
      smartVadRef.current = null;
    };
  }, [handsFreeMode, sessionStatus, isProcessing, handleStopAndProcess, handleBargeIn]);

  // ─── Interim Transcript Stream to Smart VAD ───────────────────────────
  useEffect(() => {
    const liveText = speech.fullTranscript || speech.transcript || speech.interimTranscript;
    if (liveText) {
      setIsLifelineVisible(false);
      if (handsFreeMode && sessionStatus === "recording") {
        smartVadRef.current?.notifyInterimTranscript(liveText, isAiSpeakingRef.current);
      }
    }
  }, [speech.transcript, speech.interimTranscript, speech.fullTranscript, handsFreeMode, sessionStatus]);

  // ─── Silence Hesitation Lifeline Tracker (>3.5s) ───────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sessionStatus === "listening" || (sessionStatus === "recording" && !speech.transcript)) {
      interval = setInterval(() => {
        const elapsed = Date.now() - aiFinishedSpeechTime;
        setLifelineElapsedMs(elapsed);
        if (elapsed >= 3500 && !isLifelineVisible) {
          setIsLifelineVisible(true);
        }
      }, 250);
    } else {
      setIsLifelineVisible(false);
      setLifelineElapsedMs(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStatus, aiFinishedSpeechTime, speech.transcript, isLifelineVisible]);

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

  // ─── Computed Statistics for Modal & Radar ───────────────────────────
  const avgScore = sessionStats.scores.length
    ? Math.round(sessionStats.scores.reduce((a, b) => a + b, 0) / sessionStats.scores.length)
    : 85;

  const avgLatency = sessionStats.latencies.length
    ? Math.round(sessionStats.latencies.reduce((a, b) => a + b, 0) / sessionStats.latencies.length)
    : 1400;

  const avgWpm = sessionStats.wpms.length
    ? Math.round(sessionStats.wpms.reduce((a, b) => a + b, 0) / sessionStats.wpms.length)
    : 120;

  const avgTtr = sessionStats.ttrs.length
    ? Math.round((sessionStats.ttrs.reduce((a, b) => a + b, 0) / sessionStats.ttrs.length) * 10) / 10
    : 68.5;

  const durationMin = Math.max(1, Math.round(elapsedSec / 60));

  const cefrEstimate =
    avgScore >= 90 && avgWpm >= 130
      ? "C1"
      : avgScore >= 78 && avgWpm >= 105
      ? "B2"
      : avgScore >= 65
      ? "B1"
      : "A2";

  const trustPercent = world?.activeCharacter?.trust ?? 60;
  const patiencePercent = world?.activeCharacter?.patience ?? 70;
  const defensivenessPercent = world?.activeCharacter?.defensiveness ?? 40;

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

        {/* Right: Hands-Free Toggle + AI Selector + End Session */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant={handsFreeMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const nextMode = !handsFreeMode;
              setHandsFreeMode(nextMode);
              toast.info(
                nextMode ? "Đã bật Hands-Free Live" : "Đã tắt Hands-Free",
                nextMode
                  ? "AI sẽ tự động nhận diện dừng tiếng và tự bật lại mic."
                  : "Chuyển sang chế độ bấm thủ công để nói."
              );
            }}
            className={`h-7 px-2 rounded-xl text-xs font-bold gap-1 transition-all ${
              handsFreeMode
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                : "border-border/80 text-muted-foreground hover:text-foreground"
            }`}
            title="Chế độ rảnh tay thông minh (Smart VAD + Auto-mic)"
          >
            <Radio className={`size-3 ${handsFreeMode ? "animate-pulse text-white" : ""}`} />
            <span className="hidden sm:inline">Hands-Free</span>
          </Button>

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
                  <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0 h-4 bg-muted/80">
                    {world.activeCharacter.mood}
                  </Badge>
                </div>

                {/* Affective Radar Indicators (Trust, Patience, Defensiveness) */}
                <div className="flex items-center gap-2.5 text-[10px] font-mono shrink-0">
                  <div className="flex items-center gap-1" title="Độ tin cậy (Trust): Mức độ đối phương tin tưởng bạn">
                    <Heart className="size-2.5 text-rose-500 fill-current" />
                    <span className="font-bold text-rose-600 dark:text-rose-400">{trustPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1" title="Độ kiên nhẫn (Patience): Tránh trả lời vòng vo hoặc im lặng lâu">
                    <Shield className="size-2.5 text-blue-500 fill-current" />
                    <span className="font-bold text-blue-600 dark:text-blue-400">{patiencePercent}%</span>
                  </div>
                  <div className="flex items-center gap-1" title="Rào cản đàm phán (Defensiveness): Càng thấp càng dễ đạt thỏa thuận">
                    <Flame className="size-2.5 text-amber-500 fill-current" />
                    <span className="font-bold text-amber-600 dark:text-amber-400">{defensivenessPercent}%</span>
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

          {/* Pragmatic Speech Act Feedback Banner */}
          {activePragmaticAct && (
            <div className="px-3 py-1.5 bg-primary/5 border-b border-primary/20 flex items-center justify-between gap-2 shrink-0 text-[11px] animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-primary shrink-0">Phản xạ vừa qua:</span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4.5 gap-1 shrink-0 bg-background">
                  <span>
                    {activePragmaticAct === "empathy_rapport" && "🤝 Đồng Cảm & Gắn Kết"}
                    {activePragmaticAct === "concession_compromise" && "⚖️ Thỏa Hiệp (Win-Win)"}
                    {activePragmaticAct === "assertive_evidence" && "📊 Dẫn Chứng Sắc Bén"}
                    {activePragmaticAct === "clarification_inquiry" && "🔍 Thăm Dò Khéo Léo"}
                    {activePragmaticAct === "counter_challenge" && "⚡ Phản Biện Quyết Liệt"}
                    {activePragmaticAct === "hedging_hesitant" && "⏳ Rụt Rè / Do Dự"}
                  </span>
                </Badge>
                {activePragmaticFeedback && (
                  <span className="text-muted-foreground text-[10px] truncate hidden sm:inline">
                    — {activePragmaticFeedback}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Hidden Objective Unlocked Banner */}
          {unlockedObjectiveAlert && (
            <div className="mx-3 my-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-center gap-2 shrink-0 animate-in fade-in duration-300">
              <Trophy className="size-4 text-emerald-500 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Mục tiêu ẩn đã mở khóa:</span>{" "}
                <span className="text-muted-foreground text-[11px]">{unlockedObjectiveAlert.description}</span>
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

            {/* Hesitation Lifeline Prompt Strip */}
            {isLifelineVisible && (
              <div className="w-full mb-2.5 p-2 rounded-xl bg-primary/10 border border-primary/25 text-left space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                  <span className="flex items-center gap-1">
                    <LifeBuoy className="size-3 animate-spin" />
                    Phao cứu sinh ngập ngừng:
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {Math.round(lifelineElapsedMs / 1000)}s
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(dynamicHints?.tier2Starters?.length
                    ? dynamicHints.tier2Starters.slice(0, 3).map((s) => s.starter)
                    : [
                        "To be completely honest...",
                        "From my perspective...",
                        "Well, the way I see it is...",
                      ]
                  ).map((starter, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTextInput(starter);
                        toast.info("Đã chọn câu mở đầu", starter);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-background hover:bg-primary/20 text-foreground border border-border/80 transition-colors font-medium text-left"
                    >
                      &ldquo;{starter}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

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
        wpm={avgWpm}
        ttrRatio={avgTtr}
        twistResolved={!!unlockedObjectiveAlert}
        cefrEstimate={cefrEstimate}
        onRestart={() => router.push("/conversation")}
      />
    </div>
  );
}
