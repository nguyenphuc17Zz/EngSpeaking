// Master Personal Error Bank Service — Function 5
// Universal longitudinal memory layer, priority calculation, and spaced review scheduler
// Powered by FSRS Spaced Repetition, Bayesian Knowledge Tracing (BKT), and L1 Fossilization Risk Index.

import type {
  MasterErrorRecord,
  ErrorExample,
  CompactErrorContextPack,
  MainErrorCategory,
  ErrorStatus,
  ErrorTrend,
} from "@/types/error-bank";
import { calculateRetrievability, computeFSRSUpdate } from "./fsrs-engine";
import { computeBKTUpdate } from "./bkt-engine";
import { assessFossilizationRisk } from "./fossilization-engine";

const MASTER_STORAGE_KEY = "speaking_coach_master_error_bank_v2";

export function getMasterErrorBank(): MasterErrorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MASTER_STORAGE_KEY);
    if (!raw) return [];
    const records: MasterErrorRecord[] = JSON.parse(raw);
    // Dynamically recalculate retrievability based on elapsed time since last review
    return records.map((r) => {
      const currentR = calculateRetrievability(r.fsrsStability ?? 1.0, r.lastReviewAt || r.lastSeenAt);
      return {
        ...r,
        retrievability: currentR,
      };
    });
  } catch {
    return [];
  }
}

export function saveMasterErrorBank(records: MasterErrorRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(records.slice(0, 150)));
  } catch {}
}

/**
 * Calculates dynamic priority score for curriculum ranking and review urgency.
 * Combines severity, repetition, recency, FSRS decay, fossilization risk, and BKT mastery.
 */
export function calculatePriorityScore(record: MasterErrorRecord): number {
  const severityWeights = { minor: 1.0, moderate: 1.5, major: 2.2, critical: 3.0 };
  const sevWeight = severityWeights[record.severity] || 1.5;

  const now = Date.now();
  const lastSeenMs = new Date(record.lastSeenAt).getTime();
  const daysSinceLastSeen = Math.max(0, (now - lastSeenMs) / (1000 * 60 * 60 * 24));
  const recencyWeight = Math.max(0.3, 1.0 - daysSinceLastSeen * 0.05);

  const persistenceMultiplier = record.frequency >= 5 ? 1.8 : record.frequency >= 3 ? 1.3 : 1.0;
  const failureRate = Math.max(0.1, 1 - record.recoveryRate / 100);

  // FSRS Retrievability urgency: If retrievability dropped below 90%, prioritize for review
  const currentR = record.retrievability ?? 90;
  const fsrsUrgency = currentR < 90 ? 1.0 + (90 - currentR) * 0.03 : 1.0;

  // Fossilization boost: 0-100 score adds up to 1.5x urgency
  const fossilizationBoost = 1.0 + (record.fossilizationScore || 0) * 0.005;

  // BKT mastery damping: if user has high mastery (>=0.85), lower the priority
  const masteryDamping = record.pMastery ? Math.max(0.3, 1.2 - record.pMastery) : 1.0;

  // Confidence & False Positive suppression
  const confidenceMultiplier = record.userFlaggedAsFalsePositive ? 0.1 : record.confidenceScore;

  const rawScore =
    sevWeight *
    record.frequency *
    recencyWeight *
    persistenceMultiplier *
    failureRate *
    confidenceMultiplier *
    fsrsUrgency *
    fossilizationBoost *
    masteryDamping *
    10;

  return Math.round(rawScore * 10) / 10;
}

export function ingestErrorOccurrence(params: {
  patternKey: string;
  canonicalName: string;
  category: MainErrorCategory;
  labelVi: string;
  descriptionVi: string;
  userText: string;
  correction: string;
  contextSentence?: string;
  sourceModule: ErrorExample["sourceModule"];
  responseLatencyMs?: number;
  wasSelfCorrected?: boolean;
  wasRetried?: boolean;
  retrySucceeded?: boolean;
  severity?: MasterErrorRecord["severity"];
  confidenceScore?: number;
}): MasterErrorRecord[] {
  const records = getMasterErrorBank();
  const now = new Date().toISOString();
  const existingIdx = records.findIndex((r) => r.patternKey === params.patternKey);
  const existing = existingIdx >= 0 ? records[existingIdx] : undefined;

  const newExample: ErrorExample = {
    id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userText: params.userText,
    correction: params.correction,
    contextSentence: params.contextSentence,
    sourceModule: params.sourceModule,
    responseLatencyMs: params.responseLatencyMs,
    wasSelfCorrected: params.wasSelfCorrected,
    wasRetried: params.wasRetried,
    retrySucceeded: params.retrySucceeded,
    timestamp: now,
  };

  // 1. Compute Bayesian Knowledge Tracing (BKT) update
  const bktResult = computeBKTUpdate({
    currentPMastery: existing?.pMastery,
    correct: !!params.retrySucceeded,
    category: params.category,
    responseLatencyMs: params.responseLatencyMs,
    wasSelfCorrected: params.wasSelfCorrected,
    retrySucceeded: params.retrySucceeded,
  });

  // 2. Compute FSRS Spaced Repetition update
  const fsrsState = computeFSRSUpdate({
    currentStability: existing?.fsrsStability,
    currentDifficulty: existing?.fsrsDifficulty,
    lastReviewAt: existing?.lastReviewAt,
    passed: !!params.retrySucceeded,
    responseLatencyMs: params.responseLatencyMs,
    wasSelfCorrected: params.wasSelfCorrected,
  });

  if (existingIdx >= 0 && existing) {
    const frequency = existing.frequency + 1;
    const retryTriggeredCount = existing.retryTriggeredCount + (params.wasRetried ? 1 : 0);
    const retrySuccessCount = existing.retrySuccessCount + (params.retrySucceeded ? 1 : 0);
    const selfCorrectionCount = existing.selfCorrectionCount + (params.wasSelfCorrected ? 1 : 0);

    const recoveryRate =
      retryTriggeredCount > 0
        ? Math.round((retrySuccessCount / retryTriggeredCount) * 100)
        : existing.recoveryRate;

    const totalAttempts = existing.totalAttempts + 1;
    const firstAttemptSuccesses = existing.firstAttemptSuccesses + (params.retrySucceeded ? 0 : 0);
    const accuracy = Math.round((firstAttemptSuccesses / totalAttempts) * 100);

    // Latencies
    const lat = params.responseLatencyMs ?? 3000;
    const averageLatencyMs = Math.round((existing.averageLatencyMs * existing.frequency + lat) / frequency);
    const latencyWhenWrongMs = params.retrySucceeded ? existing.latencyWhenWrongMs : lat;
    const latencyWhenCorrectMs = params.retrySucceeded ? lat : existing.latencyWhenCorrectMs;

    // 3. Assess Fossilization Risk
    const fossilization = assessFossilizationRisk({
      frequency,
      recoveryRate,
      patternKey: params.patternKey,
      category: params.category,
      averageLatencyMs,
      userText: params.userText,
    });

    // Trend & Status Lifecycle
    let trend: ErrorTrend = existing.trend;
    if (recoveryRate >= 80 || selfCorrectionCount >= 2) trend = "improving";
    else if (recoveryRate < 45 && frequency >= 4) trend = "worsening";
    else trend = "stable";

    let status: ErrorStatus = existing.status;
    if (fossilization.fossilizationLevel === "fossilized" || (frequency >= 6 && recoveryRate < 60)) {
      status = "persistent";
    } else if (recoveryRate >= 85 && selfCorrectionCount >= 3) {
      status = "recovering";
    } else if (status === "new") {
      status = "active";
    }

    const updated: MasterErrorRecord = {
      ...existing,
      frequency,
      recentFrequency: existing.recentFrequency + 1,
      totalAttempts,
      accuracy,
      retryTriggeredCount,
      retrySuccessCount,
      recoveryRate,
      selfCorrectionCount,
      averageLatencyMs,
      latencyWhenWrongMs,
      latencyWhenCorrectMs,
      trend,
      status,
      gapType: bktResult.gapType,
      lastSeenAt: now,
      examples: [...existing.examples.slice(-5), newExample],

      // Math engines
      fsrsStability: fsrsState.stability,
      fsrsDifficulty: fsrsState.difficulty,
      retrievability: fsrsState.retrievability,
      lastReviewAt: fsrsState.lastReviewAt,
      nextReviewDueAt: fsrsState.nextReviewDueAt,
      pMastery: bktResult.pMastery,
      isSlip: bktResult.isSlip,
      fossilizationScore: fossilization.fossilizationScore,
      fossilizationLevel: fossilization.fossilizationLevel,
      l1InterferenceType: fossilization.l1Type,

      priorityScore: 0,
    };

    updated.priorityScore = calculatePriorityScore(updated);
    records[existingIdx] = updated;
  } else {
    // 3. Assess Fossilization Risk for new error
    const fossilization = assessFossilizationRisk({
      frequency: 1,
      recoveryRate: params.retrySucceeded ? 100 : 0,
      patternKey: params.patternKey,
      category: params.category,
      averageLatencyMs: params.responseLatencyMs,
      userText: params.userText,
    });

    const created: MasterErrorRecord = {
      id: `err_rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      patternKey: params.patternKey,
      canonicalName: params.canonicalName,
      category: params.category,
      labelVi: params.labelVi,
      descriptionVi: params.descriptionVi,
      severity: params.severity || "moderate",
      gapType: bktResult.gapType,

      frequency: 1,
      recentFrequency: 1,
      firstAttemptFailures: 1,
      firstAttemptSuccesses: 0,
      totalAttempts: 1,
      accuracy: 0,

      retryTriggeredCount: params.wasRetried ? 1 : 0,
      retrySuccessCount: params.retrySucceeded ? 1 : 0,
      recoveryRate: params.retrySucceeded ? 100 : 0,
      selfCorrectionCount: params.wasSelfCorrected ? 1 : 0,

      averageLatencyMs: params.responseLatencyMs || 3000,
      latencyWhenWrongMs: params.responseLatencyMs || 3000,
      latencyWhenCorrectMs: 0,

      status: "new",
      trend: "stable",
      confidenceScore: params.confidenceScore ?? 0.9,
      falsePositiveCount: 0,
      userFlaggedAsFalsePositive: false,

      firstSeenAt: now,
      lastSeenAt: now,
      reviewStage: 1,

      // Math engines
      fsrsStability: fsrsState.stability,
      fsrsDifficulty: fsrsState.difficulty,
      retrievability: fsrsState.retrievability,
      lastReviewAt: fsrsState.lastReviewAt,
      nextReviewDueAt: fsrsState.nextReviewDueAt,
      pMastery: bktResult.pMastery,
      isSlip: bktResult.isSlip,
      fossilizationScore: fossilization.fossilizationScore,
      fossilizationLevel: fossilization.fossilizationLevel,
      l1InterferenceType: fossilization.l1Type,

      examples: [newExample],
      priorityScore: 0,
    };

    created.priorityScore = calculatePriorityScore(created);
    records.unshift(created);
  }

  saveMasterErrorBank(records);
  return records;
}

export function ingestEvaluatedErrors(
  occurrences: Array<{
    patternKey: string;
    canonicalName: string;
    category: MainErrorCategory;
    labelVi: string;
    descriptionVi: string;
    severity?: MasterErrorRecord["severity"];
    gapType?: MasterErrorRecord["gapType"];
    confidenceScore?: number;
    userText: string;
    correction: string;
    contextSentence?: string;
  }>,
  opts: {
    sourceModule: ErrorExample["sourceModule"];
    responseLatencyMs?: number;
    wasRetried?: boolean;
    retrySucceeded?: boolean;
    wasSelfCorrected?: boolean;
  }
): MasterErrorRecord[] {
  let records = getMasterErrorBank();
  for (const o of occurrences) {
    records = ingestErrorOccurrence({
      patternKey: o.patternKey,
      canonicalName: o.canonicalName,
      category: o.category,
      labelVi: o.labelVi,
      descriptionVi: o.descriptionVi,
      userText: o.userText,
      correction: o.correction,
      contextSentence: o.contextSentence,
      sourceModule: opts.sourceModule,
      responseLatencyMs: opts.responseLatencyMs,
      wasRetried: opts.wasRetried,
      retrySucceeded: opts.retrySucceeded,
      wasSelfCorrected: opts.wasSelfCorrected,
      severity: o.severity,
      confidenceScore: o.confidenceScore,
    });
  }
  return records;
}

export function flagErrorAsFalsePositive(recordId: string): MasterErrorRecord[] {
  const records = getMasterErrorBank();
  const idx = records.findIndex((r) => r.id === recordId);
  if (idx >= 0) {
    records[idx].userFlaggedAsFalsePositive = true;
    records[idx].falsePositiveCount += 1;
    records[idx].confidenceScore = Math.max(0.1, records[idx].confidenceScore - 0.5);
    records[idx].priorityScore = calculatePriorityScore(records[idx]);
    saveMasterErrorBank(records);
  }
  return records;
}

export function advanceSpacedReviewStage(
  recordId: string,
  passed: boolean,
  responseLatencyMs?: number
): MasterErrorRecord[] {
  const records = getMasterErrorBank();
  const idx = records.findIndex((r) => r.id === recordId);
  if (idx >= 0) {
    const r = records[idx];

    // 1. Update FSRS state
    const fsrs = computeFSRSUpdate({
      currentStability: r.fsrsStability,
      currentDifficulty: r.fsrsDifficulty,
      lastReviewAt: r.lastReviewAt || r.lastSeenAt,
      passed,
      responseLatencyMs,
    });

    // 2. Update BKT mastery
    const bkt = computeBKTUpdate({
      currentPMastery: r.pMastery,
      correct: passed,
      category: r.category,
      responseLatencyMs,
    });

    // 3. Update Fossilization
    const fossilization = assessFossilizationRisk({
      frequency: r.frequency,
      recoveryRate: passed ? Math.min(100, r.recoveryRate + 15) : Math.max(0, r.recoveryRate - 15),
      patternKey: r.patternKey,
      category: r.category,
      averageLatencyMs: responseLatencyMs ?? r.averageLatencyMs,
    });

    const nextStage = passed ? Math.min(6, r.reviewStage + 1) : Math.max(1, r.reviewStage - 1);

    records[idx] = {
      ...r,
      reviewStage: nextStage,
      status: bkt.pMastery >= 0.85 && fsrs.stability >= 7 ? "mastered" : nextStage >= 3 ? "stable" : "active",
      fsrsStability: fsrs.stability,
      fsrsDifficulty: fsrs.difficulty,
      retrievability: fsrs.retrievability,
      lastReviewAt: fsrs.lastReviewAt,
      nextReviewDueAt: fsrs.nextReviewDueAt,
      pMastery: bkt.pMastery,
      isSlip: bkt.isSlip,
      gapType: bkt.gapType,
      fossilizationScore: fossilization.fossilizationScore,
      fossilizationLevel: fossilization.fossilizationLevel,
      l1InterferenceType: fossilization.l1Type,
    };
    records[idx].priorityScore = calculatePriorityScore(records[idx]);
    saveMasterErrorBank(records);
  }
  return records;
}

export function getCompactErrorContextPack(): CompactErrorContextPack {
  const records = getMasterErrorBank().filter((r) => !r.userFlaggedAsFalsePositive);
  const now = Date.now();

  const sortedByPriority = [...records].sort((a, b) => b.priorityScore - a.priorityScore);
  const topWeaknesses = sortedByPriority.slice(0, 5).map((r) => ({
    patternKey: r.patternKey,
    labelVi: r.labelVi,
    category: r.category,
    accuracy: r.accuracy,
    recoveryRate: r.recoveryRate,
    averageLatencyMs: r.averageLatencyMs,
    gapType: r.gapType,
  }));

  const reviewDueList = records
    .filter((r) => {
      const isDue = r.nextReviewDueAt && new Date(r.nextReviewDueAt).getTime() <= now;
      const isLowR = (r.retrievability || 100) < 90;
      return isDue || isLowR;
    })
    .slice(0, 8)
    .map((r) => ({
      patternKey: r.patternKey,
      labelVi: r.labelVi,
      nextReviewDueAt: r.nextReviewDueAt || new Date().toISOString(),
    }));

  const totalRecovery = records.reduce((acc, r) => acc + r.recoveryRate, 0);
  const overallRecoveryRate = records.length > 0 ? Math.round(totalRecovery / records.length) : 80;

  return {
    topWeaknesses,
    reviewDueList,
    overallRecoveryRate,
    totalActiveErrors: records.filter((r) => r.status !== "mastered").length,
  };
}

/**
 * Generates an LLM Pedagogical Constraint prompt from high-priority/due errors.
 * Re-injects genuine learner weaknesses dynamically into exercise generators.
 */
export function buildErrorBankPedagogicalPrompt(records?: MasterErrorRecord[]): string | null {
  const list = records || getMasterErrorBank();
  if (!list.length) return null;

  const now = Date.now();
  // Filter for errors due for review or with high fossilization risk
  const dueErrors = list
    .filter((r) => !r.userFlaggedAsFalsePositive && r.status !== "mastered")
    .filter((r) => {
      const isDue = r.nextReviewDueAt && new Date(r.nextReviewDueAt).getTime() <= now;
      const isLowR = (r.retrievability || 100) < 90;
      const isFossilized = r.fossilizationLevel === "fossilized" || r.fossilizationScore >= 60;
      return isDue || isLowR || isFossilized;
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  if (!dueErrors.length) return null;

  const errorDescriptions = dueErrors
    .map(
      (e, idx) =>
        `${idx + 1}. [${e.category.toUpperCase()}] "${e.labelVi}" (Target rule: ${e.canonicalName}; Example error: "${e.examples[0]?.userText || ""}" -> "${e.examples[0]?.correction || ""}")`
    )
    .join("\n");

  return `PEDAGOGICAL CONSTRAINT (Targeted Personal Error Bank Review):
The user has active review-due weaknesses that need reinforcement:
${errorDescriptions}
Strategically craft this exercise to naturally challenge ONE of these specific weak points while keeping the scenario creative, dynamic, and realistic.`;
}
