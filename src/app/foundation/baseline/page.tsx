"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Play, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSettingsStore } from "@/stores/settings-store";
import { transcribeViaServer } from "@/lib/stt/service";

type BaselineTask = { id: string; prompt: string; skill: string; topic: string; transcript?: string; durationMs?: number; timeToFirstWordMs?: number };

export default function BaselinePage() {
  const [tasks, setTasks] = useState<BaselineTask[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [baseline, setBaseline] = useState<Record<string, unknown> | null>(null);
  const [textFallback, setTextFallback] = useState("");
  const recorder = useAudioRecorder();
  const speech = useSpeechRecognition("en-US");
  const settings = useSettingsStore();
  const startTimeRef = useRef<number>(0);
  const speechStartRef = useRef<number>(0);

  const generate = useCallback(async () => {
    setGenerating(true);
    setBaseline(null);
    setTasks([]);
    setCurrentIdx(0);
    try {
      const res = await fetch("/api/foundation/baseline", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", provider: settings.conversation.provider, model: settings.conversation.model }),
      });
      const data = await res.json();
      setTasks(data.tasks || []);
    } finally { setGenerating(false); }
  }, [settings.conversation.provider, settings.conversation.model]);

  const startRec = async () => {
    startTimeRef.current = Date.now();
    speechStartRef.current = Date.now();
    speech.resetTranscript();
    const isBrowserSTT = (settings.stt?.provider || "browser") === "browser";
    try { await recorder.start(); } catch {}
    if (isBrowserSTT) {
      speech.startListening();
    }
  };
  const stopRec = async () => {
    speech.stopListening();
    const sttProvider = settings.stt?.provider || "browser";
    const sttModel =
      settings.stt?.model ||
      (sttProvider === "groq" ? "whisper-large-v3" : "onnx-community/whisper-tiny.en");

    let transcript = "";
    let durationMs: number | undefined;
    try {
      const rec = await recorder.stop().catch(() => null);
      durationMs = rec?.durationMs;
      if (sttProvider !== "browser" && rec?.blob) {
        try {
          const res = await transcribeViaServer(rec.blob, {
            provider: sttProvider === "auto" ? "whisper-local" : sttProvider,
            model: sttModel,
            language: "en-US",
          });
          transcript = res.text.trim();
        } catch {
          transcript = speech.fullTranscript.trim() || speech.transcript.trim() || textFallback.trim();
        }
      } else {
        await new Promise((r) => setTimeout(r, 300));
        transcript = speech.fullTranscript.trim() || speech.transcript.trim() || textFallback.trim();
      }
    } catch {
      transcript = speech.fullTranscript.trim() || speech.transcript.trim() || textFallback.trim();
    }

    const timeToFirstWordMs = transcript ? Date.now() - speechStartRef.current : undefined;
    const updated = tasks.map((t, i) => i === currentIdx ? { ...t, transcript, durationMs, timeToFirstWordMs } : t);
    setTasks(updated);
    speech.resetTranscript();
    setTextFallback("");
  };

  const completeBaseline = async () => {
    const payload = tasks.map((t) => ({ id: t.id, prompt: t.prompt, skill: t.skill, transcript: t.transcript || "", durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs }));
    if (payload.some((p) => !p.transcript)) {
      alert("Vui lòng hoàn thành hết các task (nói hoặc gõ).");
      return;
    }
    setEvaluating(true);
    try {
      const res = await fetch("/api/foundation/baseline", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate", tasks: payload, provider: settings.conversation.provider, model: settings.conversation.model }),
      });
      const data = await res.json();
      setBaseline(data.baseline);
      // Persist to local profile via progress service
      try {
        const { updateFoundationProfileFromScore } = await import("@/lib/foundation/services/progress.service");
        if (data.baseline?.overall) {
          updateFoundationProfileFromScore("sentence_retrieval", data.baseline.overall);
        }
      } catch {}
    } finally { setEvaluating(false); }
  };

  const current = tasks[currentIdx];
  const doneCount = tasks.filter((t) => !!t.transcript).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Baseline Kiểm tra nền tảng</CardTitle>
          <CardDescription>7 nhiệm vụ động (§7) — đánh giá response_speed, sentence_production, fluency, ... Không phải điểm CEFR chính thức.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={generate} disabled={generating} className="gap-1">{generating ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Tạo baseline</Button>
          {tasks.length > 0 && <Badge variant="secondary">{doneCount}/{tasks.length} hoàn thành</Badge>}
        </CardContent>
      </Card>

      {current && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Task {currentIdx + 1}/{tasks.length} — {current.skill}</CardTitle>
            <CardDescription className="text-sm font-medium text-foreground">{current.prompt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2">
                <Button size="lg" variant={recorder.status === "recording" || speech.isListening ? "destructive" : "default"} onClick={recorder.status === "recording" || speech.isListening ? stopRec : startRec} className="gap-1">
                  {recorder.status === "recording" || speech.isListening ? <><Square className="size-4" /> Dừng</> : <><Mic className="size-4" /> Ghi âm</>}
                </Button>
              </div>
              {speech.isListening && <p className="text-xs text-muted-foreground">Đang nghe... {speech.fullTranscript}</p>}
              {!speech.isSupported && <p className="text-xs text-amber-600">Browser không hỗ trợ Web Speech — hãy gõ.</p>}
              <div className="w-full max-w-xl space-y-1">
                <p className="text-xs text-muted-foreground">Hoặc gõ (song song Voice+Type):</p>
                <Textarea value={current.transcript || textFallback} onChange={(e) => setTextFallback(e.target.value)} placeholder="Gõ câu trả lời tiếng Anh..." rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const t = textFallback.trim();
                    if (t) {
                      setTasks((prev) => prev.map((x, i) => i === currentIdx ? { ...x, transcript: t } : x));
                      setTextFallback("");
                    }
                  }} disabled={!textFallback.trim()}>Lưu câu gõ</Button>
                  {current.transcript && <Badge variant="secondary" className="text-xs">Đã lưu: {current.transcript.slice(0, 40)}</Badge>}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)}>Trước</Button>
              {currentIdx < tasks.length - 1 ? (
                <Button size="sm" onClick={() => setCurrentIdx((i) => i + 1)} disabled={!current.transcript}>Tiếp</Button>
              ) : (
                <Button size="sm" onClick={completeBaseline} disabled={evaluating || doneCount < tasks.length}>
                  {evaluating ? <Loader2 className="size-4 animate-spin" /> : "Hoàn tất & Chấm"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {baseline && (
        <Card>
          <CardHeader><CardTitle className="text-base">Kết quả Baseline</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(baseline as Record<string, unknown>).filter(([k]) => ["responseSpeed","sentenceProduction","fluency","vocabularyRetrieval","grammarInSpeech","confidence","expansionAbility","recoveryAbility","overall"].includes(k)).map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <div className="flex justify-between text-xs"><span>{k}</span><span className="font-mono">{String(v)}</span></div>
                  <Progress value={Number(v)} />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Level gợi ý: {(baseline as { levelSuggestion?: number }).levelSuggestion} (0 Listen → 10 Micro Monologue)</p>
            <div className="space-y-1">
              {((baseline as { tasks?: Array<{ prompt: string; skill: string; transcript: string; score?: number }> }).tasks || []).map((t, i) => (
                <div key={i} className="rounded border p-2 text-xs"><span className="font-medium">{t.prompt}</span> — <span className="text-muted-foreground">{t.transcript}</span> {t.score != null && <Badge variant="outline" className="ml-1 text-[11px]">{t.score}</Badge>}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
