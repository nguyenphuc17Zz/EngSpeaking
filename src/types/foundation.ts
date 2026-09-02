// Foundation domain types — Phase 2 §5, §36-39, §48
// Keep extensible: Phase 5 AI Curriculum will extend without rewrite

export type FoundationSkill =
  | "sentence_retrieval"
  | "chunk_retrieval"
  | "sentence_construction"
  | "sentence_expansion"
  | "substitution"
  | "speaking_repetition"
  | "shadowing"
  | "controlled_speaking"
  | "response_speed"
  | "active_vocabulary"
  | "grammar_in_speech"
  | "conversation_followup"
  | "micro_monologue"
  | "recovery"
  | "self_correction"
  | "confidence";

export type FoundationExerciseType =
  | "repeat"
  | "shadow"
  | "chunk_practice"
  | "pattern_practice"
  | "substitution"
  | "one_sentence"
  | "answer_expansion"
  | "controlled_speaking"
  | "timed_speaking"
  | "rapid_response"
  | "follow_up"
  | "stimulus_speaking"
  | "translation_bridge"
  | "vocabulary_activation"
  | "grammar_speaking"
  | "pronunciation_micro"
  | "confidence"
  | "recovery"
  | "self_correction"
  | "repeat_until_better"
  | "micro_monologue";

export type FoundationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface SpeakingConstraint {
  type: string;
  instruction: string;
  target?: string;
}

export interface HintPolicy {
  maxHints: number;
  allowSentenceStarter: boolean;
  allowModelAnswer: boolean;
}

export interface EvaluationCriteria {
  dimension: string;
  weight: number;
  description: string;
}

export interface FoundationExercise {
  id: string;
  skill: FoundationSkill;
  type: FoundationExerciseType;
  level: FoundationLevel;
  difficulty: number; // 1-10 scalar derived from 8 dims §41
  instruction: string;
  prompt?: string;
  targetPhrase?: string;
  targetPattern?: string;
  constraints?: SpeakingConstraint[];
  expectedDurationSec?: number;
  hintPolicy?: HintPolicy;
  evaluationCriteria: EvaluationCriteria[];
  // metadata for generator
  topic?: string;
  source?: "ai" | "mock";
}

export interface FoundationScore {
  completion: number;
  responseSpeed: number;
  sentenceFormation: number;
  accuracy: number;
  fluency: number;
  retrieval: number;
  expansion: number;
  confidence: number;
  recovery: number;
  overall: number; // 0-100 Practice Score §39
  // optional diagnostics
  fillerCount?: number;
  pauseBehavior?: "natural" | "excessive" | "none";
  insufficientEvidence?: boolean;
}

export interface FoundationFeedback {
  whatWentWell: string;
  mainIssue: string | null;
  betterVersion: string | null;
  tryAgain: string;
  nextMicroGoal: string;
  fillerNote?: string | null;
}

export interface FoundationEvaluation {
  score: FoundationScore;
  feedback: FoundationFeedback;
  // for adaptation
  classification: "too_easy" | "appropriate" | "too_hard";
  suggestedDifficultyDelta: -1 | 0 | 1;
  hintsUsed: number;
  timeToFirstWordMs?: number;
  durationMs?: number;
}

export interface FoundationAttempt {
  id: string;
  exerciseId: string;
  transcript: string;
  rawTranscript: string;
  durationMs?: number;
  timeToFirstWordMs?: number;
  hintsUsed: number;
  hintLevel: number; // 0-4 §56
  score?: FoundationScore;
  feedback?: FoundationFeedback;
  completed: boolean;
  createdAt: string;
  // recovery §29
  recoverySuccess?: boolean;
  timeToRecoveryMs?: number;
}

export interface FoundationSession {
  id: string;
  exerciseId: string;
  mode: "learn" | "practice" | "challenge" | "daily";
  startedAt: string;
  completedAt?: string;
  attempts: FoundationAttempt[];
  status: "created" | "active" | "completed" | "abandoned";
  // skill snapshot
  skill: FoundationSkill;
  difficulty: number;
  type: FoundationExerciseType;
}

export interface FoundationProfile {
  userId?: string;
  overallProduction: number; // 0-100
  sentenceRetrieval: number;
  responseSpeed: number;
  fluency: number;
  confidence: number;
  vocabularyActivation: number;
  grammarInSpeech: number;
  expansionAbility: number;
  recoveryAbility: number;
  translationDependency: number; // 0-100 §24, high = dependent
  updatedAt: string;
}

export interface FoundationBaseline {
  id: string;
  createdAt: string;
  // metrics §8
  responseSpeed: number;
  sentenceProduction: number;
  fluency: number;
  vocabularyRetrieval: number;
  grammarInSpeech: number;
  confidence: number;
  expansionAbility: number;
  recoveryAbility: number;
  // raw
  overall: number;
  levelSuggestion: FoundationLevel;
  tasks: Array<{ prompt: string; skill: FoundationSkill; transcript?: string; score?: number }>;
}

export interface SpeechBankCategory {
  id: string;
  label: string;
  prompt: string;
  entries: string[];
}

export const SPEECH_BANK_CATEGORIES: Array<Omit<SpeechBankCategory, "entries">> = [
  { id: "my_life", label: "My life", prompt: "Giới thiệu bản thân" },
  { id: "my_work", label: "My work", prompt: "Công việc" },
  { id: "my_hobbies", label: "My hobbies", prompt: "Sở thích" },
  { id: "my_routine", label: "My routine", prompt: "Thói quen hàng ngày" },
  { id: "my_interests", label: "My interests", prompt: "Mối quan tâm" },
  { id: "my_goals", label: "My goals", prompt: "Mục tiêu" },
  { id: "my_experiences", label: "My experiences", prompt: "Trải nghiệm" },
];

// For API row mapping (Supabase snake_case)
export interface FoundationSessionRow {
  id: string;
  exercise_id: string;
  mode: string;
  skill: string;
  difficulty: number;
  exercise_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  created_at?: string;
}
export interface FoundationAttemptRow {
  id: string;
  session_id: string;
  exercise_id: string;
  transcript: string;
  raw_transcript: string;
  duration_ms: number | null;
  time_to_first_word_ms: number | null;
  hints_used: number;
  hint_level: number;
  score_overall: number | null;
  completed: boolean;
  created_at: string;
}
