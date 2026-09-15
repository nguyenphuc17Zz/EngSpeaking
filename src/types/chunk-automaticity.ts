// Function 6 — Chunk Automaticity Domain Types
// Assembly of speech from automatic reusable blocks

export type ChunkType =
  | "fixed_expression"
  | "sentence_frame"
  | "collocation"
  | "phrasal_verb"
  | "conversation_opener"
  | "hedging"
  | "buying_time"
  | "repair"
  | "paraphrase"
  | "opinion"
  | "cause_effect"
  | "example_giving";

export type ChunkStage =
  | "exposure" // 1. Listen & see
  | "recognition" // 2. Identify in context
  | "controlled_recall" // 3. Fill-in-the-blank
  | "spoken_recall" // 4. See situation -> speak chunk
  | "contextual_use" // 5. Use naturally in scenario
  | "variation" // 6. Use alternative form
  | "transfer" // 7. Cross-domain transfer (Work, Travel, Daily, Opinions)
  | "automaticity"; // 8. Full spontaneous usage

export interface ChunkVariant {
  id: string;
  expression: string; // e.g. "That really depends on..."
  register?: "casual" | "neutral" | "formal";
  exampleSentence: string;
}

export interface ChunkRecord {
  id: string;
  familyKey: string; // e.g. "depend_on_conditional"
  canonicalChunk: string; // e.g. "It depends on..."
  meaningVi: string; // e.g. "Điều này phụ thuộc vào..."
  type: ChunkType;
  difficulty: number; // 1-10
  functionName: string; // e.g. "Conditional decision"
  
  variants: ChunkVariant[];
  exampleSentences: string[];
  
  // Progress & Mastery
  masteryScore: number; // 0-100%
  retrievalLatencyMs: number;
  stage: ChunkStage;
  practiceCount: number;
  successCount: number;
  independentSuccessCount: number;
  
  lastPracticedAt?: string;
  nextReviewDueAt?: string;
  isCustomUserChunk?: boolean;
}

export type PragmaticStrategyType =
  | "opinion_defense"        // Standard: Buffer -> Stance -> Reason -> Example
  | "concession_counter"      // Advanced: Buffer -> Concession -> Stance/Rebuttal -> Resolution
  | "problem_solution"       // Strategic: Buffer -> Problem diagnosis -> Core solution -> Projected impact
  | "hypothetical_projection" // Analytic: Buffer -> Conditional premise -> Mechanism -> Concrete outcome
  | "cause_effect_chain";     // Dynamic: Buffer -> Initiating trigger -> Core consequence -> Elaboration

export interface ChunkChainBlock {
  blockType: "buffer" | "stance" | "reason" | "example";
  labelVi: string; // e.g. "Cụm câu đệm mở đầu"
  suggestedChunk: string; // e.g. "Well, to be honest..."
  alternativeChunks: string[];
  rhetoricalRole?: string; // e.g. "Buying time & acknowledging question"
  transitionConnector?: string; // e.g. "Having said that...", "First and foremost..."
}

export interface ChunkChainTask {
  id: string;
  topic: string; // e.g. "Lý do thích làm việc từ xa"
  situationVi: string; // e.g. "Giải thích cho đồng nghiệp vì sao bạn thích làm việc tại nhà."
  targetQuestion: string; // e.g. "Why do you prefer working from home?"
  blocks: ChunkChainBlock[];
  expectedAssemblyExample: string;
  targetLatencyMs: number;
  pragmaticStrategy?: PragmaticStrategyType;
  strategyTitleVi?: string;
  strategyDescriptionVi?: string;
  persona?: string;
  domain?: "workplace" | "daily_life" | "travel" | "tech_ai" | "opinions" | "career";
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
}

export interface ChunkTrainingTask {
  id: string;
  chunk: ChunkRecord;
  stage: ChunkStage;
  situationVi: string;
  contextDomain: "workplace" | "daily_life" | "travel" | "opinions";
  promptText: string;
  expectedChunkUsage: string;
  scaffoldText?: string;
  targetLatencyMs: number;
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
}

export interface ChunkEvaluationResult {
  isSuccessful: boolean;
  chunkDetected: boolean;
  detectedExpression?: string;
  isNaturalInsertion: boolean;
  retrievalLatencyMs: number;
  grammarAroundChunkScore: number;
  naturalnessScore: number;
  overallScore: number;
  
  userTranscript: string;
  coachFeedbackVi: string;
  betterVersion: string;
  alternativeVariants: string[];
  transferDomainSuccess: boolean;
  masteryDelta: number;
}

export interface ChunkChainEvaluationResult {
  isSuccessful: boolean;
  overallScore: number;
  blocksUsedCount: number;
  totalBlocks: number;
  detectedBlocks: Array<{
    blockType: ChunkChainBlock["blockType"];
    usedChunk: string;
    isAppropriate: boolean;
  }>;
  fluencyFlowScore: number;
  responseLatencyMs: number;
  userTranscript: string;
  coachFeedbackVi: string;
  idealCombinedSpeech: string;
}

export interface ChunkSessionSummary {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  totalTasks: number;
  averageScore: number;
  averageLatencyMs: number;
  fastRecallCount: number;
  blocksUsedTotal: number;
  strategyDistribution: Record<string, number>;
  history: Array<{
    task: ChunkChainTask | ChunkTrainingTask;
    evaluation: ChunkChainEvaluationResult | ChunkEvaluationResult;
  }>;
}
