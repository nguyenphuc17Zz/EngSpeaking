// LearnerState — Phase 5 central model §4-6, versioning §52
export interface SpeakingProfile {
  fluency: number;
  grammar: number;
  vocabulary: number;
  naturalness: number;
  responseSpeed: number;
  pronunciation: number;
  communication: number;
  confidenceIndicators: number;
  sentenceRetrieval: number;
  automaticity: number;
  recovery: number;
  elaboration: number;
}

export interface SkillState {
  skillId: string;
  mastery: number; // 0-1 §9
  confidence: number; // 0-1 §11
  recentPerformance: number; // 0-1
  trend: "improving" | "stable" | "declining" | "unknown";
  lastPracticedAt?: string;
  practiceCount: number;
  successfulAttempts: number;
  failedAttempts: number;
  currentDifficulty: number; // 1-10
  retentionRisk?: number; // 0-1 §13
  // transfer §40
  controlledPerformance?: number;
  guidedPerformance?: number;
  spontaneousPerformance?: number;
}

export interface WeaknessState {
  skillId: string;
  severity: number;
  impact: number;
  recurrence: number;
  confidence: number;
}

export interface StrengthState {
  skillId: string;
  description: string;
}

export type LearningGoalId = "general" | "daily_conversation" | "workplace" | "interview" | "travel" | "presentation" | "professional" | "fluency" | "naturalness" | "pronunciation" | "confidence" | "ai_decide";

export interface LearningGoal {
  id: LearningGoalId;
  label: string;
  isPrimary?: boolean;
}

export interface LearningFocus {
  skillId: string;
  startedAt: string;
  reason: string;
}

export interface PerformanceSummary {
  avgScore?: number;
  lastSessionAt?: string;
  recentTrend?: string;
}

export interface PracticeHistorySummary {
  totalSessions: number;
  lastSessions: Array<{ sessionId: string; skillId: string; score: number; at: string }>;
}

export interface LearnerPreferences {
  preferredSessionLength?: number; // 5-30
  difficultyPreference?: "easy" | "normal" | "hard" | "auto";
  topics?: string[];
  professionalFocus?: boolean;
  dailyTarget?: number;
  challengeTolerance?: "low" | "medium" | "high";
  feedbackVerbosity?: "concise" | "detailed";
}

export interface CurriculumState {
  currentFocus?: string;
  focusStartedAt?: string;
  currentPlanId?: string;
  consecutiveSuccessfulSessions: number;
  consecutiveFailedSessions: number;
  recentlyCompletedSkills: string[];
  upcomingReviewSkills: string[];
}

export interface LearnerState {
  speakingProfile: SpeakingProfile;
  skills: SkillState[];
  weaknesses: WeaknessState[];
  strengths: StrengthState[];
  goals: LearningGoal[];
  currentFocus?: LearningFocus;
  recentPerformance: PerformanceSummary;
  practiceHistory: PracticeHistorySummary;
  preferences: LearnerPreferences;
  curriculumState: CurriculumState;
  teachingProfile?: TeachingProfile; // §107 basic
  version: number;
  updatedAt: string;
}

export interface TeachingProfile {
  optimalDifficulty?: number;
  pressureTolerance?: number;
  preferredExerciseTypes?: string[];
  effectiveExerciseTypes?: string[];
  supportPreference?: string;
  feedbackPreference?: string;
}

export interface LearnerStateChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
  reason: string;
  sourceSessionId?: string;
  timestamp: string;
}

// Compact snapshot for AI §75
export interface LearnerStateSnapshot {
  goals: string[];
  primaryBottleneck?: string;
  secondaryBottlenecks: string[];
  topStrengths: string[];
  dimensions: Record<string, number>;
  skillPriorities: Array<{ skillId: string; mastery: number; trend: string }>;
  recentChanges: string[];
  reviewCandidates: string[];
  constraints: string[];
}

// Actions §19
export type LearningActionType = "foundation_exercise" | "conversation" | "roleplay" | "review" | "challenge" | "recovery" | "assessment" | "rest";

export interface LearningAction {
  type: LearningActionType;
  skillId?: string;
  reason: string;
  priority: "high" | "medium" | "low";
  difficulty?: number;
  durationMinutes?: number;
  constraints?: string[];
  sourceEvidence?: string[];
}

// Session plan §30-31
export interface LearningBlock {
  id: string;
  type: "warmup" | "drill" | "controlled_speaking" | "conversation" | "roleplay" | "challenge" | "review" | "cooldown";
  skillId?: string;
  exerciseType?: string;
  durationMinutes: number;
  difficulty: number;
  rationale: string;
}

export interface LearningSessionPlan {
  id: string;
  title: string;
  objective: string;
  estimatedDurationMinutes: number;
  blocks: LearningBlock[];
  primarySkill?: string;
  secondarySkills?: string[];
  expectedOutcome: string;
  planVersion: number;
  generatedAt: string;
  generationReason: string;
  teacherVersion: string;
  schemaVersion: number;
}

export interface LearningBlockOutcome {
  blockId: string;
  completed: boolean;
  performance: number; // 0-1
  skillImpact?: number;
}

export interface InterventionOutcome {
  skillId: string;
  exerciseType: string;
  beforeScore: number;
  afterScore: number;
  improvement: number;
  confidence: number;
}
