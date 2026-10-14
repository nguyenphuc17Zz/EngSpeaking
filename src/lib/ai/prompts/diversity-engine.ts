// Combinatorial Diversity Engine, Compact Task Serializers & Deterministic Hint Hydration
// Maximizes scenario variety (40 Personas x 24 Speech Acts x 16 Tones x 12 Frames = 184,320+ angles)
// while slashing input/output token consumption across all 11 AI modules by 55-75%.

export interface CreativeSeed {
  persona: string;
  speechAct: string;
  tone: string;
  syntacticFrame: string;
}

export const MICRO_PERSONAS: readonly string[] = [
  "skeptical product manager in a sprint review",
  "busy international client on a tight schedule",
  "friendly expat neighbor in an apartment lobby",
  "hotel front-desk supervisor during late check-in",
  "barista at a crowded specialty coffee shop",
  "IT security specialist troubleshooting access",
  "airline gate agent handling a delayed connecting flight",
  "supportive team lead during a 1-on-1 career check-in",
  "landlord discussing an urgent apartment repair",
  "pharmacist recommending over-the-counter relief",
  "rideshare driver navigating heavy downtown traffic",
  "UX designer debating a last-minute interface change",
  "restaurant server handling a dietary restriction",
  "customs officer asking about travel itinerary",
  "fitness trainer adjusting a workout routine",
  "procurement partner negotiating bulk pricing",
  "Airbnb host explaining smart-lock check-in rules",
  "coworker asking to swap shift responsibilities",
  "doctor explaining recovery habits at a clinic",
  "bank representative verifying an unusual card charge",
  "conference attendee networking between keynote talks",
  "electronics store specialist handling a warranty return",
  "project stakeholder asking for a realistic risk assessment",
  "cross-functional engineer reviewing a deployment blocker",
  "courier calling about a mislabeled delivery address",
  "car rental agent explaining insurance coverage options",
  "study group partner planning a presentation outline",
  "recruiter discussing role expectations and hybrid policy",
  "bookstore clerk recommending a non-fiction release",
  "event organizer coordinating last-minute stage logistics",
  "mentor giving candid feedback after a client pitch",
  "colleague catching up in the office pantry on Monday",
  "dentist receptionist rescheduling an appointment",
  "train conductor explaining a platform transfer",
  "new hire asking how the team handles code reviews",
  "freelance designer clarifying scope creep politely",
  "museum volunteer giving directions to a special exhibit",
  "roommate splitting monthly utility bills fairly",
  "veterinarian advising on pet travel preparation",
  "operations director reviewing quarterly budget trade-offs",
];

export const SPEECH_ACTS: readonly string[] = [
  "polite pushback with a practical alternative",
  "urgent clarification to prevent a costly mix-up",
  "negotiating a realistic timeline compromise",
  "explaining an unexpected hiccup concisely",
  "making a spontaneous, helpful recommendation",
  "setting a clear boundary while staying warm",
  "pitching a smart trade-off between speed and quality",
  "de-escalating a misunderstanding with empathy",
  "asking for a time-sensitive favor politely",
  "comparing two viable options and stating a preference",
  "flagging a hidden risk before making a commitment",
  "confirming next steps and ownership clearly",
  "politely declining an invitation due to prior load",
  "requesting an exception or flexible arrangement",
  "giving constructive feedback without sounding harsh",
  "expressing genuine relief after solving a problem",
  "re-framing a setback into an actionable recovery plan",
  "checking alignment before finalizing a decision",
  "summarizing a complex issue in plain spoken English",
  "proposing a quick experiment to test an assumption",
  "acknowledging a valid point before offering a counter-view",
  "asking a probing follow-up question to uncover root cause",
  "sharing a personal lesson learned from a past mistake",
  "buying 3 seconds of thinking time while pivoting smoothly",
];

export const EMOTIONAL_REGISTERS: readonly string[] = [
  "candid & concise",
  "diplomatic & tactful",
  "warm & empathetic",
  "upbeat & conversational",
  "time-pressed & decisive",
  "curious & analytical",
  "reassuring & composed",
  "constructive & firm",
  "relaxed & colloquial",
  "polite & solution-oriented",
  "enthusiastic & encouraging",
  "pragmatic & grounded",
  "matter-of-fact & clear",
  "thoughtful & nuanced",
  "friendly & spontaneous",
  "confident & persuasive",
];

export const SYNTACTIC_FRAMES: readonly string[] = [
  "present ongoing challenge (present continuous / state)",
  "recent past event & immediate impact (past simple / present perfect)",
  "conditional trade-off or contingency (if / unless / as long as)",
  "habitual contrast (used to / usually vs. recently)",
  "cause-and-effect justification (because / since / so that)",
  "polite indirect request or suggestion (Could we / Would you mind / I'd suggest)",
  "concession followed by a strong pivot (Even though / While I agree...)",
  "future plan with concrete reason (going to / planning to / about to)",
  "comparative evaluation (much more effective than / rather than)",
  "preventative precaution (in case / to make sure / before we)",
  "degree & result (too ... to / enough to / so ... that)",
  "modal deduction or advisable action (should have / might need to / ought to)",
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Samples a fresh 4-dimensional creative seed to prevent LLM topic/sentence clichés.
 */
export function sampleCreativeSeed(): CreativeSeed {
  return {
    persona: pickRandom(MICRO_PERSONAS),
    speechAct: pickRandom(SPEECH_ACTS),
    tone: pickRandom(EMOTIONAL_REGISTERS),
    syntacticFrame: pickRandom(SYNTACTIC_FRAMES),
  };
}

/**
 * Formats a compact (~22 tokens) creative variation directive for task generators.
 */
export function buildCreativeAngleDirective(customSeed?: Partial<CreativeSeed>): string {
  const seed = { ...sampleCreativeSeed(), ...customSeed };
  return `Angle: Partner=[${seed.persona}] | Act=[${seed.speechAct}] | Tone=[${seed.tone}] | Frame=[${seed.syntacticFrame}]`;
}

/**
 * Formats a compact anti-repetition exclusion line from recentPrompts (max 8 items, truncated).
 */
export function formatAntiRepetitionList(recentPrompts?: string[], maxItems = 8): string {
  if (!recentPrompts || recentPrompts.length === 0) return "";
  const compact = recentPrompts
    .slice(-maxItems)
    .map((p) => p.replace(/\s+/g, " ").trim().slice(0, 65))
    .filter(Boolean);
  if (compact.length === 0) return "";
  return `Avoid repeating recent prompts/angles: ${compact.join(" | ")}`;
}

/**
 * Deterministically hydrates a standard 5-tier hints array (T0-T4) from core task fields.
 * Saves ~180-250 output tokens per AI generation call and prevents JSON truncation.
 */
export function hydrateStandardFiveTierHints(params: {
  tier0Content?: string;
  keywords: string[];
  grammarCueVi?: string;
  starterOrGrammarCue?: string;
  starterOrSkeleton?: string;
  skeletonTemplate?: string;
  fullModelAnswer?: string;
  modelAnswer?: string;
  includePenaltyWeight?: boolean;
  tier2Title?: string;
  tierTitles?: [string, string, string, string, string];
}): Array<{ tier: number; title: string; content: string; penaltyWeight?: number }> {
  const full = (params.fullModelAnswer || params.modelAnswer || "").trim() || "I understand and will handle it right away.";
  const words = full.split(/\s+/).filter(Boolean);

  const kwText =
    params.keywords.filter(Boolean).slice(0, 4).join(" / ") ||
    words.slice(0, 3).join(" / ");

  const cueText =
    (params.grammarCueVi || params.starterOrGrammarCue)?.trim() ||
    (words.length > 4
      ? `Khung câu: "${words.slice(0, 2).join(" ")} ... ${words.slice(-2).join(" ")}"`
      : "Nói rõ chủ ngữ + động từ chính theo ngữ cảnh.");

  const starterText =
    (params.starterOrSkeleton || params.skeletonTemplate)?.trim() ||
    `${words.slice(0, Math.min(3, Math.max(2, Math.floor(words.length * 0.35)))).join(" ")}...`;

  const titles = params.tierTitles || [
    "Không gợi ý",
    "Từ khoá cốt lõi",
    params.tier2Title || "Cấu trúc & Ngữ pháp",
    "Khung mở đầu",
    "Câu mẫu hoàn chỉnh",
  ];

  const weights = [0, 0.1, 0.25, 0.5, 0.85];
  const contents = [
    params.tier0Content || "Tự phản xạ và nói ngay bằng tiếng Anh.",
    kwText,
    cueText,
    starterText,
    full,
  ];

  return [0, 1, 2, 3, 4].map((tier) => ({
    tier,
    title: titles[tier],
    content: contents[tier],
    ...(params.includePenaltyWeight !== false ? { penaltyWeight: weights[tier] } : {}),
  }));
}

/**
 * Compact Task Serializers for Evaluators
 * Strips UI-only fields (5-tier hints, phonetics, difficulty sub-scores, IDs)
 * reducing Evaluator input payload by 75-85%.
 */
export function compactSentenceBuilderTaskForEval(task: {
  controlLevel?: string;
  promptVi?: string;
  targetIntent?: string;
  expectedResponses?: string[];
  requiredElements?: string[];
  scaffold?: { template?: string | null; constraints?: string[] };
}): string {
  return JSON.stringify({
    level: task.controlLevel,
    promptVi: task.promptVi,
    targetIntent: task.targetIntent,
    expected: (task.expectedResponses || []).slice(0, 3),
    required: task.requiredElements || [],
    ...(task.scaffold?.template ? { template: task.scaffold.template } : {}),
    ...(task.scaffold?.constraints?.length ? { constraints: task.scaffold.constraints } : {}),
  });
}

export function compactVNToENTaskForEval(task: {
  retrievalMode?: string;
  promptVi?: string;
  targetIntent?: string;
  expectedResponses?: string[];
  requiredMeaningElements?: string[];
}): string {
  return JSON.stringify({
    mode: task.retrievalMode,
    promptVi: task.promptVi,
    targetIntent: task.targetIntent,
    expected: (task.expectedResponses || []).slice(0, 3),
    requiredElements: task.requiredMeaningElements || [],
  });
}

export function compactLatencyTaskForEval(task: {
  drillMode?: string;
  promptText?: string;
  targetIntent?: string;
  expectedKeywords?: string[];
  sampleResponses?: string[];
}): string {
  return JSON.stringify({
    mode: task.drillMode,
    prompt: task.promptText,
    intent: task.targetIntent,
    keywords: task.expectedKeywords || [],
    samples: (task.sampleResponses || []).slice(0, 2),
  });
}

export function compactSingleChunkTaskForEval(task: {
  expectedChunkUsage: string;
  stage: string;
  situationVi: string;
  promptText: string;
  chunk?: { variants?: Array<{ expression: string }> };
}): string {
  return JSON.stringify({
    targetChunk: task.expectedChunkUsage,
    variants: (task.chunk?.variants || []).map((v) => v.expression).slice(0, 4),
    stage: task.stage,
    situationVi: task.situationVi,
    question: task.promptText,
  });
}

export function compactChunkChainTaskForEval(task: {
  pragmaticStrategy?: string;
  targetQuestion: string;
  blocks: Array<{
    blockType: string;
    suggestedChunk: string;
    alternativeChunks?: string[];
  }>;
  expectedAssemblyExample: string;
}): string {
  return JSON.stringify({
    strategy: task.pragmaticStrategy || "opinion_defense",
    question: task.targetQuestion,
    blocks: task.blocks.map((b) => ({
      type: b.blockType,
      chunk: b.suggestedChunk,
      alts: (b.alternativeChunks || []).slice(0, 2),
    })),
    example: task.expectedAssemblyExample,
  });
}

export function compactRepairCorrectionForEval(correction: {
  errorType?: string;
  whatToFix?: string;
  userErroneousText?: string;
  minimalCorrection?: string;
  betterSentence?: string;
}): string {
  return JSON.stringify({
    errorType: correction.errorType,
    whatToFix: correction.whatToFix,
    erroneousText: correction.userErroneousText,
    minimalCorrection: correction.minimalCorrection,
    betterSentence: correction.betterSentence,
  });
}

export function compactAdvancedTaskForEval(task: {
  track: string;
  level: string;
  promptVi: string;
  targetIntent: string;
  expectedResponses?: string[];
  requiredMeaningElements?: string[];
  requiredToulminElements?: string[];
}): string {
  return JSON.stringify({
    track: task.track,
    level: task.level,
    promptVi: task.promptVi,
    targetIntent: task.targetIntent,
    expected: (task.expectedResponses || []).slice(0, 2),
    requiredMeaning: task.requiredMeaningElements || [],
    requiredToulmin: task.requiredToulminElements || [],
  });
}
