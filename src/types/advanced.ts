// Advanced Training types — Phase 6 §4, §55-56
export type AdvancedTrainingType =
  | "rapidResponse"
  | "pressureConversation"
  | "topicSwitching"
  | "unexpectedQuestion"
  | "deepFollowup"
  | "opinion"
  | "debate"
  | "persuasion"
  | "negotiation"
  | "storytelling"
  | "longForm"
  | "presentation"
  | "qaChallenge"
  | "interview"
  | "professional"
  | "clarification"
  | "resilience"
  | "ambiguity"
  | "escalation"
  | "reformulation"
  | "spontaneous"
  | "abstract"
  | "roleReversal"
  | "devilsAdvocate"
  | "highPressure";

export interface DifficultyConfig {
  responsePressure?: number;
  topicNovelty?: number;
  abstractness?: number;
  conversationComplexity?: number;
  characterDifficulty?: number;
  numberOfConstraints?: number;
  eventFrequency?: number;
  supportLevel?: number; // 0-10, 10=full support
  level?: string; // Advanced|Expert|Extreme
}

export interface AdvancedTrainingContext {
  targetSkills: string[];
  goal?: string;
  difficulty?: DifficultyConfig;
  durationMinutes: number;
  pressureLevel?: string;
  topic?: string;
  scenario?: string;
  communicationObjective?: string;
  userPreferences?: Record<string, unknown>;
}

export interface AdvancedTrainingBlock {
  id: string;
  type: AdvancedTrainingType;
  objective: string;
  skillTargets: string[];
  difficulty: DifficultyConfig;
  estimatedDurationMinutes: number;
  instructions: string;
  scenario?: unknown;
  constraints?: string[];
}

export interface AdvancedChallenge {
  id: string;
  type: string;
  trigger: string;
  purpose: string;
  effect: string;
}

export interface AdvancedTrainingSession {
  id: string;
  modules: string[];
  blocks: AdvancedTrainingBlock[];
  challenges: AdvancedChallenge[];
  context: AdvancedTrainingContext;
  createdAt: string;
  estimatedDurationMinutes: number;
  rationale?: string;
}

export interface AdvancedSessionOutcome {
  sessionId: string;
  module: string;
  objectives: string[];
  turns: number;
  challengesEncountered: string[];
  objectivesAttempted: string[];
  metadata: Record<string, unknown>;
}

export interface AdvancedTrainingModule {
  id: string;
  type: AdvancedTrainingType;
  skillTargets: string[];
  difficultyDimensions: string[];
  generateSession(context: AdvancedTrainingContext): Promise<AdvancedTrainingSession>;
}
