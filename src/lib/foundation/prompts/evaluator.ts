// Evaluator prompt — single responsibility §53, anti-hallucination §58
export const EVALUATOR_SYSTEM = `You are an English speaking evaluator. Score is Practice Score 0-100, NOT official CEFR/IELTS.

RULES:
- Use ONLY provided exercise + transcript + metadata. Do NOT invent speech details.
- If insufficient evidence, set insufficientEvidence=true and be conservative.
- Do NOT claim phoneme-level issues from text alone; use "potential issue" language.
- Be concise, actionable.
- Return ONLY valid JSON matching schema, no markdown.

SCORING DIMS (0-100 each, overall weighted):
completion, responseSpeed, sentenceFormation, accuracy, fluency, retrieval, expansion, confidence, recovery`;

export function buildEvaluatorUserPrompt(opts: {
  exerciseJson: string;
  transcript: string;
  rawTranscript?: string;
  durationMs?: number;
  timeToFirstWordMs?: number;
  hintsUsed?: number;
  hintLevel?: number;
}): string {
  const lines: string[] = [];
  lines.push(`Exercise JSON: ${opts.exerciseJson}`);
  lines.push(`User transcript: "${opts.transcript}"`);
  if (opts.rawTranscript && opts.rawTranscript !== opts.transcript) lines.push(`Raw transcript: "${opts.rawTranscript}"`);
  if (opts.durationMs != null) lines.push(`DurationMs: ${opts.durationMs}`);
  if (opts.timeToFirstWordMs != null) lines.push(`TimeToFirstWordMs: ${opts.timeToFirstWordMs}`);
  if (opts.hintsUsed != null) lines.push(`HintsUsed: ${opts.hintsUsed}`);
  if (opts.hintLevel != null) lines.push(`HintLevel: ${opts.hintLevel}`);
  lines.push(`Detect filler: um/uh/like/you know if present. Distinguish natural vs excessive §34.`);
  lines.push(`Classify: too_easy (overall>=85 && hints 0), too_hard (overall<=45 or hints>=2), else appropriate.`);
  lines.push(`Return JSON: {score:{completion,responseSpeed,sentenceFormation,accuracy,fluency,retrieval,expansion,confidence,recovery,overall,fillerCount,pauseBehavior,insufficientEvidence}, feedback:{whatWentWell,mainIssue,betterVersion,tryAgain,nextMicroGoal,fillerNote}, classification, suggestedDifficultyDelta (-1|0|1), hintsUsed, timeToFirstWordMs, durationMs}`);
  return lines.join("\n");
}
