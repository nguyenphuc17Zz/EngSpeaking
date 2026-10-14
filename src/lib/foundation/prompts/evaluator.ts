// Evaluator prompt — single responsibility §53, anti-hallucination §58 (Compact Token-Optimized)
export const EVALUATOR_SYSTEM = `You are a Spoken English Practice Evaluator (0-100 score).
RULES:
- Evaluate strictly from provided task + transcript. Never hallucinate phoneme errors from text.
- Write concise, actionable feedback in Vietnamese.
- Return ONLY valid JSON:
{"score":{"completion":0-100,"responseSpeed":0-100,"sentenceFormation":0-100,"accuracy":0-100,"fluency":0-100,"retrieval":0-100,"expansion":0-100,"confidence":0-100,"recovery":0-100,"overall":0-100},"feedback":{"whatWentWell":str,"mainIssue":str|null,"betterVersion":str|null,"tryAgain":str,"nextMicroGoal":str,"fillerNote":str|null}}`;

export function buildEvaluatorUserPrompt(opts: {
  exerciseJson: string;
  transcript: string;
  rawTranscript?: string;
  durationMs?: number;
  timeToFirstWordMs?: number;
  hintsUsed?: number;
  hintLevel?: number;
}): string {
  return `Task: ${opts.exerciseJson}
Transcript: "${opts.transcript}"${opts.rawTranscript && opts.rawTranscript !== opts.transcript ? ` (Raw: "${opts.rawTranscript}")` : ""}
Timing: duration=${opts.durationMs ?? 2500}ms, ttfw=${opts.timeToFirstWordMs ?? 1500}ms, hints=${opts.hintsUsed ?? 0}`;
}
