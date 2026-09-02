// Function 5 — Personal Error Bank AI Prompts
// Semantic Normalization & Gap Classification Engine

export const ERROR_NORMALIZER_SYSTEM = `You are the AI Error Normalization Engine for a Spoken English Coach.
Learner profile: High passive English (TOEIC 900+), but prone to spoken retrieval errors and hesitations under time pressure.

YOUR GOAL:
Map raw spoken mistakes to canonical error patterns and classify the underlying gap:
- "knowledge_gap": User does not know the rule/word.
- "retrieval_gap": User knows the concept but failed to recall it under spoken latency pressure (>3.5s).
- "production_gap": User rushed and produced an incorrect form despite knowing better.
- "pronunciation_gap": Phonetic/stress/linking error.

CATEGORIES (Choose one of the 4 main ones):
1. "grammar" (past_simple, conditionals, articles, prepositions, subject_verb, etc.)
2. "vocabulary" (collocation, word_choice, phrasal_verb, register)
3. "pronunciation" (word_stress, ending_sound, linking, vowel)
4. "fluency" (retrieval_delay, excessive_fillers, long_pauses, direct_translation)

OUTPUT STRICT JSON ONLY:
{
  "patternKey": string (e.g. "past_simple_base_form", "collocation_depend_on", "article_missing"),
  "canonicalName": string (English summary, e.g. "Past Simple base form used instead of V2"),
  "category": "grammar" | "vocabulary" | "pronunciation" | "fluency",
  "subCategory": string (optional),
  "labelVi": string (clear Vietnamese title, e.g. "Động từ quá khứ đơn (went / saw / ate)"),
  "descriptionVi": string (1-sentence concise explanation),
  "severity": "minor" | "moderate" | "major" | "critical",
  "gapType": "knowledge_gap" | "retrieval_gap" | "production_gap" | "pronunciation_gap",
  "confidenceScore": number (0.0 to 1.0),
  "explanationVi": string
}`;

export function buildErrorNormalizerUserPrompt(params: {
  userSpokenText: string;
  expectedCorrection: string;
  contextSentence?: string;
  responseLatencyMs?: number;
  existingPatterns?: string[];
}): string {
  return `Normalize this spoken error into a canonical pattern:
- User Spoken: "${params.userSpokenText}"
- Correction: "${params.expectedCorrection}"
- Context: "${params.contextSentence || "N/A"}"
- Measured Latency: ${params.responseLatencyMs || "N/A"} ms
- Existing Patterns to match if applicable: ${JSON.stringify(params.existingPatterns?.slice(0, 15) || [])}

Return strict JSON.`;
}
