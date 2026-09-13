"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mic,
  Square,
  Play,
  RotateCcw,
  Lightbulb,
  SkipForward,
  Volume2,
  ArrowLeft,
  Sparkles,
  Trophy,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { ExerciseCard } from "@/components/foundation/ExerciseCard";
import { ScorePanel } from "@/components/foundation/ScorePanel";
import { useFoundationStore } from "@/stores/foundation-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useBrowserTTS } from "@/hooks/useBrowserTTS";
import { MicButton } from "@/components/voice/MicButton";
import { SessionCompletedModal } from "@/components/voice/SessionCompletedModal";
import { soundEffects } from "@/lib/audio/audio-chimes";
import { transcribeViaServer } from "@/lib/stt/service";
import { getLevelForSkill } from "@/lib/foundation/skills/taxonomy";
import { updateFoundationProfileFromScore } from "@/lib/foundation/services/progress.service";
import type { FoundationExercise, FoundationExerciseType, FoundationSkill } from "@/types/foundation";
import { GlobalAiSelector } from "@/components/common/GlobalAiSelector";

const ALL_TYPES: FoundationExerciseType[] = [
  "repeat",
  "shadow",
  "chunk_practice",
  "pattern_practice",
  "substitution",
  "one_sentence",
  "answer_expansion",
  "controlled_speaking",
  "timed_speaking",
  "rapid_response",
  "follow_up",
  "stimulus_speaking",
  "translation_bridge",
  "vocabulary_activation",
  "grammar_speaking",
  "pronunciation_micro",
  "confidence",
  "recovery",
  "self_correction",
  "repeat_until_better",
  "micro_monologue",
];

const ALL_SKILLS: FoundationSkill[] = [
  "sentence_retrieval",
  "chunk_retrieval",
  "sentence_construction",
  "sentence_expansion",
  "substitution",
  "speaking_repetition",
  "shadowing",
  "controlled_speaking",
  "response_speed",
  "active_vocabulary",
  "grammar_in_speech",
  "conversation_followup",
  "micro_monologue",
  "recovery",
  "self_correction",
  "confidence",
];

function PracticeInner() {
  const searchParams = useSearchParams();
  const initialMode =
    (searchParams.get("mode") as "learn" | "practice" | "challenge" | "daily") || "practice";

  const {
    currentExercise,
    currentSession,
    lastEvaluation,
    setExercise,
    setSession,
    setEvaluation,
    pushHistory,
    setGenerating,
    setEvaluating,
    hintLevel,
    currentHint,
    setHint,
    isGenerating,
    isEvaluating,
  } = useFoundationStore();

  const settings = useSettingsStore();
  const recorder = useAudioRecorder();
  const speech = useSpeechRecognition("en-US");
  const tts = useBrowserTTS();

  const [mode, setMode] = useState<typeof initialMode>(initialMode);
  const [selectedSkill, setSelectedSkill] = useState<FoundationSkill>("sentence_retrieval");
  const [selectedType, setSelectedType] = useState<FoundationExerciseType>("one_sentence");
  const [difficulty, setDifficulty] = useState(5);
  const [autoMode, setAutoMode] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined);
  const [ttfwMs, setTtfwMs] = useState<number | undefined>(undefined);
  const [timerSec, setTimerSec] = useState<number | null>(null);
  const [playSpeed, setPlaySpeed] = useState<0.75 | 1 | 1.25>(1);
  const [completedCount, setCompletedCount] = useState(0);
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = useCallback(
    async (opts?: {
      skill?: FoundationSkill;
      type?: FoundationExerciseType;
      difficulty?: number;
      useAI?: boolean;
    }) => {
      setGenerating(true);
      setHint(null as unknown as number, null);
      try {
        const provider =
          settings.conversation.provider === "browser"
            ? "gemini"
            : settings.conversation.provider;
        const model = settings.conversation.model;
        const body = {
          skill: opts?.skill || selectedSkill,
          type: opts?.type || selectedType,
          difficulty: opts?.difficulty ?? difficulty,
          level: getLevelForSkill(
            opts?.skill || selectedSkill,
            opts?.difficulty ?? difficulty
          ),
          mode,
          provider,
          model,
        };
        const res = await fetch("/api/foundation/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.exercise) {
          setExercise(data.exercise);
          try {
            const sessRes = await fetch("/api/foundation/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                exerciseId: data.exercise.id,
                mode,
                skill: data.exercise.skill,
                difficulty: data.exercise.difficulty,
                exerciseType: data.exercise.type,
              }),
            });
            const sData = await sessRes.json();
            if (sData.session) setSession(sData.session);
          } catch {}
          if (
            ["repeat", "shadow", "pronunciation_micro"].includes(data.exercise.type) &&
            data.exercise.prompt
          ) {
            tts.stop();
            try {
              await tts.speak(data.exercise.prompt, { lang: "en-US", rate: playSpeed });
            } catch {}
          }
        }
      } finally {
        setGenerating(false);
      }
    },
    [
      selectedSkill,
      selectedType,
      difficulty,
      mode,
      settings.conversation.provider,
      settings.conversation.model,
      setExercise,
      setSession,
      setGenerating,
      setHint,
      tts,
      playSpeed,
    ]
  );

  useEffect(() => {
    if (!currentExercise) generate();
  }, []);

  const startTimer = useCallback((sec: number) => {
    setTimerSec(sec);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerSec((prev) => {
        if (prev == null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTimerSec(null);
  }, []);

  useEffect(() => {
    if (
      currentExercise?.type === "timed_speaking" ||
      currentExercise?.type === "micro_monologue"
    ) {
      if (currentExercise.expectedDurationSec) startTimer(currentExercise.expectedDurationSec);
    } else if (currentExercise?.type === "rapid_response") {
      startTimer(3);
    } else {
      stopTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentExercise, startTimer, stopTimer]);



  const startRecording = async () => {
    soundEffects.playMicStart();
    startTimeRef.current = Date.now();
    setTranscript("");
    setDurationMs(undefined);
    setTtfwMs(undefined);
    speech.resetTranscript();
    const sttProvider = settings.stt?.provider || "browser";
    try {
      await recorder.start();
    } catch {}
    if (sttProvider === "browser") {
      speech.startListening();
    }
  };

  const stopRecording = async () => {
    soundEffects.playMicStop();
    const sttProvider = settings.stt?.provider || "browser";
    const sttModel =
      settings.stt?.model ||
      (sttProvider === "groq" ? "whisper-large-v3" : "onnx-community/whisper-tiny.en");

    speech.stopListening();
    let tr = "";
    let dur: number | undefined;

    try {
      const rec = await recorder.stop().catch(() => null);
      dur = rec?.durationMs;
      if (sttProvider !== "browser" && rec?.blob) {
        try {
          const res = await transcribeViaServer(rec.blob, {
            provider: sttProvider === "auto" ? "whisper-local" : sttProvider,
            model: sttModel,
            language: "en-US",
          });
          tr = res.text.trim();
        } catch {
          tr = speech.fullTranscript.trim() || speech.transcript.trim() || textInput.trim();
        }
      } else {
        await new Promise((r) => setTimeout(r, 350));
        tr = speech.fullTranscript.trim() || speech.transcript.trim() || textInput.trim();
      }
    } catch {
      tr = speech.fullTranscript.trim() || speech.transcript.trim() || textInput.trim();
    }

    const ttfw = tr ? (dur ? Math.min(dur, 3000) : Date.now() - startTimeRef.current) : undefined;
    setTranscript(tr);
    setDurationMs(dur);
    setTtfwMs(ttfw);
    speech.resetTranscript();
  };

  const handleEvaluate = async () => {
    const tr = transcript || textInput.trim();
    if (!tr || !currentExercise) return;
    setEvaluating(true);
    try {
      const res = await fetch("/api/foundation/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise: currentExercise,
          transcript: tr,
          rawTranscript: tr,
          durationMs,
          timeToFirstWordMs: ttfwMs,
          hintsUsed: hintLevel,
          hintLevel,
          provider:
            settings.conversation.provider === "browser"
              ? "gemini"
              : settings.conversation.provider,
          model: settings.conversation.model,
        }),
      });
      const data = await res.json();
      if (data.evaluation) {
        soundEffects.playAIReady();
        setEvaluation(data.evaluation);
        setCompletedCount((c) => c + 1);
        try {
          const sessId = currentSession?.id || `local_${Date.now()}`;
          await fetch(`/api/foundation/sessions/${sessId}/attempts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              exerciseId: currentExercise.id,
              transcript: tr,
              rawTranscript: tr,
              durationMs,
              timeToFirstWordMs: ttfwMs,
              hintsUsed: hintLevel,
              hintLevel,
              scoreOverall: data.evaluation.score.overall,
              completed: true,
            }),
          });
        } catch {}
        updateFoundationProfileFromScore(currentExercise.skill, data.evaluation.score.overall, {
          translationDependency: currentExercise.type === "translation_bridge" ? 70 : undefined,
        });
        pushHistory({
          exercise: currentExercise,
          evaluation: data.evaluation,
          attempt: {
            id: `att_${Date.now()}`,
            exerciseId: currentExercise.id,
            transcript: tr,
            rawTranscript: tr,
            durationMs,
            timeToFirstWordMs: ttfwMs,
            hintsUsed: hintLevel,
            hintLevel,
            score: data.evaluation.score,
            feedback: data.evaluation.feedback,
            completed: true,
            createdAt: new Date().toISOString(),
          },
        });
      }
    } finally {
      setEvaluating(false);
    }
  };

  const handleHint = async () => {
    if (!currentExercise) return;
    const nextLevel = Math.min(4, hintLevel + 1) as number;
    const res = await fetch("/api/foundation/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise: currentExercise,
        transcript,
        hintLevel: nextLevel,
        attemptsCount: 1,
        provider:
          settings.conversation.provider === "browser"
            ? "gemini"
            : settings.conversation.provider,
        model: settings.conversation.model,
      }),
    });
    const data = await res.json();
    if (data.hint) setHint(nextLevel, data.hint.hint || data.hint);
  };

  const handleNext = async () => {
    if (completedCount >= 5 && mode === "daily") {
      setShowCompletedModal(true);
      return;
    }
    setTranscript("");
    setTextInput("");
    setEvaluation(null);
    setHint(0, null);
    await generate();
  };

  const handleRetry = () => {
    setTranscript("");
    setTextInput("");
    setEvaluation(null);
  };

  const handleReplay = async () => {
    if (!currentExercise?.prompt) return;
    tts.stop();
    await tts.speak(currentExercise.prompt, { lang: "en-US", rate: playSpeed });
  };

  const isRecording = recorder.status === "recording" || speech.isListening;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/foundation">
            <Button variant="ghost" size="icon-xs" className="rounded-xl text-muted-foreground">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-foreground">Phòng luyện Drill Phản xạ</h1>
              <Badge variant="default" className="text-[10px] uppercase">
                {mode}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Bài số {completedCount + 1} • {currentExercise?.skill || selectedSkill}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlobalAiSelector size="sm" />
          <Badge variant="secondary" className="font-mono text-xs py-1 px-2.5">
            Độ khó: {difficulty}/10
          </Badge>
          {completedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompletedModal(true)}
              className="text-xs rounded-xl h-8"
            >
              <Trophy className="size-3.5 mr-1 text-amber-500" />
              <span>Hoàn thành ({completedCount})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Exercise Card */}
      {isGenerating ? (
        <Card className="rounded-3xl border border-dashed border-border/80 bg-card">
          <CardContent className="py-16 text-center space-y-3">
            <Loader2 className="size-8 animate-spin text-primary mx-auto" />
            <p className="text-sm font-semibold text-foreground">Đang thiết kế bài tập phù hợp...</p>
            <p className="text-xs text-muted-foreground">AI đang tối ưu câu luyện theo độ khó {difficulty}/10</p>
          </CardContent>
        </Card>
      ) : currentExercise ? (
        <div className="space-y-6">
          {/* Exercise Prompt Presentation */}
          <ExerciseCard exercise={currentExercise} />

          {/* Shadowing & Speed Control Bar */}
          {(currentExercise.type === "repeat" ||
            currentExercise.type === "shadow" ||
            currentExercise.type === "pronunciation_micro") && (
            <Card className="rounded-2xl border border-border/70 bg-muted/20 shadow-xs">
              <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReplay}
                    className="gap-1.5 rounded-xl text-xs h-8 font-semibold"
                  >
                    <Volume2 className="size-3.5 text-primary" />
                    <span>Nghe lại phát âm</span>
                  </Button>
                  <Select
                    value={String(playSpeed)}
                    onValueChange={(v: string | null) =>
                      v && setPlaySpeed(parseFloat(v) as 0.75 | 1 | 1.25)
                    }
                  >
                    <SelectTrigger className="w-[100px] rounded-xl h-8 text-xs">
                      <span>{playSpeed}x Tốc độ</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.75">0.75x (Chậm)</SelectItem>
                      <SelectItem value="1">1.0x (Chuẩn)</SelectItem>
                      <SelectItem value="1.25">1.25x (Nhanh)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-xs text-muted-foreground">
                  💡 Nghe 0.75x để bắt chuẩn nối âm trước khi nói lại
                </span>
              </CardContent>
            </Card>
          )}

          {/* Timer Card for Timed Tasks */}
          {timerSec != null && (
            <Card className="rounded-2xl border-amber-500/40 bg-amber-500/10 text-center p-4">
              <span className="text-3xl font-mono font-black text-amber-600 dark:text-amber-400">
                {timerSec}s
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {currentExercise.type === "rapid_response"
                  ? "Bắt đầu nói trong 3 giây để kích hoạt phản xạ!"
                  : `Nói liên tục — mục tiêu ${currentExercise.expectedDurationSec}s`}
              </p>
            </Card>
          )}

          {/* User Voice Input & Action Panel */}
          <Card className="rounded-3xl border-primary/20 bg-card shadow-xs">
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-col items-center gap-3">
                <MicButton
                  status={isEvaluating ? "processing" : isRecording ? "recording" : "idle"}
                  onStart={startRecording}
                  onStop={stopRecording}
                  disabled={isEvaluating}
                  durationMs={recorder.durationMs}
                  size="lg"
                />

                {/* Live Transcript text */}
                {(speech.isListening || recorder.status === "recording") && speech.fullTranscript && (
                  <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold block mb-0.5">
                      Đang nhận diện giọng nói:
                    </span>
                    <p className="text-foreground italic font-medium">"{speech.fullTranscript}"</p>
                  </div>
                )}
              </div>

              {/* Text fallback */}
              <div className="space-y-1.5 max-w-xl mx-auto">
                <Label className="text-xs font-semibold">Câu bạn vừa nói / gõ:</Label>
                <Textarea
                  value={transcript || textInput}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                    setTranscript(e.target.value);
                  }}
                  placeholder="Ghi âm bằng micro hoặc gõ câu trả lời vào đây..."
                  rows={2}
                  className="rounded-2xl text-xs bg-muted/20 resize-none"
                />
              </div>

              {/* Hint & Evaluate Button Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={handleEvaluate}
                  disabled={(!transcript && !textInput.trim()) || isEvaluating}
                  className="gap-2 px-8 h-11 rounded-2xl font-bold shadow-md shadow-primary/25"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Đang chấm điểm phản xạ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4 fill-current" />
                      <span>Chấm điểm bài làm</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHint}
                  className="gap-1.5 rounded-xl h-11 px-4 text-xs font-semibold"
                >
                  <Lightbulb className="size-3.5 text-amber-500" />
                  <span>Gợi ý ({hintLevel}/4)</span>
                </Button>
              </div>

              {currentHint && (
                <div className="max-w-lg mx-auto p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200">
                  <span className="font-bold block mb-0.5">Gợi ý Level {hintLevel}:</span>
                  {currentHint}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instant Evaluation Feedback Panel */}
          {lastEvaluation && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <ScorePanel evaluation={lastEvaluation} />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="gap-2 rounded-2xl h-11 px-5"
                >
                  <RotateCcw className="size-4" />
                  <span>Thử lại câu này (Repeat)</span>
                </Button>
                <Button
                  onClick={handleNext}
                  className="gap-2 rounded-2xl h-11 px-6 font-bold shadow-md shadow-primary/25"
                >
                  <span>Bài tiếp theo</span>
                  <SkipForward className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Completion Celebration Modal */}
      <SessionCompletedModal
        open={showCompletedModal}
        onOpenChange={setShowCompletedModal}
        sessionTitle={`Hoàn thành Drill: ${selectedSkill}`}
        turnsCount={completedCount}
      />
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span>Đang tải phòng luyện tập...</span>
        </div>
      }
    >
      <PracticeInner />
    </Suspense>
  );
}
