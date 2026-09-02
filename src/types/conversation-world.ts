// Conversation World types — Phase 3 §18-22, §28, §38, §82-84
export type ConversationMode =
  | "free"
  | "casual"
  | "daily_life"
  | "social"
  | "travel"
  | "workplace"
  | "professional"
  | "interview"
  | "debate"
  | "storytelling"
  | "presentation"
  | "random"
  | "ai_generated"
  | "custom";

export type DifficultyLevel = "easy" | "normal" | "hard" | "extreme" | "auto";
export type SurpriseLevel = "low" | "medium" | "high" | "extreme";
export type ConflictIntensity = "none" | "low" | "medium" | "high";
export type ConversationPressure = "relaxed" | "normal" | "challenging" | "pressure";
export type CharacterStyle = "friendly" | "neutral" | "professional" | "serious" | "difficult" | "random" | "auto";

export interface SpeakingObjective {
  type: string;
  description: string;
  hidden?: boolean; // §39
}

export interface DynamicEvent {
  id: string;
  type: string;
  trigger?: string;
  probability?: number;
  priority?: number;
  effect: string;
}

export interface ScenarioBlueprint {
  id: string;
  mode: ConversationMode;
  topic: string;
  setting: string;
  character: {
    name?: string;
    role: string;
    personality: string;
    communicationStyle: string;
  };
  userGoal: string;
  aiGoal: string;
  difficulty: number; // 1-10 scalar
  difficultyLabel?: DifficultyLevel;
  context: string;
  conflict?: string;
  conflictIntensity?: ConflictIntensity;
  possibleEvents: DynamicEvent[];
  speakingObjectives: SpeakingObjective[];
  schemaVersion?: number;
}

export interface CharacterState {
  mood: string;
  trust: number; // 0-100
  patience: number;
  engagement: number;
  name?: string;
  role?: string;
}

export interface ConversationFact {
  id: string;
  fact: string;
  createdAt: string;
}

export interface ConversationWorldState {
  scenario: ScenarioBlueprint;
  currentObjective: string;
  currentTopic: string;
  activeCharacter: CharacterState;
  conversationFacts: ConversationFact[];
  unresolvedThreads: string[];
  resolvedThreads?: string[];
  activeEvents: DynamicEvent[];
  turnCount: number;
  surpriseLevel: SurpriseLevel;
  pressure: ConversationPressure;
}

export interface ConversationSummary {
  summary: string;
  keyFacts: ConversationFact[];
  activeThreads: string[];
  resolvedThreads: string[];
  characterState: CharacterState;
}

export interface ConversationSettings {
  mode: ConversationMode;
  difficulty: DifficultyLevel;
  duration: string; // "5 min" | "10 min" etc or "custom"
  durationMinutes?: number;
  characterStyle: CharacterStyle;
  surpriseLevel: SurpriseLevel;
  conflictIntensity: ConflictIntensity;
  pressure: ConversationPressure;
  topic?: string; // "auto" or specific
  setting?: string;
  surpriseMe?: boolean;
  aiPrompt?: string; // for ai_generated §16
}

export interface ConversationAIResponse {
  responseText: string;
  stateUpdate?: {
    currentTopic?: string;
    objectiveProgress?: number;
    moodChange?: number;
    trustChange?: number;
    patienceChange?: number;
    engagementChange?: number;
    newFacts?: ConversationFact[];
    newThreads?: string[];
    resolvedThreads?: string[];
  };
  event?: DynamicEvent;
  pedagogy?: {
    grammarIssue?: string | null;
    grammarFix?: string | null;
    nativeReformulation?: string;
    turnScore?: number;
    coachTipVi?: string;
  };
  hints?: {
    tier1Keywords?: Array<{ term: string; meaning: string }>;
    tier2Starters?: Array<{ starter: string; meaning: string }>;
    tier3FullAnswer?: { en: string; vi: string };
  };
}

// Future integration §84
export interface ConversationGenerationConstraints {
  targetSkill?: string;
  difficulty?: number;
  vocabularyTarget?: string[];
  grammarTarget?: string[];
  communicationGoal?: string;
}

// Future support bridge §82
export interface ConversationSupportContext {
  worldState: ConversationWorldState;
  lastTranscript: string;
  struggleSignals: string[];
}
export interface SpeakingSupportAction {
  type: "hint" | "micro_drill" | "rephrase";
  content: string;
}
export interface SpeakingSupportBridge {
  requestSupport(context: ConversationSupportContext): Promise<SpeakingSupportAction | null>;
}
