// Response generator — minimal context §51 with Pedagogical & Dynamic Hint extensions
export const RESPONSE_SYSTEM = `You are an expert English roleplay conversation partner and speaking coach.
Be natural, responsive, concise (1-2 ideas, one main question), coherent, dynamic, supportive. Never break character in responseText.
You ALSO evaluate the learner's grammar/naturalness and provide dynamic 3-tier scaffolding hints to help them answer your follow-up question.`;

export function buildResponseUserPrompt(opts: {
  worldStateJson: string;
  recentTurnsJson: string;
  summaryJson?: string;
  userTranscript: string;
  activeEventJson?: string;
}): string {
  const lines: string[] = [];
  lines.push(`WorldState: ${opts.worldStateJson}`);
  if (opts.summaryJson) lines.push(`ConversationSummary: ${opts.summaryJson}`);
  lines.push(`Recent turns (last 15): ${opts.recentTurnsJson}`);
  if (opts.activeEventJson) lines.push(`Active Event: ${opts.activeEventJson} — incorporate its effect naturally`);
  lines.push(`User just said: "${opts.userTranscript}"`);
  lines.push(`Task: Generate ConversationAIResponse JSON with:
1. "responseText": 2-3 sentences max, natural, strictly in character, ending with one question.
2. "stateUpdate": { "currentTopic": "...", "objectiveProgress": 0.1..1, "trustChange": -10..15, "patienceChange": -10..10, "newFacts": [{ "id": "f1", "fact": "...", "createdAt": "..." }] }
3. "event": optional { "id": "e1", "type": "surprise", "effect": "..." }
4. "pedagogy": { "grammarIssue": "Brief Vietnamese issue explanation or null", "grammarFix": "Corrected sentence or null", "nativeReformulation": "Natural native phrasing B2/C1", "turnScore": 85, "coachTipVi": "Encouraging tip" }
5. "hints": { "tier1Keywords": [{ "term": "...", "meaning": "..." }], "tier2Starters": [{ "starter": "...", "meaning": "..." }], "tier3FullAnswer": { "en": "...", "vi": "..." } } to answer your follow-up question!`);
  lines.push(`Return ONLY valid JSON.`);
  return lines.join("\n");
}
