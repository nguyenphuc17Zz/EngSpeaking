// Master Personal Error Bank Service — Function 5
// Universal longitudinal memory layer, priority calculation, and spaced review scheduler

import type {
  MasterErrorRecord,
  ErrorExample,
  CompactErrorContextPack,
  MainErrorCategory,
  ErrorStatus,
  ErrorTrend,
} from "@/types/error-bank";

const MASTER_STORAGE_KEY = "speaking_coach_master_error_bank_v2";

const SPACED_REVIEW_INTERVALS_HOURS = [
  0.16, // Stage 1: 10 mins
  24, // Stage 2: 1 day
  72, // Stage 3: 3 days
  168, // Stage 4: 7 days
  336, // Stage 5: 14 days
  720, // Stage 6: 30 days
];

export function getMasterErrorBank(): MasterErrorRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MASTER_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
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

export function calculatePriorityScore(record: MasterErrorRecord): number {
  const severityWeights = { minor: 1.0, moderate: 1.5, major: 2.2, critical: 3.0 };
  const sevWeight = severityWeights[record.severity] || 1.5;

  const now = Date.now();
  const lastSeenMs = new Date(record.lastSeenAt).getTime();
  const daysSinceLastSeen = Math.max(0, (now - lastSeenMs) / (1000 * 60 * 60 * 24));
  const recencyWeight = Math.max(0.3, 1.0 - daysSinceLastSeen * 0.05);

  const persistenceMultiplier = record.frequency >= 5 ? 1.8 : record.frequency >= 3 ? 1.3 : 1.0;
  const failureRate = Math.max(0.1, 1 - record.recoveryRate / 100);

  // Confidence & False Positive suppression
  const confidenceMultiplier = record.userFlaggedAsFalsePositive ? 0.1 : record.confidenceScore;

  const rawScore =
    sevWeight *
    record.frequency *
    recencyWeight *
    persistenceMultiplier *
    failureRate *
    confidenceMultiplier *
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

  if (existingIdx >= 0) {
    const r = records[existingIdx];
    const frequency = r.frequency + 1;
    const retryTriggeredCount = r.retryTriggeredCount + (params.wasRetried ? 1 : 0);
    const retrySuccessCount = r.retrySuccessCount + (params.retrySucceeded ? 1 : 0);
    const selfCorrectionCount = r.selfCorrectionCount + (params.wasSelfCorrected ? 1 : 0);

    const recoveryRate =
      retryTriggeredCount > 0
        ? Math.round((retrySuccessCount / retryTriggeredCount) * 100)
        : r.recoveryRate;

    const totalAttempts = r.totalAttempts + 1;
    const firstAttemptSuccesses = r.firstAttemptSuccesses + (params.retrySucceeded ? 0 : 0);
    const accuracy = Math.round((firstAttemptSuccesses / totalAttempts) * 100);

    // Latencies
    const lat = params.responseLatencyMs ?? 3000;
    const averageLatencyMs = Math.round((r.averageLatencyMs * r.frequency + lat) / frequency);
    const latencyWhenWrongMs = params.retrySucceeded ? r.latencyWhenWrongMs : lat;
    const latencyWhenCorrectMs = params.retrySucceeded ? lat : r.latencyWhenCorrectMs;

    // Trend & Status Lifecycle
    let trend: ErrorTrend = r.trend;
    if (recoveryRate >= 80 || selfCorrectionCount >= 2) trend = "improving";
    else if (recoveryRate < 45 && frequency >= 4) trend = "worsening";
    else trend = "stable";

    let status: ErrorStatus = r.status;
    if (frequency >= 6 && recoveryRate < 60) status = "persistent";
    else if (recoveryRate >= 85 && selfCorrectionCount >= 3) status = "recovering";
    else if (status === "new") status = "active";

    // Spaced Review Next Due
    const nextIntervalHours = SPACED_REVIEW_INTERVALS_HOURS[Math.min(r.reviewStage, SPACED_REVIEW_INTERVALS_HOURS.length - 1)];
    const nextReviewDueAt = new Date(Date.now() + nextIntervalHours * 3600 * 1000).toISOString();

    const updated: MasterErrorRecord = {
      ...r,
      frequency,
      recentFrequency: r.recentFrequency + 1,
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
      lastSeenAt: now,
      nextReviewDueAt,
      examples: [...r.examples.slice(-5), newExample],
      priorityScore: 0, // will calculate below
    };

    updated.priorityScore = calculatePriorityScore(updated);
    records[existingIdx] = updated;
  } else {
    const nextReviewDueAt = new Date(Date.now() + SPACED_REVIEW_INTERVALS_HOURS[0] * 3600 * 1000).toISOString();

    const created: MasterErrorRecord = {
      id: `err_rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      patternKey: params.patternKey,
      canonicalName: params.canonicalName,
      category: params.category,
      labelVi: params.labelVi,
      descriptionVi: params.descriptionVi,
      severity: params.severity || "moderate",
      gapType: (params.responseLatencyMs ?? 0) > 3500 ? "retrieval_gap" : "knowledge_gap",

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
      nextReviewDueAt,
      reviewStage: 1,

      examples: [newExample],
      priorityScore: 0,
    };

    created.priorityScore = calculatePriorityScore(created);
    records.unshift(created);
  }

  saveMasterErrorBank(records);
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

export function advanceSpacedReviewStage(recordId: string, passed: boolean): MasterErrorRecord[] {
  const records = getMasterErrorBank();
  const idx = records.findIndex((r) => r.id === recordId);
  if (idx >= 0) {
    const r = records[idx];
    const nextStage = passed ? Math.min(6, r.reviewStage + 1) : Math.max(1, r.reviewStage - 1);
    const nextIntervalHours = SPACED_REVIEW_INTERVALS_HOURS[Math.min(nextStage, SPACED_REVIEW_INTERVALS_HOURS.length - 1)];
    const nextReviewDueAt = new Date(Date.now() + nextIntervalHours * 3600 * 1000).toISOString();

    records[idx] = {
      ...r,
      reviewStage: nextStage,
      status: nextStage >= 5 ? "mastered" : nextStage >= 3 ? "stable" : "active",
      nextReviewDueAt,
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
    .filter((r) => r.nextReviewDueAt && new Date(r.nextReviewDueAt).getTime() <= now)
    .slice(0, 8)
    .map((r) => ({
      patternKey: r.patternKey,
      labelVi: r.labelVi,
      nextReviewDueAt: r.nextReviewDueAt!,
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
