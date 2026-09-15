// Function 4 — Response Latency Training Domain Types
// Speed gym for spontaneous spoken retrieval

export type LatencyDrillMode = "open_response" | "rapid_retrieval" | "timed_countdown" | "baseline_test";

export type LatencyQuadrant =
  | "fast_correct" // 🔥 Automatic (latency < target & correct >= 70%)
  | "slow_correct" // ⚡ Knowledge present, retrieval slow (latency >= target & correct >= 70%)
  | "fast_incorrect" // ⚠️ Speed good, accuracy slips (latency < target & correct < 70%)
  | "slow_incorrect"; // 🧩 Cognitive overload / gap (latency >= target & correct < 70%)

export interface BufferChunkCandidate {
  phrase: string;
  meaningVi: string;
  category: "buying_time" | "framing_opinion" | "immediate_reaction";
}

export interface LatencyTask {
  id: string;
  drillMode: LatencyDrillMode;
  promptText: string; // The question / prompt in English or Vietnamese
  promptLanguage: "en" | "vi";
  targetIntent: string;
  expectedKeywords: string[];
  sampleResponses: string[];
  targetLatencyMs: number; // Target threshold e.g. 2500ms
  difficulty: number; // 1-10
  category: "daily_conversation" | "workplace" | "opinions" | "past_events" | "reactions" | "buffer_phrases";
  bufferPhraseSuggestion?: string; // e.g. "Let me think for a second..."
  bufferChunks?: BufferChunkCandidate[]; // 2-3 structured conversational buffer phrases
  staircaseTargetMs?: number; // Adaptive staircase target
  isBaseline?: boolean;
  hints?: Array<{
    tier: number;
    title: string;
    content: string;
  }>;
  suggestedVocabulary?: Array<{
    term: string;
    meaningVi: string;
    partOfSpeech?: string;
    phonetic?: string;
  }>;
  source?: "ai" | "bank";
  topic?: string;
}

export interface HesitationProfile {
  fillerCount: number;
  fillersDetected: string[]; // e.g. ["um", "uh", "like"]
  fillersPerMinute: number;
  pauseCount: number;
  selfCorrectionDetected: boolean;
}

export type LatencyStatus = "excellent" | "strong" | "moderate" | "slow" | "very_slow";
export type LatencyLikelyCause = "automatic" | "spoken_retrieval" | "grammar_calculation" | "vocabulary_search" | "hesitation";

export interface LatencyEvaluation {
  overallScore: number;
  accuracyScore: number;
  naturalnessScore: number;
  fluencyScore: number;
  
  responseLatencyMs: number; // Measured from promptReady -> meaningful speech start
  speechDurationMs: number;
  targetLatencyMs: number;
  latencyRatio: number; // actual / target
  
  quadrant: LatencyQuadrant;
  latencyStatus: LatencyStatus;
  likelyCause: LatencyLikelyCause;
  
  hesitation: HesitationProfile;
  
  userTranscript: string;
  cleanTranscript: string;
  isSuccessful: boolean;
  
  coachFeedbackVi: string;
  betterResponse: string;
  praisePoints: string[];
  
  isFastPass?: boolean;
  bufferUsed?: string;
  speechOnsetMs?: number;
}

export interface LatencySessionSummary {
  sessionId: string;
  mode: LatencyDrillMode;
  startedAt: string;
  completedAt: string;
  totalPrompts: number;
  medianLatencyMs: number;
  p25LatencyMs: number;
  p75LatencyMs: number;
  baselineComparisonDeltaMs?: number; // e.g. -1200ms
  accuracyRate: number; // %
  quadrantDistribution: {
    fastCorrectCount: number;
    slowCorrectCount: number;
    fastIncorrectCount: number;
    slowIncorrectCount: number;
  };
  fastestResponseMs: number;
  slowestResponseMs: number;
  topDelayedCategory?: string;
  recommendedDrill?: string;
  history: Array<{
    task: LatencyTask;
    evaluation: LatencyEvaluation;
  }>;
}
