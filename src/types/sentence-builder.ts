// Sentence Builder / Controlled Speaking Domain Types — Function 1
// Progressive Speaking Output Training for High Passive / Low Spoken Retrieval Learners

export type SentenceBuilderControlLevel = "controlled" | "semi_controlled" | "free";

export type SentenceBuilderCategory =
  | "translation_output"
  | "sentence_completion"
  | "sentence_expansion"
  | "sentence_transformation"
  | "constraint_speaking"
  | "personal_context";

export type TransformationType = "negative" | "past_tense" | "question" | "passive" | "conditional" | "future";

export interface SentenceScaffold {
  level: 1 | 2 | 3; // 1 = Heavy template with blanks, 2 = Keywords only, 3 = Minimal / none
  template?: string | null; // e.g. "I usually ______ in the morning."
  keywords?: string[]; // e.g. ["coffee", "morning", "work"]
  starter?: string | null; // e.g. "Every morning, I..."
  constraints?: string[]; // e.g. ["Use 'because'", "Use past simple"]
}

export interface TaskDifficulty {
  overall: number; // 1-10
  grammarComplexity: number; // 1-5
  retrievalDemand: number; // 0.0 - 1.0
  lengthScore: number; // 1-5 (approximate words count demand)
}

export interface SentenceBuilderHint {
  tier: 0 | 1 | 2 | 3 | 4;
  title: string;
  content: string;
  penaltyWeight: number; // 0 for tier 0, 0.1 for tier 1, 0.25 for tier 2, 0.5 for tier 3, 0.85 for tier 4
}

export interface SuggestedVocabularyItem {
  term: string; // e.g. "get stuck in traffic"
  meaningVi: string; // e.g. "bị kẹt xe"
  partOfSpeech?: string; // e.g. "phrase", "v", "n"
  phonetic?: string; // e.g. "/kəˈmjuːt/"
}

export interface SentenceBuilderTask {
  id: string;
  taskType: SentenceBuilderCategory;
  controlLevel: SentenceBuilderControlLevel;
  instruction: string; // e.g. "Say this in English" or "Complete the sentence"
  promptVi: string; // Vietnamese prompt or contextual cue
  sourceText?: string; // For translation-style
  baseSentence?: string; // For expansion or transformation
  transformationType?: TransformationType;
  targetIntent: string; // Core semantic meaning required
  expectedResponses: string[]; // 2-4 acceptable natural variations
  requiredElements: string[]; // Essential concept chunks required
  scaffold: SentenceScaffold;
  hints: SentenceBuilderHint[];
  suggestedVocabulary?: SuggestedVocabularyItem[];
  difficulty: TaskDifficulty;
  skills: string[]; // e.g. ["past_simple", "sentence_construction", "vocabulary_retrieval"]
  grammarTargets: string[]; // e.g. ["past_simple", "prepositions"]
  vocabularyTargets: string[]; // e.g. ["commute", "deadline"]
  topic: string; // e.g. "work", "daily_routine", "food", "travel", "technology"
  prepTimeSec: number; // 3.0s down to 1.5s
  modelAudioSample?: string;
}

export interface EvaluatedError {
  type: "grammar" | "vocabulary" | "naturalness" | "omission" | "word_order";
  severity: "minor" | "major";
  userText: string;
  correction: string;
  explanation: string;
  patternKey?: string; // e.g. "past_tense_regular_ed", "article_omission"
}

export interface SentenceBuilderEvaluation {
  overallScore: number; // 0-100
  meaningScore: number; // 0-100 (Primary: did they convey the message?)
  grammarScore: number; // 0-100
  naturalnessScore: number; // 0-100
  fluencyScore: number; // 0-100
  retrievalScore: number; // 0-100 (Calculated from latency, hints used, and completeness)
  independenceScore: number; // 0-100 (100 if 0 hints, drops with hints used)
  
  isCommunicativelyValid: boolean; // Meaning is clear even if minor grammar slips
  isSuccessful: boolean; // Overall score >= 70
  needsRetry: boolean; // Needs user to repeat and repair
  
  userTranscript: string;
  cleanTranscript: string;
  latencyMs: number;
  speechDurationMs: number;
  
  errors: EvaluatedError[];
  betterVersion: string; // More natural native model
  simplifiedVersion?: string; // If user struggled multiple times
  praisePoints: string[];
  actionableFeedback: string;
  
  hintTierUsed: number; // 0-4
  attemptNumber: number; // 1, 2, 3...
}

export interface SentenceBuilderSkillMastery {
  grammar: number; // 0-100
  vocabularyRetrieval: number; // 0-100
  sentenceConstruction: number; // 0-100
  fluency: number; // 0-100
  independence: number; // 0-100
  overallMastery: number; // Weighted composite
  totalAttempts: number;
  successfulFirstAttempts: number;
  streakCount: number;
  updatedAt: string;
}

export interface ErrorBankRecord {
  id: string;
  patternKey: string; // e.g. "past_simple_verb", "article_the", "preposition_in_on_at"
  category: "grammar" | "vocabulary" | "sentence_structure" | "collocation";
  labelVi: string;
  description: string;
  frequency: number;
  errorCount: number;
  successCount: number;
  accuracy: number; // 0-100
  trend: "improving" | "stable" | "needs_work";
  examples: Array<{
    userText: string;
    correction: string;
    timestamp: string;
  }>;
  firstSeenAt: string;
  lastSeenAt: string;
}

export type SessionMode = "quick" | "standard" | "deep" | "weakness_focus";

export interface SentenceBuilderSessionConfig {
  mode: SessionMode;
  targetCount: number; // 4 for quick, 10 for standard, 20 for deep, variable for weakness
  weaknessFocusSkill?: string;
  autoStartMic: boolean;
  prepTimeSec: number;
}

export interface SentenceBuilderSessionSummary {
  sessionId: string;
  mode: SessionMode;
  startedAt: string;
  completedAt: string;
  totalTasks: number;
  completedTasks: number;
  firstAttemptSuccessCount: number;
  firstAttemptAccuracy: number; // %
  averageResponseLatencyMs: number;
  averageIndependence: number;
  averageOverallScore: number;
  masteryDelta: number;
  practicedSkills: string[];
  topWeaknessIdentified?: string;
  recommendedNextAction?: string;
  history: Array<{
    task: SentenceBuilderTask;
    evaluation: SentenceBuilderEvaluation;
    attemptsCount: number;
  }>;
}
