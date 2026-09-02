// Hybrid evaluation pipeline §57, §88 — deterministic + 2-4 AI calls combined
import { computeSessionMetrics, computeTurnMetrics } from "./engines/deterministic-metrics";
import { analyzeFluency } from "./engines/fluency-analyzer";
import { analyzeGrammar } from "./engines/grammar-analyzer";
import { analyzeVocabulary } from "./engines/vocabulary-analyzer";
import { analyzeNaturalness } from "./engines/naturalness-analyzer";
import { analyzeResponseSpeed } from "./engines/response-speed-analyzer";
import { analyzeCommunication } from "./engines/communication-analyzer";
import { analyzeConfidence } from "./engines/confidence-analyzer";
import { analyzePronunciation } from "./engines/pronunciation-analyzer";
import { aggregateSession } from "./engines/session-aggregator";
import { buildTurnEvaluations } from "./engines/turn-aggregator";
import { detectRecurringPatterns } from "./engines/pattern-detector";
import { detectBottlenecks, buildWeaknessesFromDimensions } from "./engines/bottleneck-detector";
import { buildRecommendations } from "./engines/recommendation-engine";
import { generateTextWithRouting } from "@/lib/ai";
import type { SpeakingEvaluation, SpeakingDiagnosticSnapshot } from "@/types/diagnostics";
import { buildSnapshot } from "./engines/snapshot-builder";

const EVALUATOR_VERSION = "4.0.0";
const SCHEMA_VERSION = 1;
const PROMPT_VERSION = "4.0.0";

function overallScore(dim: Record<string, number>): number {
  const vals = Object.entries(dim).filter(([k, v]) => !(k === "pronunciation" && v === -1)).map(([, v]) => v as number);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export interface PipelineInput {
  sessionId: string;
  sessionType?: string;
  turns: Array<{ turnId: string; transcript: string; rawText?: string; timestamp?: string; durationMs?: number; timeToFirstWordMs?: number; confidence?: number }>;
  scenarioContext?: string;
  hasAudio?: boolean;
}

export async function runDiagnosticsPipeline(
  input: PipelineInput,
  opts?: { provider?: string; model?: string }
): Promise<{ evaluation: SpeakingEvaluation; snapshot: SpeakingDiagnosticSnapshot }> {
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  const turns = input.turns;

  // Deterministic
  const sessionMetrics = computeSessionMetrics(turns.map((t) => ({ transcript: t.transcript, durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs })));
  const turnEvals = buildTurnEvaluations(turns.map((t) => ({ turnId: t.turnId, transcript: t.transcript, durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs })));

  // Analyzers deterministic
  const flu = analyzeFluency(turns);
  const gram = analyzeGrammar(turns.map((t) => ({ turnId: t.turnId, transcript: t.transcript })));
  const vocab = analyzeVocabulary(turns.map((t) => ({ transcript: t.transcript })));
  const nat = analyzeNaturalness(turns.map((t) => ({ transcript: t.transcript })));
  const resp = analyzeResponseSpeed(turns.map((t) => ({ timeToFirstWordMs: t.timeToFirstWordMs })));
  const comm = analyzeCommunication(turns.map((t) => ({ transcript: t.transcript })));
  const conf = analyzeConfidence(turns.map((t) => ({ transcript: t.transcript, timeToFirstWordMs: t.timeToFirstWordMs })));
  const pron = analyzePronunciation(turns.map((t) => ({ transcript: t.transcript, confidence: t.confidence })), !!input.hasAudio);

  const aggregated = aggregateSession(turns.map((t) => ({ turnId: t.turnId, transcript: t.transcript, durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs, confidence: t.confidence })));

  // For token optimization, we combine AI interpretation into 1-2 calls if needed
  // Here we do deterministic + heuristic mapping; AI enhancement optional via 2 calls
  let aiEnhancement: unknown = null;

  // Only call AI if we have sufficient data and provider != mock
  if (provider !== "mock" && turns.length >= 2 && sessionMetrics.completeness !== "too_short") {
    try {
      const sharedContext = JSON.stringify({
        turns: turns.slice(0, 8).map((t) => t.transcript).join(" | ").slice(0, 1000),
        deterministic: aggregated.dimensions,
        metrics: sessionMetrics,
      });
      const sys = `You are speaking diagnostics AI. Use only evidence. Return ONLY JSON {strengths:[{category,description}], weaknesses:[{category,description}], patterns:[{patternKey,description}]}`;
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: `Context: ${sharedContext}\nTask: Identify 2-3 strengths and 2-3 weaknesses with evidence, plus patterns. Keep concise.` }],
          systemInstruction: sys,
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      });
      const t = res.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
      try {
        const parsed = JSON.parse(t);
        // try to find object
        let obj: unknown = parsed;
        if (!parsed.strengths && !parsed.weaknesses) {
          const m = t.match(/\{[\s\S]*\}/);
          if (m) obj = JSON.parse(m[0]);
        }
        aiEnhancement = obj as typeof aiEnhancement;
      } catch {}
    } catch {}
  }

  // Build weaknesses from dimensions (deterministic) + optionally AI
  const evidenceMap = new Map<string, string[]>([
    ["fluency", flu.evidence],
    ["grammar", gram.issues.map((i) => i.explanation)],
    ["vocabulary", vocab.evidence],
    ["naturalness", nat.issues.map((i) => i.reason)],
    ["responseSpeed", resp.evidence],
    ["communication", comm.evidence],
    ["confidence", conf.evidence],
    ["pronunciation", pron.evidence],
  ]);

  const dimensions = aggregated.dimensions;
  let weaknesses = buildWeaknessesFromDimensions(dimensions, evidenceMap);
  // Enhance with AI weaknesses if available
  const aeWeak = (aiEnhancement as { weaknesses?: Array<{ category: string; description: string }> } | null)?.weaknesses;
  if (aeWeak) {
    for (const w of aeWeak.slice(0, 2)) {
      if (!weaknesses.some((x) => x.category === w.category)) {
        weaknesses.push({ id: `weak_ai_${w.category}`, category: w.category, severity: 60, frequency: 1, impact: 60, confidence: 0.6, evidence: [], description: w.description });
      }
    }
  }

  const patterns = detectRecurringPatterns(gram.issues, turns, dimensions as unknown as Record<string, number>);
  // Add AI patterns
  const aePat = (aiEnhancement as { patterns?: Array<{ patternKey: string; description: string }> } | null)?.patterns;
  if (aePat) {
    for (const p of aePat.slice(0, 2)) {
      if (!patterns.some((x) => x.patternKey === p.patternKey)) {
        patterns.push({ id: `pat_ai_${p.patternKey}`, patternKey: p.patternKey, description: p.description, frequency: 1, evidence: [], confidence: 0.55 });
      }
    }
  }

  const bottlenecks = detectBottlenecks(dimensions, weaknesses, patterns.map((p) => ({ patternKey: p.patternKey, frequency: p.frequency })));

  const strengths = (() => {
    const list: Array<{ category: string; description: string; evidence: string[]; confidence: number }> = [];
    for (const [dim, score] of Object.entries(dimensions as unknown as Record<string, number>)) {
      if (dim === "pronunciation" && score === -1) continue;
      if ((score as number) >= 70) {
        list.push({ category: dim, description: `${dim} relatively strong (${score}/100)`, evidence: evidenceMap.get(dim)?.slice(0, 1) || [], confidence: 0.7 });
      }
    }
    const aeStr = (aiEnhancement as { strengths?: unknown[] } | null)?.strengths;
    if (aeStr) {
      for (const s of aeStr.slice(0, 2) as unknown as string[]) {
        const cat = typeof s === "string" ? s : (s as unknown as { category: string; description: string }).category;
        const desc = typeof s === "string" ? s : (s as unknown as { description: string }).description;
        if (!list.some((x) => x.category === cat)) list.push({ category: cat, description: desc, evidence: [], confidence: 0.6 });
      }
    }
    return list.slice(0, 3).map((s, i) => ({ id: `str_${i}`, category: s.category, description: s.description, evidence: s.evidence, confidence: s.confidence }));
  })();

  const recommendations = buildRecommendations(bottlenecks, patterns);

  const overall = overallScore(dimensions as unknown as Record<string, number>);
  const completeness = sessionMetrics.completeness;
  const confidence: SpeakingEvaluation["confidence"] = {
    overall: completeness === "too_short" ? "low" : completeness === "partial" ? "medium" : "high",
    score: completeness === "too_short" ? 0.35 : completeness === "partial" ? 0.6 : completeness === "sufficient" ? 0.78 : 0.88,
    reason: completeness === "too_short" ? "Too few turns for reliable analysis" : undefined,
  };

  const evidence = [
    ...flu.evidence.map((d, i) => ({ id: `ev_flu_${i}`, description: d, confidence: 0.7 })),
    ...gram.issues.slice(0, 3).map((g, i) => ({ id: `ev_gram_${i}`, turnId: g.id, quote: g.span, description: g.explanation, confidence: g.evidenceConfidence })),
    ...resp.evidence.map((d, i) => ({ id: `ev_resp_${i}`, description: d, confidence: 0.65 })),
  ];

  const evaluation: SpeakingEvaluation = {
    sessionId: input.sessionId,
    sessionType: input.sessionType,
    overallPracticeScore: overall,
    dimensions,
    strengths: strengths.map((s) => ({ id: s.id, category: s.category, description: s.description, evidence: s.evidence, confidence: s.confidence })),
    weaknesses: weaknesses.slice(0, 5),
    recurringPatterns: patterns.slice(0, 5),
    priorityBottlenecks: bottlenecks,
    evidence,
    recommendations,
    confidence,
    completeness,
    turnEvaluations: turnEvals,
    grammarIssues: gram.issues,
    generatedAt: new Date().toISOString(),
    evaluatorVersion: EVALUATOR_VERSION,
    schemaVersion: SCHEMA_VERSION,
    promptVersion: PROMPT_VERSION,
    model,
    provider,
  };

  const snapshot = buildSnapshot(evaluation);
  return { evaluation, snapshot };
}
