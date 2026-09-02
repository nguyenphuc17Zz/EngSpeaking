// Baseline service — 7 tasks (full), structured evaluation
import { generateTextWithRouting } from "@/lib/ai";
import { BASELINE_SYSTEM, BASELINE_EVAL_SYSTEM, buildBaselineUserPrompt, buildBaselineEvalUserPrompt } from "@/lib/foundation/prompts/baseline";
import type { FoundationBaseline } from "@/types/foundation";

function mockTasks(): Array<{ id: string; prompt: string; skill: string; topic: string }> {
  return [
    { id: "t1", prompt: "Please introduce yourself in 1-2 sentences.", skill: "sentence_retrieval", topic: "self" },
    { id: "t2", prompt: "What do you usually do in the morning?", skill: "sentence_retrieval", topic: "daily routine" },
    { id: "t3", prompt: "What did you do last weekend?", skill: "grammar_in_speech", topic: "past activity" },
    { id: "t4", prompt: "What do you like to do in your free time and why?", skill: "active_vocabulary", topic: "preferences" },
    { id: "t5", prompt: "Explain how you usually go to work or school.", skill: "sentence_construction", topic: "explanation" },
    { id: "t6", prompt: "What do you think about working from home versus working at the office?", skill: "grammar_in_speech", topic: "opinion" },
    { id: "t7", prompt: "Tell me more about one of your hobbies — add where, when, and why you enjoy it.", skill: "sentence_expansion", topic: "expansion" },
  ];
}

function mockBaselineEval(all: Array<{ id: string; prompt: string; skill: string; transcript: string; durationMs?: number; timeToFirstWordMs?: number }>): Omit<FoundationBaseline, "id" | "createdAt" | "tasks"> & { tasks: FoundationBaseline["tasks"] } {
  // Simple heuristic avg
  const scored = all.map((t) => {
    const len = t.transcript.trim().length;
    const words = t.transcript.trim().split(/\s+/).filter(Boolean).length;
    const score = len < 5 ? 30 : len < 20 ? 55 : Math.min(85, 60 + words * 2);
    return { ...t, score };
  });
  const avg = Math.round(scored.reduce((s, x) => s + (x.score || 50), 0) / scored.length);
  return {
    responseSpeed: Math.min(85, avg + 5),
    sentenceProduction: avg,
    fluency: Math.max(30, avg - 5),
    vocabularyRetrieval: avg,
    grammarInSpeech: Math.max(30, avg - 3),
    confidence: Math.max(35, avg - 8),
    expansionAbility: scored[6]?.score || 50,
    recoveryAbility: 60,
    overall: avg,
    levelSuggestion: avg < 40 ? 2 : avg < 60 ? 4 : avg < 75 ? 6 : 8,
    tasks: scored.map((s) => ({ prompt: s.prompt, skill: s.skill as FoundationBaseline["tasks"][number]["skill"], transcript: s.transcript, score: s.score })),
  };
}

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(JSON.parse(JSON.stringify(m[0]))); } catch {
      try { return JSON.parse(m[0]); } catch {}
    }
    const arrMatch = t.match(/\[[\s\S]*\]/);
    if (arrMatch) try { return JSON.parse(arrMatch[0]); } catch {}
    return null;
  }
}

export async function generateBaselineTasks(opts?: { speechBank?: string[]; provider?: string; model?: string }): Promise<Array<{ id: string; prompt: string; skill: string; topic: string }>> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  if (provider === "mock") return mockTasks();
  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: buildBaselineUserPrompt({ speechBank: opts?.speechBank }) }],
        systemInstruction: BASELINE_SYSTEM,
        temperature: 0.6,
        maxOutputTokens: 800,
      },
    });
    const parsed = extractJson(res.text) as { tasks?: Array<{ id: string; prompt: string; skill: string; topic?: string }> } | null;
    if (parsed?.tasks && Array.isArray(parsed.tasks) && parsed.tasks.length >= 5) {
      return parsed.tasks.slice(0, 8).map((t, i) => ({ id: t.id || `t${i + 1}`, prompt: t.prompt, skill: t.skill || "sentence_retrieval", topic: t.topic || "general" }));
    }
    // fallback if AI returned array directly
    const arr = extractJson(res.text) as unknown;
    if (Array.isArray(arr) && arr.length >= 5) {
      return (arr as Array<{ prompt: string; skill: string }>).slice(0, 8).map((t, i) => ({ id: `t${i + 1}`, prompt: t.prompt, skill: t.skill || "sentence_retrieval", topic: "general" }));
    }
    throw new Error("Invalid tasks");
  } catch {
    return mockTasks();
  }
}

export async function evaluateBaseline(
  tasks: Array<{ id: string; prompt: string; skill: string; transcript: string; durationMs?: number; timeToFirstWordMs?: number }>,
  opts?: { provider?: string; model?: string }
): Promise<Omit<FoundationBaseline, "id" | "createdAt" | "tasks"> & { tasks: FoundationBaseline["tasks"]; perTask?: unknown }> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  if (provider === "mock") return mockBaselineEval(tasks);

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: buildBaselineEvalUserPrompt(tasks) }],
        systemInstruction: BASELINE_EVAL_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 800,
      },
    });
    const parsed = extractJson(res.text) as Record<string, unknown> | null;
    if (parsed && typeof parsed.overall === "number") {
      const p = parsed as unknown as { responseSpeed: number; sentenceProduction: number; fluency: number; vocabularyRetrieval: number; grammarInSpeech: number; confidence: number; expansionAbility: number; recoveryAbility: number; overall: number; levelSuggestion: number; perTask?: Array<{ id: string; score: number; note?: string }> };
      const perTaskMap = new Map((p.perTask || []).map((x) => [x.id, x]));
      return {
        responseSpeed: clamp(p.responseSpeed),
        sentenceProduction: clamp(p.sentenceProduction),
        fluency: clamp(p.fluency),
        vocabularyRetrieval: clamp(p.vocabularyRetrieval),
        grammarInSpeech: clamp(p.grammarInSpeech),
        confidence: clamp(p.confidence),
        expansionAbility: clamp(p.expansionAbility),
        recoveryAbility: clamp(p.recoveryAbility),
        overall: clamp(p.overall),
        levelSuggestion: Math.max(0, Math.min(10, Math.round(p.levelSuggestion || 4))) as FoundationBaseline["levelSuggestion"],
        tasks: tasks.map((t) => ({ prompt: t.prompt, skill: t.skill as FoundationBaseline["tasks"][number]["skill"], transcript: t.transcript, score: (perTaskMap.get(t.id) as { score?: number })?.score ?? 60 })),
      };
    }
    throw new Error("Invalid eval");
  } catch {
    return mockBaselineEval(tasks);
  }
}

function clamp(n: unknown): number {
  const v = typeof n === "number" ? n : 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}
