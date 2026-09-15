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
  Volume2,
  Keyboard,
  ArrowLeft,
  Flame,
  Zap,
  CheckCircle2,
  Sparkles,
  Send,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Wand2,
  Shuffle,
  X,
  Loader2,
  ShieldAlert,
  Gauge,
  Radio,
  HelpCircle,
  Activity,
  LifeBuoy,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { transcribeViaServer } from "@/lib/stt/service";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { StatusBadge } from "@/components/voice/StatusBadge";
import { TurnList } from "@/components/conversation/TurnList";
import { QuickHintsDrawer, type DynamicScaffoldingHints, type TacticalGuide } from "@/components/voice/QuickHintsDrawer";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { toast } from "@/lib/toast";
import type {
  AdvancedTrainingSession,
  ToulminAnalysis,
  FallacyDetected,
  ComposureMetrics,
  TransitionalBridgeDetected,
} from "@/types/advanced";
import type { ConversationTurn, TurnPedagogy, SessionStatus } from "@/types/conversation";
import {
  SmartVadStateController,
  calculateSpeechRateWpm,
  calculateTypeTokenRatio,
  detectHesitations,
} from "@/lib/audio/smart-vad.engine";
import {
  analyzeToulminArgumentation,
  detectLogicalFallacies,
  calculateComposureMetrics,
  detectTransitionalBridging,
  getDefaultBlitzLimitSec,
} from "@/lib/advanced/toulmin-pressure.engine";
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

  // ─── Live Voice OS & Cognitive Pressure Blitz State ──────────────────
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [blitzRemainingMs, setBlitzRemainingMs] = useState<number>(0);
  const [isLifelineVisible, setIsLifelineVisible] = useState(false);
  const [aiFinishedSpeechTime, setAiFinishedSpeechTime] = useState<number>(Date.now());
  const [speechStartMs, setSpeechStartMs] = useState<number>(0);

  // ─── Toulmin Argumentation & Composure State ─────────────────────────
  const [latestToulmin, setLatestToulmin] = useState<ToulminAnalysis | null>(null);
  const [latestFallacies, setLatestFallacies] = useState<FallacyDetected[]>([]);
  const [latestComposure, setLatestComposure] = useState<ComposureMetrics | null>(null);
  const [latestBridge, setLatestBridge] = useState<TransitionalBridgeDetected | null>(null);

  // ─── Dynamic Hints & Switch Modal ────────────────────────────────────
  const [dynamicHints, setDynamicHints] = useState<DynamicScaffoldingHints | null>(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);

  // ─── Evaluation Statistics ───────────────────────────────────────────
  const [sessionStats, setSessionStats] = useState({
    scores: [] as number[],
    latencies: [] as number[],
    wpms: [] as number[],
    ttrs: [] as number[],
    toulminScores: [] as number[],
    errorsCount: 0,
    startTime: Date.now(),
  });

  const startTimeRef = useRef<number>(Date.now());
  const turnsEndRef = useRef<HTMLDivElement | null>(null);
  const isAiSpeakingRef = useRef(false);
  const smartVadRef = useRef<SmartVadStateController | null>(null);

  const currentBlock = session?.blocks[currentBlockIdx];
  const blitzLimitSec = currentBlock?.timeLimitSec || getDefaultBlitzLimitSec(currentBlock?.type);



  // ─────────────────────────────────────────────────────────────────────
  // DECLARATION ORDER: Core Speaking Handlers FIRST to avoid TDZ
  // ─────────────────────────────────────────────────────────────────────

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

  const handleStopAndProcess = useCallback(async () => {
    soundEffects.playMicStop();
    // 1. ALWAYS unconditionally stop Web Speech API first
    speech.stopListening();

    const sttProvider = settings.stt?.provider || "browser";
    setSessionStatus("thinking");
    setIsProcessing(true);
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
        return;
      }

      // Latency calculation from AI finished to speech start
      const latencyMs = Math.max(200, speechStartMs - aiFinishedSpeechTime);
      const durationMs = recording?.durationMs || 3500;
      const turnWpm = calculateSpeechRateWpm(spokenText, durationMs);
      const turnTtr = calculateTypeTokenRatio(spokenText);
      const hesitationData = detectHesitations(spokenText);

      // ─── 1. Toulmin Argumentation Analysis ───────────────────────────
      const toulminAnalysis = analyzeToulminArgumentation(spokenText);
      setLatestToulmin(toulminAnalysis);

      // ─── 2. Fallacy Detection ────────────────────────────────────────
      const detectedFallacies = detectLogicalFallacies(spokenText);
      setLatestFallacies(detectedFallacies);
      if (detectedFallacies.length > 0) {
        toast.warning(
          `Cảnh báo logic: ${detectedFallacies[0].labelVi}`,
          detectedFallacies[0].explanationVi
        );
      }

      // ─── 3. Composure Metrics under Blitz Pressure ───────────────────
      const composure = calculateComposureMetrics({
        latencyMs,
        timeLimitMs: blitzLimitSec * 1000,
        wpm: turnWpm,
        hesitationCount: hesitationData.fillerWordCount,
      });
      setLatestComposure(composure);

      // ─── 4. Transitional Bridging Detection ──────────────────────────
      const bridge = detectTransitionalBridging(spokenText);
      setLatestBridge(bridge);
      if (bridge.hasBridge) {
        toast.success("Kỹ thuật Bridging!", bridge.feedbackVi);
      }

      // Trigger Fanfare for Mastery Achievement
      if (toulminAnalysis.toulminScore === 100 || composure.grade === "S") {
        soundEffects.playSuccessFanfare();
      }

      // Create audio URL from recorded blob for self-voice review
      let audioBlobUrl: string | undefined = undefined;
      if (recording?.blob) {
        audioBlobUrl = URL.createObjectURL(recording.blob);
      }

      const userTurnId = `adv_user_${Date.now()}`;
      const userTurnPedagogy: TurnPedagogy = {
        latencyMs,
        speechRateWpm: turnWpm,
        lexicalDiversityTtr: turnTtr,
        hesitationCount: hesitationData.fillerWordCount,
        audioBlobUrl,
      };
      const userTurn: ConversationTurn = {
        id: userTurnId,
        role: "user",
        text: spokenText,
        timestamp: new Date().toISOString(),
        durationMs,
        pedagogy: userTurnPedagogy,
      };

      setTurns((prev) => [...prev, userTurn]);
      setTextInput("");

      // Pedagogical Evaluation Call
      const turnsPayload = turns.map((t) => ({
        role: t.role as "user" | "assistant" | "system",
        content: t.text,
      }));

      const scenarioContext = `Advanced Drill: ${session?.modules[0] || "Advanced"}. Pressure: ${session?.context?.pressureLevel || "challenging"}. Current objective: ${currentBlock?.objective || "Phản biện và lập luận sắc sảo"}. User Toulmin Score: ${toulminAnalysis.toulminScore}%. Missing Elements: ${toulminAnalysis.missingKeyElements.join(", ") || "None"}. Fallacies: ${detectedFallacies.map((f) => f.type).join(", ") || "None"}.`;

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
        coachTipVi: ped?.coachTipVi || toulminAnalysis.feedbackVi || "Tiếp tục đẩy mạnh lập luận!",
      };

      // Record statistics
      setSessionStats((prev) => ({
        ...prev,
        scores: [...prev.scores, ped?.turnScore || 85],
        latencies: [...prev.latencies, latencyMs],
        wpms: [...prev.wpms, turnWpm],
        ttrs: [...prev.ttrs, turnTtr],
        toulminScores: [...prev.toulminScores, toulminAnalysis.toulminScore],
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
    blitzLimitSec,
  ]);

  // Barge-in Interruption (<50ms audio stop + auto mic)
  const handleBargeIn = useCallback(() => {
    tts.stop();
    isAiSpeakingRef.current = false;
    soundEffects.playMicStart();
    toast.info("⚡ Đã ngắt lời AI (Barge-in)", "AI đã nhường quyền nói ngay lập tức.");
    handleStartSpeaking();
  }, [tts, handleStartSpeaking]);

  // Audio Speech Playback with Hands-Free Support
  const speak = useCallback(
    async (text: string) => {
      tts.stop();
      setSessionStatus("speaking");
      isAiSpeakingRef.current = true;
      try {
        await tts.speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 1 });
      } catch {
        // Fallback
      } finally {
        isAiSpeakingRef.current = false;
        setSessionStatus("listening");
        const finishedAt = Date.now();
        setAiFinishedSpeechTime(finishedAt);
        setBlitzRemainingMs(blitzLimitSec * 1000);

        // In Hands-Free mode, auto activate mic
        if (handsFreeMode) {
          setTimeout(() => {
            if (!isProcessing) {
              handleStartSpeaking();
            }
          }, 350);
        }
      }
    },
    [tts, handsFreeMode, isProcessing, handleStartSpeaking, blitzLimitSec]
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

      loadBlockHints(currentBlock.instructions, currentBlock.objective);
      speak(currentBlock.instructions);
    }
  }, [currentBlockIdx, currentBlock?.id]);

  const loadBlockHints = useCallback(
    async (instruction: string, objective: string) => {
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
    },
    [session?.modules, settings.conversation.provider, settings.conversation.model]
  );

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

  // Keyboard Hotkeys (Space to toggle speaking or barge-in)
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
  }, [sessionStatus, handleBargeIn, handleStartSpeaking, handleStopAndProcess]);

  // Smart VAD Controller Setup
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

  // Interim Transcript Stream to Smart VAD
  useEffect(() => {
    const liveText = speech.fullTranscript || speech.transcript || speech.interimTranscript;
    if (liveText) {
      setIsLifelineVisible(false);
      if (handsFreeMode && sessionStatus === "recording") {
        smartVadRef.current?.notifyInterimTranscript(liveText, isAiSpeakingRef.current);
      }
    }
  }, [speech.transcript, speech.interimTranscript, speech.fullTranscript, handsFreeMode, sessionStatus]);

  // Blitz Countdown Timer & Hesitation Lifeline Tracker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (sessionStatus === "listening" || (sessionStatus === "recording" && !speech.transcript)) {
      interval = setInterval(() => {
        const elapsedSinceAi = Date.now() - aiFinishedSpeechTime;
        const remaining = Math.max(0, blitzLimitSec * 1000 - elapsedSinceAi);
        setBlitzRemainingMs(remaining);

        // Hesitation Lifeline Trigger (>3.5s)
        if (elapsedSinceAi >= 3500 && !isLifelineVisible) {
          setIsLifelineVisible(true);
        }
      }, 100);
    } else {
      setBlitzRemainingMs(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStatus, aiFinishedSpeechTime, blitzLimitSec, speech.transcript, isLifelineVisible]);

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

  const avgWpm = sessionStats.wpms.length
    ? Math.round(sessionStats.wpms.reduce((a, b) => a + b, 0) / sessionStats.wpms.length)
    : 130;

  const avgTtr = sessionStats.ttrs.length
    ? Math.round(sessionStats.ttrs.reduce((a, b) => a + b, 0) / sessionStats.ttrs.length)
    : 72;

  const durationMin = Math.max(1, Math.round(elapsedSec / 60));

  const currentTacticalGuide: TacticalGuide = {
    recommendedTone: "Sắc sảo, mạch lạc và quyết đoán chuẩn C1/C2.",
    strategyTip:
      currentBlock?.objective ||
      "Sử dụng mô hình Toulmin: Luận điểm -> Dẫn chứng thực tế -> Lý lẽ giải thích -> Dự đoán phản biện.",
    pitfallsToAvoid: "Tránh ngụy biện nhị nguyên (False dilemma) hoặc khái quát hóa vội vã (Hasty generalization).",
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
            <span className="font-bold text-xs sm:text-sm tracking-tight text-foreground truncate max-w-[120px] sm:max-w-[170px]">
              {session?.modules[0] || "Thử Thách Nâng Cao"}
            </span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono h-5 hidden md:inline-flex">
            {session?.context?.pressureLevel || "challenging"}
          </Badge>

          {/* Hands-Free Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setHandsFreeMode(!handsFreeMode);
              toast.info(
                !handsFreeMode ? "Đã bật Hands-Free Live Voice OS" : "Đã tắt Hands-Free (nhấn micro thủ công)"
              );
            }}
            className={cn(
              "h-6 px-1.5 rounded-lg text-[10px] font-bold gap-1 transition-all",
              handsFreeMode
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "text-muted-foreground border-border/70"
            )}
            title="Tự động lắng nghe & ngắt câu rảnh tay"
          >
            <Radio className="size-2.5 animate-pulse" />
            <span className="hidden sm:inline">Hands-Free</span>
          </Button>

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

        {/* Center: Block Navigation + Blitz Timer Pulse */}
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

          {/* Blitz Countdown Badge */}
          {blitzRemainingMs > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-mono font-bold h-5 transition-all flex items-center gap-1",
                blitzRemainingMs <= 1500
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 animate-bounce"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 animate-pulse"
              )}
            >
              <Zap className="size-2.5" />
              <span>Blitz: {(blitzRemainingMs / 1000).toFixed(1)}s</span>
            </Badge>
          )}

          <Badge variant="outline" className="text-[10px] font-mono h-5 text-muted-foreground hidden sm:inline-flex">
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
                  <Badge variant="secondary" className="text-[9px] font-mono px-1 py-0 h-4 text-amber-600 dark:text-amber-400">
                    ⚡ Blitz: {blitzLimitSec}s
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  Kỹ năng: {currentBlock.skillTargets.join(", ")}
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

          {/* ── TOULMIN ARGUMENTATION CHECKLIST HUD STRIP ── */}
          <div className="px-3 py-1.5 border-b border-border/50 bg-card/60 backdrop-blur-xs shrink-0 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-muted-foreground mr-0.5">Toulmin HUD:</span>

              {/* Claim */}
              <span
                className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 transition-all",
                  latestToulmin?.elementsFound.includes("claim")
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground border-border/60 border-dashed"
                )}
              >
                {latestToulmin?.elementsFound.includes("claim") ? "✓" : "○"} Claim (Luận điểm)
              </span>

              {/* Data */}
              <span
                className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 transition-all",
                  latestToulmin?.elementsFound.includes("data")
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground border-border/60 border-dashed"
                )}
              >
                {latestToulmin?.elementsFound.includes("data") ? "✓" : "○"} Data (Dẫn chứng)
              </span>

              {/* Warrant */}
              <span
                className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 transition-all",
                  latestToulmin?.elementsFound.includes("warrant")
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground border-border/60 border-dashed"
                )}
              >
                {latestToulmin?.elementsFound.includes("warrant") ? "✓" : "○"} Warrant (Lý lẽ)
              </span>

              {/* Rebuttal */}
              <span
                className={cn(
                  "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 transition-all",
                  latestToulmin?.elementsFound.includes("rebuttal")
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted/40 text-muted-foreground border-border/60 border-dashed"
                )}
              >
                {latestToulmin?.elementsFound.includes("rebuttal") ? "✓" : "○"} Rebuttal (Phản biện)
              </span>
            </div>

            {/* Toulmin Score & Composure Badge */}
            <div className="flex items-center gap-1.5">
              {latestToulmin && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0 h-4",
                    latestToulmin.toulminScore >= 75
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40"
                  )}
                >
                  Toulmin: {latestToulmin.toulminScore}%
                </Badge>
              )}

              {latestComposure && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0 h-4 flex items-center gap-0.5",
                    latestComposure.grade === "S"
                      ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40"
                      : latestComposure.grade === "A"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  )}
                  title={latestComposure.label}
                >
                  <Gauge className="size-2.5" />
                  <span>Grade [{latestComposure.grade}]</span>
                </Badge>
              )}
            </div>
          </div>

          {/* ── FALLACY WARNING BANNER (If detected) ── */}
          {latestFallacies.length > 0 && (
            <div className="px-3 py-1.5 bg-rose-500/10 border-b border-rose-500/25 shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 min-w-0">
                <ShieldAlert className="size-3.5 shrink-0" />
                <span className="font-bold shrink-0">{latestFallacies[0].labelVi}:</span>
                <span className="text-[11px] truncate">{latestFallacies[0].explanationVi}</span>
              </div>
              <Badge variant="destructive" className="text-[9px] font-mono shrink-0 px-1 py-0 h-4">
                Tránh ngụy biện
              </Badge>
            </div>
          )}

          {/* ── TRANSITIONAL BRIDGING SUCCESS BANNER ── */}
          {latestBridge?.hasBridge && (
            <div className="px-3 py-1 bg-emerald-500/10 border-b border-emerald-500/20 shrink-0 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-3 shrink-0" />
              <span className="font-medium truncate">{latestBridge.feedbackVi}</span>
            </div>
          )}

          {/* Transcript Message Scroll Area strictly inside */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3">
            <TurnList turns={turns} />
            <div ref={turnsEndRef} />
          </div>

          {/* ── HESITATION LIFELINE RESCUE BANNER (>3.5s) ── */}
          {isLifelineVisible && (
            <div className="px-3 py-2 bg-amber-500/10 border-t border-amber-500/30 shrink-0 flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <LifeBuoy className="size-3.5 animate-spin" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Phao cứu sinh áp lực (Hesitation Lifeline)
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Hãy mở đầu bằng: "From my perspective, the primary concern is..." hoặc "That brings up an interesting point..."
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTextInput("From my perspective, the primary factor is ");
                  setIsLifelineVisible(false);
                }}
                className="h-6 px-2 rounded-lg text-[10px] font-bold border-amber-500/40 text-amber-600 shrink-0"
              >
                Dùng câu mẫu
              </Button>
            </div>
          )}

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
            <div className="mb-2 flex items-center gap-1.5">
              <StatusBadge status={sessionStatus} />
              {handsFreeMode && (
                <Badge variant="outline" className="text-[9px] font-mono h-4 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Hands-Free ON
                </Badge>
              )}
            </div>

            {/* Speaking Controller Buttons */}
            <div className="w-full flex items-center justify-center gap-1.5">
              <Button
                variant={sessionStatus === "recording" ? "destructive" : "default"}
                size="lg"
                onClick={
                  sessionStatus === "speaking"
                    ? handleBargeIn
                    : sessionStatus === "recording"
                    ? handleStopAndProcess
                    : handleStartSpeaking
                }
                disabled={isProcessing}
                className="flex-1 h-10 rounded-xl font-bold text-xs gap-1.5 shadow-xs transition-all"
              >
                {sessionStatus === "recording" ? (
                  <>
                    <Square className="size-3.5" />
                    <span>Dừng & Chấm Điểm</span>
                    <kbd className="text-[9px] font-mono px-1 py-0.5 bg-white/20 rounded">Space</kbd>
                  </>
                ) : sessionStatus === "speaking" ? (
                  <>
                    <Zap className="size-3.5 text-amber-300" />
                    <span>Ngắt lời AI (Barge-in)</span>
                    <kbd className="text-[9px] font-mono px-1 py-0.5 bg-primary-foreground/20 rounded">Space</kbd>
                  </>
                ) : (
                  <>
                    <Mic className="size-3.5" />
                    <span>Bắt Đầu Nói</span>
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
                  placeholder="Gõ câu trả lời tiếng Anh (chuẩn Toulmin: Claim, Data, Warrant, Rebuttal)..."
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
        wpm={avgWpm}
        ttrRatio={avgTtr}
        cefrEstimate={avgScore >= 90 ? "C2" : avgScore >= 80 ? "C1" : "B2"}
        errorsDetected={sessionStats.errorsCount}
        onRestart={() => router.push("/advanced")}
      />
    </div>
  );
}
