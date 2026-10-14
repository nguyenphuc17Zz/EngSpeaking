// Response generator — minimal context §51 with Pedagogical & Dynamic Hint extensions
// Aligned with SB/VN-EN/Survival/Drill multi-dimensional eval + Say It Better
export const RESPONSE_SYSTEM = `You are an expert English roleplay conversation partner and speaking coach.
Be natural, responsive, concise (1-2 ideas, one main question), coherent, dynamic, supportive. Never break character in responseText.
Your character possesses distinct psychological traits (Trust, Patience, Defensiveness, Mood). When the user makes a diplomatic concession, builds rapport, or gives evidence, respond authentically according to your character's persona and defenses.
You ALSO evaluate the learner's spoken turn with COMMUNICATIVE CORRECTNESS FIRST (do NOT fail for minor slips if the message is clear) and provide dynamic 3-tier scaffolding hints to help them answer your follow-up question.`;

export function buildResponseUserPrompt(opts: {
  worldStateJson: string;
  recentTurnsJson: string;
  summaryJson?: string;
  userTranscript: string;
  activeEventJson?: string;
  pragmaticActInfo?: string;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
  pedagogicalConstraint?: string;
}): string {
  const lines: string[] = [];
  lines.push(`WorldState: ${opts.worldStateJson}`);
  if (opts.summaryJson) lines.push(`Summary: ${opts.summaryJson}`);
  lines.push(`RecentTurns: ${opts.recentTurnsJson}`);
  if (opts.activeEventJson) lines.push(`ActiveEvent: ${opts.activeEventJson} — weave its effect naturally`);
  if (opts.pragmaticActInfo) lines.push(`PragmaticMove: ${opts.pragmaticActInfo}`);
  lines.push(`LearnerSpoken: "${opts.userTranscript}" (duration=${opts.speechDurationMs ?? 2500}ms, hintTier=${opts.hintTierUsed ?? 0}, attempt=${opts.attemptNumber ?? 1})`);
  if (opts.pedagogicalConstraint) lines.push(opts.pedagogicalConstraint);
  lines.push(`Return ONLY valid ConversationAIResponse JSON:
{
  "responseText": "1-3 sentences max, strictly in character, ending with one natural question",
  "stateUpdate": { "currentTopic"?: string, "objectiveProgress"?: 0.1..1, "trustChange"?: -10..15, "patienceChange"?: -10..10, "defensivenessChange"?: -15..15, "newFacts"?: [{ "id": "f1", "fact": string }] },
  "pedagogy": { "grammarIssue": string|null, "grammarFix": string|null, "nativeReformulation": string, "turnScore": 0..100, "coachTipVi": string, "meaningScore": 0..100, "fluencyScore": 0..100, "retrievalScore": 0..100, "errors": [{"type": "grammar"|"vocabulary"|"pronunciation"|"fluency"|"omission"|"strategy", "severity": "minor"|"major", "userText": string, "correction": string, "explanation": string, "patternKey": string}], "praisePoints": [string], "actionableFeedback": string, "sayItBetter": {"professional": string, "casual": string, "idiomatic": string}, "naturalAlternatives": [{"expression": string, "tone": string, "explanationVi": string}], "isSayItBetterNeeded": boolean },
  "hints": { "tier1Keywords": [{ "term": string, "meaning": string }], "tier2Starters": [{ "starter": string, "meaning": string }], "tier3FullAnswer": { "en": string, "vi": string } }
}`);
  return lines.join("\n");
}

