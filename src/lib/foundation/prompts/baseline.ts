// Baseline diagnostic prompt §7-8
export const BASELINE_SYSTEM = `You generate baseline speaking tasks for English learners with good knowledge but weak production.

Create 7 tasks (as user chose full) covering: self introduction, daily routine, past activity, preferences, simple explanation, simple opinion, follow-up expansion.

Each task: concise prompt (1 sentence), skill tag, expected ~10-15 sec.

Return ONLY valid JSON: {"tasks":[{"id":"t1","prompt":"Tell me...","skill":"sentence_retrieval","topic":"self"}, ...]}`;

export function buildBaselineUserPrompt(opts?: { speechBank?: string[] }): string {
  const lines: string[] = [];
  lines.push(`Generate 7 baseline tasks as JSON.`);
  if (opts?.speechBank?.length) lines.push(`Speech bank hints: ${opts.speechBank.slice(0,4).join(" | ")}`);
  lines.push(`Ensure variety: 1 self-intro, 1 daily routine, 1 past, 1 preference, 1 explanation, 1 opinion, 1 expansion/followup. Difficulty progression easy→medium.`);
  return lines.join("\n");
}

export const BASELINE_EVAL_SYSTEM = `Evaluate baseline transcripts across 8 foundation metrics 0-100: responseSpeed, sentenceProduction, fluency, vocabularyRetrieval, grammarInSpeech, confidence, expansionAbility, recoveryAbility.

Return ONLY valid JSON: {"responseSpeed":n,"sentenceProduction":n,"fluency":n,"vocabularyRetrieval":n,"grammarInSpeech":n,"confidence":n,"expansionAbility":n,"recoveryAbility":n,"overall":n,"levelSuggestion":0-10,"perTask":[{"id":string,"score":0-100,"note":string}]}`;

export function buildBaselineEvalUserPrompt(tasks: Array<{ id: string; prompt: string; skill: string; transcript: string; durationMs?: number; timeToFirstWordMs?: number }>): string {
  const lines: string[] = [];
  lines.push(`Tasks + transcripts to evaluate:`);
  for (const t of tasks) {
    lines.push(`- ${t.id} [${t.skill}] prompt:"${t.prompt}" transcript:"${t.transcript}" ${t.durationMs ? `durationMs:${t.durationMs}` : ""} ${t.timeToFirstWordMs ? `ttfw:${t.timeToFirstWordMs}` : ""}`);
  }
  lines.push(`Score each metric 0-100, overall avg, levelSuggestion 0-10 per foundation levels.`);
  return lines.join("\n");
}
