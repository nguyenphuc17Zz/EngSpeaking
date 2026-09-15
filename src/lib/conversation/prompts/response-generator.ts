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
  if (opts.summaryJson) lines.push(`ConversationSummary: ${opts.summaryJson}`);
  lines.push(`Recent turns (last 15): ${opts.recentTurnsJson}`);
  if (opts.activeEventJson) lines.push(`Active Event: ${opts.activeEventJson} — incorporate its effect naturally`);
  if (opts.pragmaticActInfo) lines.push(`Learner Pragmatic Move: ${opts.pragmaticActInfo}`);
  lines.push(`User just said: "${opts.userTranscript}"`);
  lines.push(`Speech Duration: ${opts.speechDurationMs ?? 2500} ms | Hint Tier Used (0-4): ${opts.hintTierUsed ?? 0} | Attempt: ${opts.attemptNumber ?? 1}`);
  if (opts.pedagogicalConstraint) lines.push(opts.pedagogicalConstraint);
  lines.push(`Task: Generate ConversationAIResponse JSON with:
1. "responseText": 2-3 sentences max, natural, strictly in character, ending with one question.
2. "stateUpdate": { "currentTopic": "...", "objectiveProgress": 0.1..1, "trustChange": -10..15, "patienceChange": -10..10, "defensivenessChange": -15..15, "newFacts": [{ "id": "f1", "fact": "...", "createdAt": "..." }] }
3. "event": optional { "id": "e1", "type": "surprise", "effect": "..." }
4. "pedagogy": { "grammarIssue": "Brief Vietnamese issue explanation or null", "grammarFix": "Corrected sentence or null", "nativeReformulation": "Natural native phrasing B2/C1", "turnScore": 85, "coachTipVi": "Encouraging tip", "meaningScore": 0-100, "fluencyScore": 0-100, "retrievalScore": 0-100, "independenceScore": 0-100 (100/90/75/50/15 by hint tier 0-4), "errors": [{"type": "grammar"|"vocabulary"|"pronunciation"|"fluency"|"omission"|"strategy", "severity": "minor"|"major", "userText": string, "correction": string, "explanation": string, "patternKey": string}] (max 2), "praisePoints": string[], "actionableFeedback": string, "sayItBetter": {"professional": string, "casual": string, "idiomatic": string}, "naturalAlternatives": [{"expression": string, "tone": string, "explanationVi": string}], "isSayItBetterNeeded": boolean, "hintTierUsed": number, "attemptNumber": number, "evaluationSource": "ai_llm", "isFastPass": false }
5. "hints": { "tier1Keywords": [{ "term": "...", "meaning": "...", "penaltyWeight": 0.1 }], "tier2Starters": [{ "starter": "...", "meaning": "...", "penaltyWeight": 0.5 }], "tier3FullAnswer": { "en": "...", "vi": "...", "penaltyWeight": 0.85 } } to answer your follow-up question!`);
  lines.push(`Return ONLY valid JSON.`);
  return lines.join("\n");
}
