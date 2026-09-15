"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useVoiceSessionStore } from "@/stores/voice-session-store";
import { useSettingsStore } from "@/stores/settings-store";
import { StatusBadge } from "@/components/voice/StatusBadge";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { TurnList } from "@/components/conversation/TurnList";
import { QuickHintsDrawer, type DynamicScaffoldingHints } from "@/components/voice/QuickHintsDrawer";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { transcribeViaServer } from "@/lib/stt/service";
import type { ConversationTurn, TurnPedagogy, DiscourseStage, ConversationalTwist } from "@/types/conversation";
import {
  calculateSpeechRateWpm,
  calculateTypeTokenRatio,
  getDiscourseStage,
  getScenarioTwist,
  evaluateTwistResolution,
  SmartVadStateController,
} from "@/lib/audio/smart-vad.engine";
import {
  Mic,
  Square,
  Play,
  Send,
  Volume2,
  Keyboard,
  ArrowLeft,
  Target,
  Compass,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Wand2,
  Shuffle,
  Loader2,
  Plus,
  X,
  Zap,
  AlertTriangle,
  Radio,
  LifeBuoy,
} from "lucide-react";

interface PracticeScenario {
  id: string;
  title: string;
  titleVi: string;
  category: string;
  aiRole: string;
  userRole: string;
  goal: string;
  targetTurns: number;
  openingPrompt: string;
  tacticalGuide?: {
    recommendedTone: string;
    strategyTip: string;
    pitfallsToAvoid: string;
  };
}

const DISCOURSE_STAGES: { key: DiscourseStage; labelVi: string; icon: string }[] = [
  { key: "rapport", labelVi: "Khởi động", icon: "🤝" },
  { key: "discovery", labelVi: "Khai thác", icon: "🔍" },
  { key: "twist_conflict", labelVi: "Biến cố", icon: "⚡" },
  { key: "negotiation", labelVi: "Thương lượng", icon: "⚖️" },
  { key: "resolution", labelVi: "Đúc kết", icon: "🎯" },
];

const PRESET_SCENARIOS: PracticeScenario[] = [
  {
    id: "tech_interview",
    title: "Software Engineering Job Interview",
    titleVi: "Phỏng vấn Kỹ sư phần mềm",
    category: "interview",
    aiRole: "Senior Tech Hiring Manager",
    userRole: "Software Engineer Candidate",
    goal: "Giới thiệu bản thân, trình bày kinh nghiệm xử lý lỗi hệ thống và trả lời tự tin.",
    targetTurns: 6,
    openingPrompt:
      "Hello! Thank you for joining our interview today. To start off, could you tell me a little bit about yourself and a technical project you recently worked on?",
    tacticalGuide: {
      recommendedTone: "Tự tin, chuyên nghiệp và cầu thị.",
      strategyTip: "Áp dụng kỹ thuật STAR: Bối cảnh -> Thử thách -> Giải pháp kỹ thuật -> Kết quả đo lường được.",
      pitfallsToAvoid: "Tránh trả lời mơ hồ hoặc nói xấu đồng nghiệp/công ty cũ.",
    },
  },
  {
    id: "salary_negotiation",
    title: "Salary & Benefits Negotiation",
    titleVi: "Đàm phán Lương & Phúc lợi",
    category: "workplace",
    aiRole: "HR Director",
    userRole: "Valued Employee",
    goal: "Đề xuất tăng 15% lương dựa trên các đóng góp nổi bật trong quý vừa qua.",
    targetTurns: 6,
    openingPrompt:
      "Good afternoon! I received your request to discuss your compensation package. What accomplishments would you like to highlight today?",
    tacticalGuide: {
      recommendedTone: "Nhã nhặn, quyết đoán và dựa trên dữ liệu thành tích.",
      strategyTip: "Nêu bật các đóng góp doanh thu và trách nhiệm mở rộng trước khi đưa ra con số đề xuất.",
      pitfallsToAvoid: "Tránh đưa ra tối hậu thư hoặc so sánh với đồng nghiệp khác.",
    },
  },
  {
    id: "project_deadline",
    title: "Project Deadline Conflict Discussion",
    titleVi: "Thảo luận xung đột tiến độ",
    category: "workplace",
    aiRole: "Project Manager",
    userRole: "Lead Developer",
    goal: "Giải thích lý do cần thêm 3 ngày kiểm thử bảo mật và đề xuất giải pháp khả thi.",
    targetTurns: 6,
    openingPrompt:
      "Hey, I noticed our release is scheduled for this Friday, but you requested a delay. What seems to be the main blocker on your side?",
    tacticalGuide: {
      recommendedTone: "Trách nhiệm, thấu hiểu và hướng tới giải pháp.",
      strategyTip: "Giải thích rủi ro bảo mật nếu phát hành vội và đề xuất lộ trình phát hành từng phần.",
      pitfallsToAvoid: "Tránh chỉ phàn nàn mà không có phương án thay thế.",
    },
  },
  {
    id: "coffee_smalltalk",
    title: "Casual Networking & Weekend Plans",
    titleVi: "Trò chuyện Small Talk & Cuối tuần",
    category: "daily",
    aiRole: "Friendly International Colleague",
    userRole: "Colleague",
    goal: "Chia sẻ sở thích, thói quen thư giãn và kết nối thân thiện.",
    targetTurns: 5,
    openingPrompt:
      "Hey there! How's your week been going so far? Do you have anything fun planned for the upcoming weekend?",
    tacticalGuide: {
      recommendedTone: "Ấm áp, cởi mở và tự nhiên.",
      strategyTip: "Dùng câu hỏi mở và chia sẻ trải nghiệm cá nhân ngắn gọn để tạo sự đồng điệu.",
      pitfallsToAvoid: "Tránh nói độc thoại quá dài hoặc chọn các chủ đề nhạy cảm.",
    },
  },
  {
    id: "hotel_checkin",
    title: "Hotel Room Issue & Room Upgrade",
    titleVi: "Xử lý phòng khách sạn & Đổi phòng",
    category: "travel",
    aiRole: "Front Desk Concierge",
    userRole: "Hotel Guest",
    goal: "Phàn nàn lịch sự về tiếng ồn máy lạnh và xin đổi sang phòng view biển yên tĩnh.",
    targetTurns: 5,
    openingPrompt:
      "Welcome to the front desk, sir. How can I assist you with your stay this evening?",
    tacticalGuide: {
      recommendedTone: "Lịch thiệp nhưng kiên định.",
      strategyTip: "Cảm ơn sự hỗ trợ trước, sau đó mô tả sự bất tiện và đề nghị phương án cụ thể.",
      pitfallsToAvoid: "Tránh nổi nóng hay đe dọa ngay từ đầu.",
    },
  },
];

export default function SessionPage() {
  const {
    session,
    status,
    createSession,
    setStatus,
    addTurn,
    clearError,
    reset,
  } = useVoiceSessionStore();

  const settings = useSettingsStore();
  const recorder = useAudioRecorder();
  const speechRec = useSpeechRecognition("en-US");
  const tts = useBrowserTTS();

  // ─── Mode & Scenario State ───────────────────────────────────────────
  const [sessionMode, setSessionMode] = useState<"goal" | "free">("goal");
  const [selectedScenario, setSelectedScenario] = useState<PracticeScenario>(PRESET_SCENARIOS[0]);

  // ─── Interaction State ───────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [dynamicHints, setDynamicHints] = useState<DynamicScaffoldingHints | null>(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState("");

  // ─── Speech Latency & Timing Tracker ─────────────────────────────────
  const [aiFinishedSpeechTime, setAiFinishedSpeechTime] = useState<number>(Date.now());
  const [speechStartMs, setSpeechStartMs] = useState<number>(0);

  // ─── Live Conversational OS State ─────────────────────────────────────
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [activeTwist, setActiveTwist] = useState<ConversationalTwist | null>(null);
  const [activeTwistFeedback, setActiveTwistFeedback] = useState<string | null>(null);
  const [isLifelineVisible, setIsLifelineVisible] = useState(false);
  const [lifelineElapsedMs, setLifelineElapsedMs] = useState(0);
  const isAiSpeakingRef = useRef(false);
  const smartVadRef = useRef<SmartVadStateController | null>(null);

  // ─── Overall Session Evaluation Aggregate ────────────────────────────
  const [sessionStats, setSessionStats] = useState({
    totalTurns: 0,
    scores: [] as number[],
    latencies: [] as number[],
    wpms: [] as number[],
    ttrs: [] as number[],
    errorsCount: 0,
    twistResolved: false,
    startTime: Date.now(),
  });

  const turnsEndRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Auto-scroll on new turns
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.turns]);



  // ─── Keyboard Hotkeys (Space to toggle speaking / Barge-in) ───────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (status === "speaking" || isAiSpeakingRef.current) {
          handleBargeIn();
        } else if (status === "recording") {
          handleStopAndProcess();
        } else if (status === "listening" || status === "idle" || status === "ready") {
          handleStartSpeaking();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status]);

  // ─── Barge-in Interruption Handler (<50ms audio mute) ────────────────
  const handleBargeIn = useCallback(() => {
    tts.stop();
    isAiSpeakingRef.current = false;
    soundEffects.playMicStart();
    toast.info("⚡ Đã ngắt lời AI (Barge-in)", "AI đã nhường quyền nói cho bạn.");
    handleStartSpeaking();
  }, [tts]);

  // ─── Speaking Controls ────────────────────────────────────────────────
  const handleStartSpeaking = useCallback(async () => {
    clearError();
    soundEffects.playMicStart();
    speechRec.resetTranscript();
    setSpeechStartMs(Date.now());
    setStatus("recording");
    setIsLifelineVisible(false);

    const sttProvider = settings.stt?.provider || "browser";

    try {
      await recorder.start();
      if (sttProvider === "browser") {
        speechRec.startListening();
      }
    } catch {
      toast.error("Lỗi Microphone", "Vui lòng cho phép truy cập micro.");
      setStatus("listening");
    }
  }, [clearError, recorder, speechRec, setStatus, settings.stt?.provider]);

  // ─── Audio Synthesis Playback with Hands-Free Auto-Mic ────────────────
  const synthesizeAndPlay = useCallback(
    async (text: string) => {
      setStatus("speaking");
      isAiSpeakingRef.current = true;
      try {
        await tts.speak(sanitizeTextForTTS(text), { lang: "en-US", rate: 0.95 });
      } catch {
        // Fallback
      } finally {
        isAiSpeakingRef.current = false;
        setStatus("listening");
        setAiFinishedSpeechTime(Date.now());

        // In Hands-Free mode, automatically turn mic back on for the learner
        if (handsFreeMode) {
          setTimeout(() => {
            if (!isProcessing) {
              handleStartSpeaking();
            }
          }, 400);
        }
      }
    },
    [setStatus, tts, handsFreeMode, isProcessing, handleStartSpeaking]
  );

  // ─── Session Initialization ──────────────────────────────────────────
  const startSession = useCallback(
    async (scenario?: PracticeScenario, mode: "goal" | "free" = sessionMode) => {
      const activeScen = scenario || selectedScenario;
      reset();
      setActiveTwist(null);
      setActiveTwistFeedback(null);
      setIsLifelineVisible(false);
      const s = createSession({
        provider: settings.conversation.provider,
        model: settings.conversation.model,
        sttProvider: settings.stt.provider,
        sttModel: settings.stt.model,
        ttsProvider: settings.tts.provider,
        ttsModel: settings.tts.model,
      });
      sessionIdRef.current = s.id;
      setSessionStats({
        totalTurns: 0,
        scores: [],
        latencies: [],
        wpms: [],
        ttrs: [],
        errorsCount: 0,
        twistResolved: false,
        startTime: Date.now(),
      });

      // Opening AI Turn with dynamic initial hints
      setIsLoadingHints(true);
      let openingText =
        mode === "goal"
          ? activeScen.openingPrompt
          : "Hello! I'm your English speaking coach. What's on your mind today? Let's talk about anything you like!";

      try {
        const scenarioContext =
          mode === "goal"
            ? `Scenario: ${activeScen.title}. Goal: ${activeScen.goal}. AI Role: ${activeScen.aiRole}. User Role: ${activeScen.userRole}.`
            : "Free-flow casual speaking practice. Greet the learner warmly.";

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
        if (data.result?.openingPrompt) {
          openingText = data.result.openingPrompt;
        }
        if (data.result?.hints) {
          setDynamicHints(data.result.hints);
        }
      } catch {
        // Fallback to default
      } finally {
        setIsLoadingHints(false);
      }

      soundEffects.playAIReady();
      addTurn({
        id: `turn_ai_${Date.now()}`,
        role: "assistant",
        text: openingText,
        timestamp: new Date().toISOString(),
        provider: settings.conversation.provider,
        model: settings.conversation.model,
      });

      await synthesizeAndPlay(openingText);
    },
    [createSession, reset, selectedScenario, sessionMode, settings, addTurn, synthesizeAndPlay]
  );

  const handleStopAndProcess = useCallback(async () => {
    soundEffects.playMicStop();
    // 1. ALWAYS unconditionally stop Web Speech API first
    speechRec.stopListening();

    const sttProvider = settings.stt?.provider || "browser";
    setStatus("thinking");
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
          spokenText = speechRec.fullTranscript.trim() || speechRec.transcript.trim();
        }
      } else {
        await new Promise((r) => setTimeout(r, 250));
        spokenText =
          speechRec.fullTranscript.trim() ||
          speechRec.transcript.trim() ||
          textInput.trim();
      }

      if (!spokenText) {
        toast.info("Chưa nghe rõ", "Vui lòng nói lại hoặc gõ văn bản.");
        setStatus("listening");
        setIsProcessing(false);
        return;
      }

      // 1. Metrics & Discourse calculation
      const durationMs = recording?.durationMs || 3500;
      const latencyMs = Math.max(200, speechStartMs - aiFinishedSpeechTime);
      const turnWpm = calculateSpeechRateWpm(spokenText, durationMs);
      const turnTtr = calculateTypeTokenRatio(spokenText);
      const currentDiscourse = getDiscourseStage(sessionStats.totalTurns + 1, selectedScenario.targetTurns);

      // 2. Check for Conversational Twist Injection
      let currentActiveTwist = activeTwist;
      if (!currentActiveTwist && sessionMode === "goal") {
        currentActiveTwist = getScenarioTwist(selectedScenario.id, sessionStats.totalTurns + 1);
        if (currentActiveTwist) {
          setActiveTwist(currentActiveTwist);
          toast.warning("⚡ BIẾN CỐ ĐỐI THOẠI!", currentActiveTwist.titleVi);
        }
      }

      // 3. Evaluate Twist Resolution
      let isTwistResolved = sessionStats.twistResolved;
      if (currentActiveTwist && !currentActiveTwist.isResolved) {
        const twistEval = evaluateTwistResolution(currentActiveTwist, spokenText);
        if (twistEval.isResolved) {
          currentActiveTwist.isResolved = true;
          isTwistResolved = true;
          setActiveTwistFeedback(twistEval.feedbackVi);
          toast.success("Giải quyết biến cố thành công!", twistEval.feedbackVi);
        }
      }

      // Create audio URL from recorded blob for self-voice review
      let audioBlobUrl: string | undefined = undefined;
      if (recording?.blob) {
        audioBlobUrl = URL.createObjectURL(recording.blob);
      }

      const userTurnId = `turn_user_${Date.now()}`;
      const userTurnPedagogy: TurnPedagogy = {
        latencyMs,
        audioBlobUrl,
        speechRateWpm: turnWpm,
        lexicalDiversityTtr: turnTtr,
        discourseStage: currentDiscourse,
        activeTwistAlert: currentActiveTwist?.titleVi,
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

      // Call AI with Pedagogical dual evaluation
      const turnsPayload =
        session?.turns.map((t) => ({
          role: t.role as "user" | "assistant" | "system",
          content: t.text,
        })) || [];

      const scenarioContext =
        sessionMode === "goal"
          ? `Scenario: ${selectedScenario.title}. Goal: ${selectedScenario.goal}. AI Role: ${selectedScenario.aiRole}. User Role: ${selectedScenario.userRole}.`
          : undefined;

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
          discourseStage: currentDiscourse,
          activeTwist: currentActiveTwist,
          userTurnDurationMs: durationMs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Không nhận được phản hồi từ AI.");
      }

      const result = data.result;
      const aiReplyText = result.replyText || "Could you tell me more about that?";
      const ped = result.pedagogy;

      // Update user turn with pedagogical feedback
      userTurn.pedagogy = {
        ...userTurn.pedagogy,
        grammarIssue: ped?.grammarIssue || null,
        grammarFix: ped?.grammarFix || null,
        nativeReformulation: ped?.nativeReformulation || spokenText,
        turnScore: ped?.turnScore || 85,
        coachTipVi: ped?.coachTipVi,
        speechRateWpm: ped?.speechRateWpm || turnWpm,
        lexicalDiversityTtr: ped?.lexicalDiversityTtr || turnTtr,
      };

      // Record statistics
      setSessionStats((prev) => ({
        ...prev,
        totalTurns: prev.totalTurns + 1,
        scores: [...prev.scores, ped?.turnScore || 85],
        latencies: [...prev.latencies, latencyMs],
        wpms: [...prev.wpms, turnWpm],
        ttrs: [...prev.ttrs, turnTtr],
        errorsCount: prev.errorsCount + (ped?.grammarIssue ? 1 : 0),
        twistResolved: isTwistResolved,
      }));

      // Add AI response turn
      soundEffects.playAIReady();
      addTurn({
        id: `turn_ai_${Date.now()}`,
        role: "assistant",
        text: aiReplyText,
        timestamp: new Date().toISOString(),
        provider: settings.conversation.provider,
        model: settings.conversation.model,
      });

      // Update dynamic hints matching AI's next question
      if (result.hints) {
        setDynamicHints(result.hints);
      }

      // Check if target reached in goal-oriented mode
      const newTurnCount = sessionStats.totalTurns + 1;
      if (sessionMode === "goal" && newTurnCount >= selectedScenario.targetTurns) {
        setTimeout(() => setShowCompletedModal(true), 1500);
      }

      await synthesizeAndPlay(aiReplyText);
    } catch (err: unknown) {
      toast.error("Lỗi đối thoại", err instanceof Error ? err.message : String(err));
      setStatus("listening");
    } finally {
      setIsProcessing(false);
    }
  }, [
    recorder,
    speechRec,
    textInput,
    speechStartMs,
    aiFinishedSpeechTime,
    addTurn,
    session?.turns,
    sessionMode,
    selectedScenario,
    settings,
    sessionStats.totalTurns,
    sessionStats.twistResolved,
    activeTwist,
    synthesizeAndPlay,
    setStatus,
  ]);

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
        if (status === "recording" && !isProcessing) {
          handleStopAndProcess();
        }
      },
      onBargeIn: () => {
        if (isAiSpeakingRef.current || status === "speaking") {
          handleBargeIn();
        }
      },
    });

    return () => {
      smartVadRef.current?.destroy();
      smartVadRef.current = null;
    };
  }, [handsFreeMode, status, isProcessing, handleStopAndProcess, handleBargeIn]);

  // ─── Interim Transcript Stream to Smart VAD ───────────────────────────
  useEffect(() => {
    const liveText = speechRec.fullTranscript || speechRec.transcript || speechRec.interimTranscript;
    if (liveText) {
      setIsLifelineVisible(false);
      if (handsFreeMode && status === "recording") {
        smartVadRef.current?.notifyInterimTranscript(liveText, isAiSpeakingRef.current);
      }
    }
  }, [speechRec.transcript, speechRec.interimTranscript, speechRec.fullTranscript, handsFreeMode, status]);

  // ─── Silence Hesitation Lifeline Tracker (>3.5s) ───────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === "listening" || (status === "recording" && !speechRec.transcript)) {
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
  }, [status, aiFinishedSpeechTime, speechRec.transcript, isLifelineVisible]);

  const handleRefreshHints = useCallback(async () => {
    setIsLoadingHints(true);
    try {
      const lastAITurn =
        [...(session?.turns || [])].reverse().find((t) => t.role === "assistant");
      const lastAIText = lastAITurn?.text || selectedScenario.openingPrompt;

      const scenarioContext =
        sessionMode === "goal"
          ? `Scenario: ${selectedScenario.title}. Goal: ${selectedScenario.goal}. Focus on generating hints to answer AI's latest statement: "${lastAIText}"`
          : `Free-flow conversation. Focus on generating hints to answer AI's latest statement: "${lastAIText}"`;

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
  }, [session?.turns, sessionMode, selectedScenario, settings]);

  const handleGenerateInfiniteScenario = async (customTopic?: string) => {
    setIsGeneratingScenario(true);
    toast.info("AI đang sáng tạo kịch bản...", "Thiết kế nhân vật, mục tiêu và chiến lược đối thoại.");
    try {
      const res = await fetch("/api/ai/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.conversation.provider,
          model: settings.conversation.model,
          topic: customTopic || customTopicInput,
        }),
      });
      const data = await res.json();
      if (data.scenario) {
        const sc: PracticeScenario = {
          id: data.scenario.id,
          title: data.scenario.title,
          titleVi: data.scenario.titleVi,
          category: data.scenario.category,
          aiRole: data.scenario.aiRole,
          userRole: data.scenario.userRole,
          goal: data.scenario.goal,
          targetTurns: data.scenario.targetTurns || 6,
          openingPrompt: data.scenario.openingPrompt,
          tacticalGuide: data.scenario.tacticalGuide,
        };
        setSelectedScenario(sc);
        if (data.scenario.hints) {
          setDynamicHints(data.scenario.hints);
        }
        setSessionMode("goal");
        startSession(sc, "goal");
        setShowScenarioModal(false);
        setCustomTopicInput("");
        toast.success("Kịch bản mới sẵn sàng!", sc.titleVi);
      }
    } catch {
      toast.error("Không thể tạo kịch bản lúc này");
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    handleStopAndProcess();
  };

  const handleEndSession = () => {
    setShowCompletedModal(true);
  };

  // Re-play last AI response
  const handleReplayLastAI = () => {
    const lastAITurn = [...(session?.turns || [])].reverse().find((t) => t.role === "assistant");
    if (lastAITurn) {
      synthesizeAndPlay(lastAITurn.text);
    }
  };

  // ─── Computed Statistics for Modal ────────────────────────────────────
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

  const durationMin = Math.max(1, Math.round((Date.now() - sessionStats.startTime) / 60000));

  const cefrEstimate =
    avgScore >= 90 && avgWpm >= 130
      ? "C1"
      : avgScore >= 78 && avgWpm >= 105
      ? "B2"
      : avgScore >= 65
      ? "B1"
      : "A2";

  const currentStageKey = getDiscourseStage(sessionStats.totalTurns + 1, selectedScenario.targetTurns);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background select-none overflow-hidden">
      {/* ── TOP NAV BAR (Compact 52px) ── */}
      <header className="h-13 border-b border-border/80 bg-card/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2.5 shrink-0 z-10">
        {/* Left: Back + Icon + Title + Mode Switcher */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/foundation">
            <Button variant="ghost" size="sm" className="size-7 p-0 rounded-xl" title="Quay lại">
              <ArrowLeft className="size-3.5" />
            </Button>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="size-6 rounded-lg bg-gradient-to-tr from-primary to-indigo-600 text-primary-foreground flex items-center justify-center shrink-0">
              <MessageSquare className="size-3.5" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-tight text-foreground hidden sm:inline">
              Phòng Luyện Nói AI
            </span>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/60 ml-1">
            <button
              onClick={() => {
                setSessionMode("goal");
                startSession(selectedScenario, "goal");
              }}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 ${
                sessionMode === "goal"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="size-2.5" />
              <span>Kịch Bản</span>
            </button>
            <button
              onClick={() => {
                setSessionMode("free");
                startSession(selectedScenario, "free");
              }}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 ${
                sessionMode === "free"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="size-2.5" />
              <span>Tự Do</span>
            </button>
          </div>
        </div>

        {/* Center: Scenario Goal or Progress */}
        <div className="hidden md:flex items-center gap-2 max-w-sm truncate">
          {sessionMode === "goal" ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-5 shrink-0">
                {sessionStats.totalTurns}/{selectedScenario.targetTurns} lượt
              </Badge>
              <span className="font-semibold text-foreground text-xs truncate">
                {selectedScenario.titleVi}
              </span>
            </div>
          ) : (
            <Badge variant="secondary" className="text-[10px] font-mono h-5">
              Nói tự do • {sessionStats.totalTurns} lượt
            </Badge>
          )}
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
                  ? "AI sẽ tự động nhận diện dừng tiếng và tự bật mic sau khi nói."
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

          {session?.turns && session.turns.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndSession}
              className="h-7 px-2.5 rounded-xl text-xs font-bold gap-1 border-border/80"
            >
              <CheckCircle2 className="size-3 text-emerald-500" />
              <span>Kết thúc</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT (7:5 Ratio, Zero Body Scroll) ── */}
      <main className="flex-1 p-2.5 sm:p-3 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 min-h-0">
        {/* LEFT (7 cols): Dialogue Canvas */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 rounded-3xl border border-border/80 bg-card overflow-hidden paper-shadow">
          {/* Scenario Banner Strip (in Goal Mode) */}
          {sessionMode === "goal" && (
            <div className="px-3.5 py-2.5 border-b border-border/60 bg-secondary/40 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold text-xs sm:text-sm text-foreground truncate">
                    Mục tiêu: {selectedScenario.titleVi}
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4 border-border/80 text-muted-foreground">
                    {selectedScenario.category}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate font-sans">{selectedScenario.goal}</p>
              </div>

              {/* Scenario Selector & Infinite Generator */}
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={selectedScenario.id}
                  onChange={(e) => {
                    const sc = PRESET_SCENARIOS.find((s) => s.id === e.target.value);
                    if (sc) {
                      setSelectedScenario(sc);
                      startSession(sc, "goal");
                    }
                  }}
                  className="text-[11px] font-medium px-2 py-1 rounded-lg bg-background border border-border/80 text-foreground cursor-pointer focus:outline-hidden max-w-[130px] truncate"
                >
                  {PRESET_SCENARIOS.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.titleVi}
                    </option>
                  ))}
                  {!PRESET_SCENARIOS.some((s) => s.id === selectedScenario.id) && (
                    <option value={selectedScenario.id}>
                      ✨ {selectedScenario.titleVi}
                    </option>
                  )}
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScenarioModal(true)}
                  disabled={isGeneratingScenario}
                  className="h-7 px-2 rounded-lg text-[10px] font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                  title="AI Tạo Kịch Bản Vô Hạn"
                >
                  {isGeneratingScenario ? (
                    <Loader2 className="size-2.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-2.5" />
                  )}
                  <span>Tạo mới</span>
                </Button>
              </div>
            </div>
          )}

          {/* Discourse Stage Progression Bar */}
          {sessionMode === "goal" && (
            <div className="px-3.5 py-1.5 bg-secondary/50 border-b border-border/50 flex items-center justify-between gap-1 overflow-x-auto text-[10px] shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium shrink-0">Giai đoạn:</span>
                <div className="flex items-center gap-1">
                  {DISCOURSE_STAGES.map((st, idx) => {
                    const isCurrent = st.key === currentStageKey;
                    const currentIdx = DISCOURSE_STAGES.findIndex((s) => s.key === currentStageKey);
                    const isPast = currentIdx > idx;
                    return (
                      <span
                        key={st.key}
                        className={`px-1.5 py-0.5 rounded-md font-sans flex items-center gap-1 transition-all ${
                          isCurrent
                            ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                            : isPast
                            ? "bg-card border border-border/70 text-foreground font-medium"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        <span>{st.icon}</span>
                        <span>{st.labelVi}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              {activeTwist && (
                <Badge
                  variant={activeTwist.isResolved ? "outline" : "destructive"}
                  className="text-[9px] font-mono px-1.5 py-0 h-4.5 gap-1 shrink-0 animate-pulse border"
                >
                  <AlertTriangle className="size-2.5" />
                  <span>{activeTwist.isResolved ? "Đã gỡ biến cố" : "Biến cố bất ngờ"}</span>
                </Badge>
              )}
            </div>
          )}

          {/* Active Twist Alert Banner */}
          {activeTwist && !activeTwist.isResolved && (
            <div className="mx-3.5 my-2.5 p-3 rounded-2xl bg-card border border-amber-600/40 text-foreground flex items-start gap-2.5 paper-shadow-sm shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="size-7 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                <Zap className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-serif font-bold text-amber-800 dark:text-amber-300">
                  <span>Tình huống bất ngờ: {activeTwist.titleVi}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-sans">
                  {activeTwist.promptAiVi || activeTwist.descriptionEn}
                </p>
                <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                  💡 Gợi ý: Giữ bình tĩnh, diễn giải lý do hoặc đề xuất một giải pháp cụ thể.
                </div>
              </div>
            </div>
          )}

          {/* Active Twist Resolved Feedback Banner */}
          {activeTwist && activeTwist.isResolved && activeTwistFeedback && (
            <div className="mx-3.5 my-2 p-2.5 rounded-xl bg-card border border-chart-2/40 text-foreground flex items-center gap-2 shrink-0 animate-in fade-in duration-300 paper-shadow-sm">
              <CheckCircle2 className="size-4 text-chart-2 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-chart-2">Xử lý tình huống tốt!</span>{" "}
                <span className="text-muted-foreground text-[11px]">{activeTwistFeedback}</span>
              </div>
            </div>
          )}

          {/* Transcript Message Scroll Area strictly inside */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3">
            {!session?.turns || session.turns.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="size-14 rounded-2xl bg-secondary border border-border/80 text-primary flex items-center justify-center paper-shadow-sm">
                  <MessageSquare className="size-6" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="text-base font-serif font-bold text-foreground">Sẵn sàng luyện nói cùng AI</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nhấn nút bắt đầu để mở đầu kịch bản và cùng đàm thoại theo nhịp tự nhiên.
                  </p>
                </div>
                <Button
                  onClick={() => startSession()}
                  className="rounded-xl px-5 h-9 text-xs font-bold gap-1.5 shadow-xs"
                >
                  <Play className="size-3.5" />
                  <span>Bắt đầu đối thoại</span>
                </Button>
              </div>
            ) : (
              <>
                <TurnList turns={session.turns} />
                <div ref={turnsEndRef} />
              </>
            )}
          </div>

          {/* Bottom Live STT Banner */}
          {status === "recording" && (
            <div className="px-3.5 py-1.5 bg-primary/10 border-t border-primary/25 shrink-0 flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <p className="text-xs font-mono text-primary truncate">
                {speechRec.fullTranscript || speechRec.transcript || "Đang lắng nghe bạn nói..."}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT (5 cols): Voice Hub + Embedded Scaffolding */}
        <div className="lg:col-span-5 h-full flex flex-col gap-2.5 sm:gap-3 min-h-0 overflow-hidden">
          {/* Voice Hub (Upper Section) */}
          <div className="shrink-0 p-3.5 rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card to-primary/5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xs">
            <VoiceOrb status={status} size="sm" className="my-1" />
            <div className="mb-2">
              <StatusBadge status={status} />
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
                  {(dynamicHints?.directStarter
                    ? [dynamicHints.directStarter, "To be completely honest...", "From my perspective..."]
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
                variant={status === "recording" ? "destructive" : "default"}
                size="lg"
                onClick={status === "recording" ? handleStopAndProcess : handleStartSpeaking}
                disabled={isProcessing}
                className="flex-1 h-10 rounded-xl font-bold text-xs gap-1.5 shadow-xs transition-all"
              >
                {status === "recording" ? (
                  <>
                    <Square className="size-3.5" />
                    <span>Dừng & Chấm Điểm</span>
                    <kbd className="text-[9px] font-mono px-1 py-0.5 bg-white/20 rounded">Space</kbd>
                  </>
                ) : (
                  <>
                    <Mic className="size-3.5" />
                    <span>{status === "speaking" ? "Ngắt lời AI" : "Bắt Đầu Nói"}</span>
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
              scenarioGoal={selectedScenario.goal}
              hints={dynamicHints}
              tacticalGuide={selectedScenario.tacticalGuide}
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

      {/* ── CUSTOM / INFINITE SCENARIO MODAL ── */}
      {showScenarioModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">AI Sáng Tạo Kịch Bản Vô Hạn</h3>
                  <p className="text-[11px] text-muted-foreground">Tạo tình huống theo bất kỳ ý tưởng nào</p>
                </div>
              </div>
              <button
                onClick={() => setShowScenarioModal(false)}
                className="size-7 rounded-xl hover:bg-muted/50 flex items-center justify-center text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                Nhập chủ đề bạn muốn luyện tập:
              </label>
              <Textarea
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                placeholder="Ví dụ: Đàm phán mua căn hộ; Tranh luận về việc dùng AI trong giáo dục; Phỏng vấn du học sinh..."
                rows={3}
                className="text-xs bg-background rounded-xl resize-none p-2.5"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateInfiniteScenario()}
                disabled={isGeneratingScenario}
                className="flex-1 h-10 rounded-xl font-bold text-xs gap-1.5"
              >
                <Shuffle className="size-3.5 text-amber-500" />
                <span>Sinh ngẫu nhiên</span>
              </Button>

              <Button
                size="sm"
                onClick={() => handleGenerateInfiniteScenario(customTopicInput)}
                disabled={isGeneratingScenario || !customTopicInput.trim()}
                className="flex-1 h-10 rounded-xl font-bold text-xs gap-1.5"
              >
                {isGeneratingScenario ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Wand2 className="size-3.5" />
                )}
                <span>Tạo theo chủ đề</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SESSION COMPLETED MODAL ── */}
      <SessionCompletedModal
        open={showCompletedModal}
        onOpenChange={setShowCompletedModal}
        sessionTitle={sessionMode === "goal" ? selectedScenario.titleVi : "Phiên Nói Tự Do"}
        durationMinutes={durationMin}
        turnsCount={sessionStats.totalTurns}
        avgTtfwMs={avgLatency}
        overallScore={avgScore}
        errorsDetected={sessionStats.errorsCount}
        wpm={avgWpm}
        ttrRatio={avgTtr}
        twistResolved={sessionStats.twistResolved}
        cefrEstimate={cefrEstimate}
        onRestart={() => startSession()}
      />
    </div>
  );
}
