// Feedback micro-generator — kept separate so future curriculum can swap
export const FEEDBACK_SYSTEM = `Generate concise speaking feedback in this exact format:
What went well: 1 sentence
Main issue: 1 sentence or null
Better version: 1 natural sentence or null
Try again: short instruction
Next micro-goal: 1 sentence`;

// Used only if evaluator returns thin feedback; otherwise evaluator's feedback is used directly
export function buildFeedbackPrompt(scoreJson: string, transcript: string): string {
  return `Score: ${scoreJson}\nTranscript: "${transcript}"\nGenerate feedback JSON: {"whatWentWell":string,"mainIssue":string|null,"betterVersion":string|null,"tryAgain":string,"nextMicroGoal":string}`;
}
