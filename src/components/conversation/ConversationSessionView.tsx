"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Volume2,
  ArrowLeft,
  CheckCircle2,
  Heart,
  Shield,
  Users,
  Target,
  MessageSquare,
  Radio,
  LifeBuoy,
  Flame,
  Trophy,
  Loader2,
} from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useUnifiedSTT } from "@/hooks/useUnifiedSTT";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { sanitizeTextForTTS } from "@/lib/tts/browser";
import { VoiceOrb, type VoiceOrbStatus } from "@/components/voice/VoiceOrb";
import { StatusBadge } from "@/components/voice/StatusBadge";
import { TurnList } from "@/components/conversation/TurnList";
import { TurnFeedbackCard } from "@/components/conversation/TurnFeedbackCard";
import { QuickHintsDrawer, type DynamicScaffoldingHints } from "@/components/voice/QuickHintsDrawer";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import { SpeakingController } from "@/components/foundation/sentence-builder/SpeakingController";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { toast } from "@/lib/toast";
import type { ConversationTurn, TurnPedagogy, SessionStatus } from "@/types/conversation";
import type { PragmaticSpeechAct, SpeakingObjective } from "@/types/conversation-world";
import { getTopicDisplay } from "@/lib/foundation/sentence-builder/topics";
import {
  calculateSpeechRateWpm,
  calculateTypeTokenRatio,
  SmartVadStateController,
} from "@/lib/audio/smart-vad.engine";
import { independenceFromTier } from "@/lib/conversation/turn-fast-pass.service";
import { cn } from "@/lib/utils";

interface ConversationSessionViewProps {
  sessionId?: string;
}

function formatPlaybackTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function ConversationSessionView({ sessionId }: ConversationSessionViewProps) {
  const router = useRouter();
  const {
    world,
    turns,
    isThinking,
    setThinking,
    addTurn,
    setWorld,
    setTurns,
    sessionConfig,
    sessionStartedAt,
    isSessionCompleted,
    sessionSummary,
    selectedTopicId,
    hintTier,
    setHintTier,
    attemptCount,
    incrementAttempt,
    autoStartMic,
    setAutoStartMic,
    prepCountdown,
    setPrepCountdown,
    isCountingDown,
    setIsCountingDown,
    adaptiveState,
    skillMastery,
    setIsEvaluating,
    finishSessionManually,
  } = useConversationStore();
  const settings = useSettingsStore();
  const unifiedSTT = useUnifiedSTT({ lang: "en-US" });
  const unifiedSTTRef = useRef(unifiedSTT);
  unifiedSTTRef.current = unifiedSTT;
  const tts = useBrowserTTS();

  // ─── Interaction & UI State ───────────────────────────────────────────
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [worldId, setWorldId] = useState<string | null>(sessionId || null);
  const [isLoadingWorld, setIsLoadingWorld] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pendingSpokenText, setPendingSpokenText] = useState<string | null>(null);
  const [pendingDurationMs, setPendingDurationMs] = useState<number>(2500);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [lastTurnFeedback, setLastTurnFeedback] = useState<ConversationTurn | null>(null);

  // ─── Dynamic Hints & Timing Tracker ───────────────────────────────────
  const [dynamicHints, setDynamicHints] = useState<DynamicScaffoldingHints | null>(null);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [aiFinishedSpeechTime, setAiFinishedSpeechTime] = useState<number>(Date.now());
  const [speechStartMs, setSpeechStartMs] = useState<number>(0);

  // ─── Affective & Pragmatic Live State ──────────────────────────────────
  const handsFreeMode = autoStartMic;
  const setHandsFreeMode = setAutoStartMic;
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
    startTimeRef.current = Date.now();
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── World Restore / Cold-start Handler (SQLite Backend) ─────────────
  useEffect(() => {
    const effectiveId = sessionId || (typeof window !== "undefined" ? localStorage.getItem("conversation_world_id") : null);
    if (!effectiveId) return;
    setWorldId(effectiveId);

    // If store already has this exact world loaded, keep it
    if (world && world.scenario) return;

    setIsLoadingWorld(true);
    fetch(`/api/conversation/worlds?id=${effectiveId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.world) {
          const blueprint = data.world.scenario_blueprint
            ? typeof data.world.scenario_blueprint === "string"
              ? JSON.parse(data.world.scenario_blueprint)
              : data.world.scenario_blueprint
            : null;

          if (blueprint) {
            const worldState = {
              scenario: blueprint,
              currentObjective: blueprint.userGoal || blueprint.topic,
              currentTopic: blueprint.topic,
              activeCharacter: {
                mood: "neutral",
                trust: 60,
                patience: 70,
                engagement: 65,
                name: blueprint.character?.name,
                role: blueprint.character?.role,
              },
              conversationFacts: (data.facts || []).map((f: any) => ({
                id: f.id,
                fact: f.fact,
                createdAt: f.created_at || new Date().toISOString(),
              })),
              unresolvedThreads: [],
              activeEvents: data.events || [],
              turnCount: (data.turns || []).length,
              surpriseLevel: "medium",
              pressure: "normal",
            };
            setWorld(worldState as any);
            setTurns(
              (data.turns || []).map((t: any) => ({
                id: t.id,
                role: t.role,
                text: t.text,
                timestamp: t.timestamp,
                pedagogy: t.pedagogy
                  ? typeof t.pedagogy === "string"
                    ? JSON.parse(t.pedagogy)
                    : t.pedagogy
                  : undefined,
              }))
            );
            toast.success("Đã khôi phục hội thoại!", blueprint.topic);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingWorld(false);
      });
  }, [sessionId, world, setWorld, setTurns]);

  // ─── Speaking Controls ───────────────────────────────────────────────
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleStartSpeaking = useCallback(async () => {
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    setIsCountingDown(false);
    setPrepCountdown(null);
    setPendingSpokenText(null);
    soundEffects.playMicStart();
    unifiedSTTRef.current.resetTranscript();
    setSpeechStartMs(Date.now());
    setSessionStatus("recording");
    setIsLifelineVisible(false);

    try {
      await unifiedSTTRef.current.startListening();
    } catch {
      toast.error("Lỗi Microphone", "Vui lòng cho phép truy cập micro.");
      setSessionStatus("listening");
    }
  }, [setIsCountingDown, setPrepCountdown]);

  // ─── Barge-in Interruption Handler ──────────────────────────────────
  const handleBargeIn = useCallback(() => {
    tts.stop();
    isAiSpeakingRef.current = false;
    soundEffects.playMicStart();
    toast.info("⚡ Đã ngắt lời AI (Barge-in)", "AI đã nhường quyền nói cho bạn.");
    handleStartSpeaking();
  }, [tts, handleStartSpeaking]);

  // ─── Audio Synthesis Playback with Hands-Free Auto-Mic ──────────────
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

        if (autoStartMic) {
          setTimeout(() => {
            if (!isProcessing) {
              handleStartSpeaking();
            }
          }, 400);
        }
      }
    },
    [tts, autoStartMic, isProcessing, handleStartSpeaking]
  );

  // Stop mic → pending review
  const handleStopRecord = useCallback(async () => {
    if (!unifiedSTTRef.current.isListening) return;
    soundEffects.playMicStop();
    const durationMs = Math.max(800, Date.now() - speechStartMs);
    try {
      const { text: spokenText, blob } = await unifiedSTTRef.current.stopListening();
      if (blob) {
        (handleStopRecord as unknown as { _lastBlob?: Blob })._lastBlob = blob;
      }
      if (!spokenText) {
        toast.info("Chưa nghe rõ", "Vui lòng nói lại hoặc gõ văn bản.");
        return;
      }
      setPendingSpokenText(spokenText);
      setPendingDurationMs(durationMs);
    } catch {
      toast.error("Không thể ghi âm", "Vui lòng thử lại.");
    } finally {
      setSessionStatus("listening");
    }
  }, [speechStartMs]);

  // ─── Turn Execution Engine ──────────────────────────────────────────
  const executeTurn = useCallback(
    async (spokenText: string, durationMs: number, customBlob?: Blob) => {
      const trimmed = spokenText.trim();
      if (!trimmed || isProcessing) return;

      setIsProcessing(true);
      setThinking(true);
      setSessionStatus("thinking");
      setPendingSpokenText(null);

      const latencyMs = Math.max(0, speechStartMs - aiFinishedSpeechTime);

      // Acoustic Speech Metrics
      const turnWpm = calculateSpeechRateWpm(trimmed, durationMs);
      const turnTtr = calculateTypeTokenRatio(trimmed);

      // Add user turn to dialogue immediately
      const userTurn: ConversationTurn = {
        id: `turn_${Date.now()}_u`,
        role: "user",
        text: trimmed,
        timestamp: new Date().toISOString(),
        pedagogy: {
          latencyMs,
          speechRateWpm: turnWpm,
          lexicalDiversityTtr: turnTtr,
          independenceScore: independenceFromTier(hintTier as 0 | 1 | 2 | 3 | 4),
          hesitationMetrics: {
            durationMs,
            wpm: turnWpm,
            hesitationLevel: latencyMs > 4000 ? "hesitant" : latencyMs > 2500 ? "moderate" : "smooth",
            pauseEstimatedSec: Math.max(0, Math.round(latencyMs / 1000)),
          },
          attemptNumber: attemptCount,
        },
      };
      addTurn(userTurn);

      try {
        const recentTurnsPayload = [...turns, userTurn].slice(-8).map((t) => ({
          role: t.role,
          text: t.text,
        }));

        const provider =
          settings.conversation.provider === "browser" ? "gemini" : settings.conversation.provider;
        const model = settings.conversation.model;

        const res = await fetch("/api/conversation/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            worldId,
            worldState: world,
            transcript: trimmed,
            recentTurns: recentTurnsPayload,
            provider,
            model,
            durationMs,
            timeToFirstWordMs: latencyMs,
            speechDurationMs: durationMs,
            hintTierUsed: hintTier,
            attemptNumber: attemptCount,
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
          nativeReformulation: ped?.nativeReformulation || trimmed,
          turnScore: ped?.turnScore || 85,
          coachTipVi: ped?.coachTipVi,
          speechRateWpm: turnWpm,
          lexicalDiversityTtr: turnTtr,
          meaningScore: ped?.meaningScore,
          fluencyScore: ped?.fluencyScore,
          retrievalScore: ped?.retrievalScore,
        };
        setLastTurnFeedback(userTurn);

        // Update World State (Trust, Patience, Facts)
        if (world && aiResponse?.worldUpdate) {
          const updatedChar = {
            ...world.activeCharacter,
            trust: Math.max(0, Math.min(100, (world.activeCharacter.trust || 60) + (aiResponse.worldUpdate.trustDelta || 0))),
            patience: Math.max(0, Math.min(100, (world.activeCharacter.patience || 70) + (aiResponse.worldUpdate.patienceDelta || 0))),
            mood: aiResponse.worldUpdate.mood || world.activeCharacter.mood,
          };
          setWorld({
            ...world,
            activeCharacter: updatedChar,
            turnCount: (world.turnCount || 0) + 1,
          });
        }

        // Sound Feedback
        const score = ped?.turnScore || 80;
        if (score >= 85) {
          soundEffects.playCorrect();
        } else {
          soundEffects.playAIReady();
        }

        // Add AI Turn
        const aiTurn: ConversationTurn = {
          id: `turn_${Date.now()}_ai`,
          role: "assistant",
          text: aiReplyText,
          timestamp: new Date().toISOString(),
        };
        addTurn(aiTurn);

        // Update Aggregate Stats
        setSessionStats((prev) => ({
          ...prev,
          scores: [...prev.scores, score],
          latencies: [...prev.latencies, latencyMs],
          wpms: [...prev.wpms, turnWpm],
          ttrs: [...prev.ttrs, turnTtr],
          errorsCount: prev.errorsCount + (ped?.grammarIssue ? 1 : 0),
        }));

        // Reset hint tier for next turn
        setHintTier(0);

        // Speak AI Response
        await speak(aiReplyText);
      } catch (err: unknown) {
        toast.error("Lỗi giao tiếp AI", err instanceof Error ? err.message : String(err));
        setSessionStatus("listening");
      } finally {
        setIsProcessing(false);
        setThinking(false);
      }
    },
    [
      isProcessing,
      setThinking,
      speechStartMs,
      aiFinishedSpeechTime,
      hintTier,
      attemptCount,
      addTurn,
      turns,
      settings.conversation.provider,
      settings.conversation.model,
      worldId,
      world,
      setWorld,
      setHintTier,
      speak,
    ]
  );

  const handleConfirmSubmit = useCallback(() => {
    if (pendingSpokenText) {
      executeTurn(pendingSpokenText, pendingDurationMs);
    }
  }, [pendingSpokenText, pendingDurationMs, executeTurn]);

  const handleReRecord = useCallback(() => {
    setPendingSpokenText(null);
    handleStartSpeaking();
  }, [handleStartSpeaking]);

  const handleSayItBetter = useCallback(() => {
    if (lastTurnFeedback?.pedagogy?.nativeReformulation) {
      incrementAttempt(true);
      setTextInput(lastTurnFeedback.pedagogy.nativeReformulation);
      toast.info("Đã nạp câu bản xứ", "Nhấn Micro để nói lại câu chuẩn xác hơn.");
    }
  }, [lastTurnFeedback, incrementAttempt]);

  const handlePracticeVariant = useCallback(() => {
    incrementAttempt(false);
    setLastTurnFeedback(null);
    toast.info("Luyện biến thể", "Hãy thử diễn đạt lại ý vừa rồi bằng một cách nói khác!");
  }, [incrementAttempt]);

  const handleRefreshHints = useCallback(async () => {
    if (!world?.scenario) return;
    setIsLoadingHints(true);
    try {
      const res = await fetch("/api/ai/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "hints",
          context: {
            scenarioGoal: world.scenario.userGoal,
            lastAiUtterance: turns[turns.length - 1]?.text || "",
            turnIndex: turns.length,
          },
        }),
      });
      const data = await res.json();
      if (data.hints) {
        setDynamicHints(data.hints);
      }
    } catch {}
    finally {
      setIsLoadingHints(false);
    }
  }, [world?.scenario, turns]);

  const handleEndSession = useCallback(() => {
    finishSessionManually();
    setShowCompletedModal(true);
  }, [finishSessionManually]);

  // Derived metrics
  const trustPercent = world?.activeCharacter?.trust ?? 60;
  const patiencePercent = world?.activeCharacter?.patience ?? 70;
  const defensivenessPercent = Math.max(0, 100 - trustPercent);
  const avgScore = sessionStats.scores.length
    ? Math.round(sessionStats.scores.reduce((a, b) => a + b, 0) / sessionStats.scores.length)
    : 82;
  const avgLatency = sessionStats.latencies.length
    ? Math.round(sessionStats.latencies.reduce((a, b) => a + b, 0) / sessionStats.latencies.length)
    : 2200;
  const avgWpm = sessionStats.wpms.length
    ? Math.round(sessionStats.wpms.reduce((a, b) => a + b, 0) / sessionStats.wpms.length)
    : 115;
  const avgTtr = sessionStats.ttrs.length
    ? Math.round(sessionStats.ttrs.reduce((a, b) => a + b, 0) / sessionStats.ttrs.length)
    : 68;
  const cefrEstimate = avgScore >= 88 ? "C1" : avgScore >= 75 ? "B2" : "B1";
  const durationMin = Math.max(1, Math.round(elapsedSec / 60));

  if (isLoadingWorld) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 px-4">
        <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
          <Loader2 className="size-6 animate-spin" />
        </div>
        <p className="text-sm font-bold text-foreground">Đang tải lại thế giới hội thoại...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background select-none overflow-hidden">
      {/* ── TOP NAV BAR (Compact 44px) ── */}
      <header className="h-11 border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/conversation">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 rounded-lg text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Kịch bản</span>
            </Button>
          </Link>

          <span className="text-muted-foreground/40 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-foreground truncate max-w-[140px] sm:max-w-[240px] md:max-w-[360px]">
              {world?.scenario?.topic || "Hội Thoại AI"}
            </h1>
            {world?.scenario?.setting && (
              <Badge variant="outline" className="text-[10px] font-mono h-4.5 px-1.5 hidden md:inline-flex truncate max-w-[140px]">
                {world.scenario.setting}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GlobalAiSelector />

          <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/60">
            {formatPlaybackTime(elapsedSec)}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleEndSession}
            className="h-7 px-2.5 rounded-xl text-xs font-bold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
          >
            <CheckCircle2 className="size-3 text-emerald-500" />
            <span>Kết thúc</span>
          </Button>
        </div>
      </header>

      {/* ── MAIN CONTENT (7:5 Ratio, Zero Body Scroll) ── */}
      <main className="flex-1 p-2 sm:p-2.5 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 min-h-0">
        {/* LEFT (7 cols): Dialogue Canvas */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 rounded-2xl sm:rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs">
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

                <div className="flex items-center gap-2.5 text-[10px] font-mono shrink-0">
                  <div className="flex items-center gap-1" title="Độ tin cậy (Trust)">
                    <Heart className="size-2.5 text-rose-500 fill-current" />
                    <span className="font-bold text-rose-600 dark:text-rose-400">{trustPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1" title="Độ kiên nhẫn (Patience)">
                    <Shield className="size-2.5 text-blue-500 fill-current" />
                    <span className="font-bold text-blue-600 dark:text-blue-400">{patiencePercent}%</span>
                  </div>
                  <div className="flex items-center gap-1" title="Rào cản đàm phán">
                    <Flame className="size-2.5 text-amber-500 fill-current" />
                    <span className="font-bold text-amber-600 dark:text-amber-400">{defensivenessPercent}%</span>
                  </div>
                </div>
              </div>

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

          {/* Hidden Objective Alert */}
          {unlockedObjectiveAlert && (
            <div className="mx-3 my-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 flex items-center gap-2 shrink-0 animate-in fade-in duration-300">
              <Trophy className="size-4 text-emerald-500 shrink-0" />
              <div className="min-w-0 flex-1 text-xs">
                <span className="font-bold">Mục tiêu ẩn mở khóa: </span>
                <span>{unlockedObjectiveAlert.description}</span>
              </div>
            </div>
          )}

          {/* Scrollable Dialogue Turn Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            <TurnList turns={turns} />
            <div ref={turnsEndRef} />
          </div>
        </div>

        {/* RIGHT (5 cols): Voice Orb, Coach Controller & Scaffolding */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 gap-2 overflow-hidden">
          {/* Voice Orb Interaction Center */}
          <div className="shrink-0 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-border/80 bg-card flex flex-col items-center justify-center gap-2 shadow-xs relative">
            <div className="flex items-center justify-between w-full">
              <StatusBadge status={sessionStatus} />
              {sessionStatus === "speaking" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBargeIn}
                  className="h-6 px-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10 gap-1 animate-pulse"
                >
                  <span>⚡ Ngắt lời</span>
                </Button>
              )}
            </div>

            <div className="py-1">
              <VoiceOrb status={sessionStatus as VoiceOrbStatus} />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {sessionStatus === "speaking"
                ? "AI đang nói... Bạn có thể ngắt lời bất cứ lúc nào."
                : sessionStatus === "recording"
                ? "Đang thu âm... Hãy nói tự nhiên vào micro."
                : isProcessing
                ? "AI đang suy nghĩ phản hồi..."
                : "Bấm Micro hoặc Phím Cách (Space) để bắt đầu nói."}
            </p>
          </div>

          {/* Interactive Speech Input & Instant Pedagogical Feedback */}
          <div className="shrink-0">
            {lastTurnFeedback ? (
              <TurnFeedbackCard
                turn={lastTurnFeedback}
                onContinue={() => setLastTurnFeedback(null)}
                onSayItBetter={handleSayItBetter}
                onPracticeVariant={handlePracticeVariant}
              />
            ) : (
              <SpeakingController
                compact
                status={
                  isProcessing || unifiedSTT.isTranscribing
                    ? "processing"
                    : unifiedSTT.isListening
                    ? "recording"
                    : "idle"
                }
                isListening={unifiedSTT.isListening}
                liveTranscript={unifiedSTT.fullTranscript}
                durationMs={recordingDurationMs || unifiedSTT.audioRecorder.durationMs}
                autoStartMic={autoStartMic}
                onToggleAutoStartMic={setAutoStartMic}
                onStartRecord={handleStartSpeaking}
                onStopRecord={handleStopRecord}
                onSubmitTextFallback={(text) => executeTurn(text, 2500)}
                onOpenHints={() => setHintTier(((hintTier + 1) % 5) as 0 | 1 | 2 | 3 | 4)}
                isEvaluating={isProcessing || unifiedSTT.isTranscribing}
                onResetLiveTranscript={() => unifiedSTT.resetTranscript()}
                pendingText={pendingSpokenText}
                onConfirmSubmit={handleConfirmSubmit}
                onReRecord={handleReRecord}
              />
            )}
          </div>

          {/* Quick Hints 3-Tier Scaffolding Embedded Panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <QuickHintsDrawer
              scenarioGoal={world?.scenario?.userGoal}
              hints={dynamicHints}
              isLoadingHints={isLoadingHints}
              onRefreshHints={handleRefreshHints}
              currentHintTier={hintTier}
              onSelectHintTier={(t) => setHintTier(t as 0 | 1 | 2 | 3 | 4)}
              onSelectHint={(text) => {
                setTextInput(text);
                toast.success("Đã nạp mẫu câu!", text);
              }}
            />
          </div>
        </div>
      </main>

      {/* ── Footer shortcuts ── */}
      <footer className="px-3 sm:px-4 py-1.5 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span>[Space]: {pendingSpokenText ? "Thu âm lại" : unifiedSTT.isListening ? "Dừng" : lastTurnFeedback ? "Nói lại" : "Thu âm"}</span>
          <span>•</span>
          <span>[Backspace]: Xoá nói lại</span>
          <span>•</span>
          <span>[H]: Gợi ý ({hintTier}/4)</span>
          {pendingSpokenText && !isProcessing && (
            <>
              <span>•</span>
              <span className="text-primary font-bold">[Enter]: Nộp bài</span>
            </>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span>Mastery: {skillMastery.overallMastery}%</span>
          <span>·</span>
          <span>Độ khó: {adaptiveState.currentDifficulty}/10</span>
        </div>
      </footer>

      {/* ── SESSION COMPLETED MODAL ── */}
      <SessionCompletedModal
        open={showCompletedModal || isSessionCompleted}
        onOpenChange={setShowCompletedModal}
        sessionTitle={world?.scenario?.topic || "Thế Giới Nhập Vai"}
        durationMinutes={durationMin}
        turnsCount={sessionSummary?.totalTurns ?? turns.length}
        avgTtfwMs={sessionSummary?.averageLatencyMs ?? avgLatency}
        overallScore={sessionSummary?.averageOverallScore ?? avgScore}
        errorsDetected={sessionSummary?.totalErrorsCount ?? sessionStats.errorsCount}
        wpm={sessionSummary?.averageWpm ?? avgWpm}
        ttrRatio={sessionSummary?.averageTtr ?? avgTtr}
        twistResolved={sessionSummary?.twistResolved ?? !!unlockedObjectiveAlert}
        cefrEstimate={sessionSummary?.cefrBandEstimate ?? cefrEstimate}
        firstAttemptAccuracy={sessionSummary?.firstAttemptAccuracy}
        averageIndependence={sessionSummary?.averageIndependence}
        masteryDelta={sessionSummary?.masteryDelta}
        topWeakness={sessionSummary?.topWeaknessIdentified}
        recommendedNextAction={sessionSummary?.recommendedNextAction}
        onRestart={() => router.push("/conversation")}
      />
    </div>
  );
}
