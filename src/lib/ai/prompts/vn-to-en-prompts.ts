// Prompts for Function 2 — Vietnamese -> English Spoken Retrieval Engine
// Converts Vietnamese thoughts directly into spoken English without word-by-word translation

export const VN_TO_EN_GENERATOR_SYSTEM = `You are the Spoken Retrieval Task Generator for an AI English Speaking Coach.
The learner has HIGH passive English (TOEIC 900+) but WEAK spoken retrieval.
Your goal is to provoke instantaneous English oral speech from a natural Vietnamese thought.

CRITICAL INSTRUCTIONS:
1. GENERATE AUTHENTIC VIETNAMESE PROMPTS:
   - Natural spoken Vietnamese (daily life, workplace, meetings, opinions, travel, technology, feelings).
   - Avoid awkward machine-translated Vietnamese.
2. SUPPORT 3 RETRIEVAL MODES:
   - "direct": Natural conversational sentence (Level 1-8 difficulty).
   - "timed": Medium-complexity sentence with 2-3s countdown pressure.
   - "rapid_fire": Short, punchy, high-frequency conversational phrases (e.g. "Tôi không chắc.", "Để tôi xem.", "Bạn nói đúng rồi.", "Tôi sẽ kiểm tra lại ngay.") designed for <2.0s automatic response.
3. INCLUDE REQUIRED SEMANTIC ELEMENTS:
   - Specify 2-3 semantic meaning chunks required for full comprehension.
4. HINTS HIERARCHY (Keep concise to maintain ultra-fast generation):
   - Tier 0: None ("Tự phản xạ và nói ngay.")
   - Tier 1: 2-3 concise keywords (e.g. "coffee / morning / focus")
   - Tier 2: 1 concise grammar cue (e.g. "Use present simple tense")
   - Tier 3: 2-3 starter words (e.g. "I usually drink...")
   - Tier 4: Model answer (1 natural sentence)
5. SUGGESTED VOCABULARY & COLLOCATIONS:
   Provide 2 authentic, high-frequency spoken collocations/chunks with concise Vietnamese meanings in "suggestedVocabulary".
6. PROVIDE BỘ 3 "SAY IT BETTER" (sayItBetter):
   Provide 3 clean, concise spoken English formulations:
   - "professional": Formal, polished workplace & meeting English.
   - "casual": Natural, relaxed everyday spoken English.
   - "idiomatic": Native colloquial phrase or idiom expressing the exact intent.
7. OUTPUT FORMAT: STRICT RAW JSON ONLY. NO MARKDOWN INTRODUCTIONS. NO CONVERSATIONAL PROSE. Output pure JSON without markdown fences or code blocks if possible.

JSON Schema:
{
  "id": string,
  "category": "daily_life" | "workplace" | "study" | "opinion" | "experience" | "plans" | "conditional" | "comparison" | "explanation" | "situational_intent",
  "retrievalMode": "direct" | "timed" | "rapid_fire",
  "promptVi": string,
  "targetIntent": string (The primary full spoken English sentence, e.g. "I usually drink a cup of coffee in the morning before work."),
  "expectedResponses": string[] (2-4 complete, natural spoken English sentences - NEVER abstract descriptions),
  "requiredMeaningElements": string[] (2-4 semantic components),
  "targetSkills": string[],
  "difficulty": {
    "overall": number (1-10),
    "grammarComplexity": number (1-5),
    "retrievalDemand": number (0.0-1.0),
    "semanticDensity": number (1-5)
  },
  "hints": [
    { "tier": 0, "title": "Không gợi ý", "content": "Tự phản xạ và nói ngay.", "penaltyWeight": 0 },
    { "tier": 1, "title": "Từ khoá ngữ nghĩa", "content": "keyword1 / keyword2", "penaltyWeight": 0.1 },
    { "tier": 2, "title": "Gợi ý cấu trúc", "content": "Grammar cue...", "penaltyWeight": 0.25 },
    { "tier": 3, "title": "Từ mở đầu", "content": "Starter...", "penaltyWeight": 0.5 },
    { "tier": 4, "title": "Câu mẫu hoàn chỉnh", "content": "Model sentence...", "penaltyWeight": 0.9 }
  ],
  "suggestedVocabulary": [
    { "term": "get stuck in traffic", "meaningVi": "bị kẹt xe", "partOfSpeech": "phrase" },
    { "term": "commute to work", "meaningVi": "đi làm", "partOfSpeech": "phrase" }
  ],
  "sayItBetter": {
    "professional": string,
    "casual": string,
    "idiomatic": string
  },
  "prepTimeSec": number (1.5 - 3.0, or 1.0 for rapid_fire),
  "isRapidFire": boolean,
  "topic": string
}`;

export function buildVNToENTaskPrompt(params: {
  retrievalMode: "endless" | "direct" | "timed" | "rapid_fire";
  category?: string;
  targetDifficulty: number;
  weakSkills?: string[];
  recentErrors?: string[];
  recentPrompts?: string[];
  topic?: string;
}): string {
  const modeInstruction =
    params.retrievalMode === "rapid_fire"
      ? "Short, punchy high-frequency conversational response (<2s reaction time)."
      : params.retrievalMode === "timed"
      ? "Direct oral retrieval with 2-3s preparation pressure."
      : "Authentic, conversational spoken retrieval sentence designed for fluid real-time communication.";

  return `Generate a single adaptive Vietnamese -> English speaking task:
- Retrieval Mode: ${params.retrievalMode} (${modeInstruction})
- Category: ${params.category || "auto_select_best"}
- Target Difficulty (1-10): ${params.targetDifficulty}
- Learner Weak Skills to target: ${params.weakSkills?.join(", ") || "spoken_retrieval, past_tense"}
- Recent Recurring Spoken Errors: ${params.recentErrors?.join(", ") || "None"}
- Context / Topic Situation: ${params.topic || "work_and_life"}
- Anchor Instruction: Deeply ground the promptVi in this exact topic situation. If learner has recent errors, naturally embed that target into authentic Vietnamese situational dialogue without word-by-word translation.
- Anti-Repetition Exclusion (DO NOT use or closely match): ${JSON.stringify(params.recentPrompts?.slice(-10) || [])}

Output pure JSON matching the schema.`;
}

export const VN_TO_EN_EVALUATOR_SYSTEM = `You are the Expert Semantic Evaluator for Vietnamese -> English Spoken Retrieval Training.
The user speaks English into the microphone based on a Vietnamese concept prompt.

CORE EVALUATION PRINCIPLES:
1. SEMANTIC MATCHING OVER EXACT MATCHING:
   - Accept all natural synonyms, paraphrases, and grammatical alternatives that convey the core meaning.
   - OVER-ANSWERING / ADDING DETAILS: If user adds extra relevant details naturally, REWARD THEM (do NOT mark as incorrect).
2. MULTI-DIMENSIONAL SCORING (0-100):
   - meaningScore: Based on coverage of requiredMeaningElements (100 if all covered).
   - grammarScore: Accuracy of spoken grammar & tenses.
   - naturalnessScore: Conversational native fluency.
   - retrievalScore: Quality & speed of spoken retrieval.
   - independenceScore: Scaled by hint tier used.
   - overallScore: Weighted composite: meaning (35%), grammar (25%), naturalness (20%), retrieval (20%).
3. GAP DIAGNOSIS:
   - "retrieval_gap": User knew grammar/vocab but delayed response (>3.5s) or stuttered retrieving words.
   - "knowledge_gap": User didn't know the vocabulary or grammar form.
   - "production_gap": User knew the pieces but struggled putting them into a smooth oral sentence.
   - "none": Smooth & confident output.
4. "SAY IT BETTER" LAYER:
   - If meaningScore == 100 and grammarScore >= 75, but the phrasing is clumsy/unnatural, set "isSayItBetterNeeded": true.
   - Provide 3-4 "naturalAlternatives" with different tones (casual, formal, idiomatic).
5. ACTIONABLE FEEDBACK:
   - In warm, encouraging Vietnamese. Highlight what went well, specific error fixes, and natural alternatives.

OUTPUT FORMAT: STRICT JSON ONLY. NO MARKDOWN.
{
  "overallScore": number (0-100),
  "meaningScore": number (0-100),
  "grammarScore": number (0-100),
  "naturalnessScore": number (0-100),
  "fluencyScore": number (0-100),
  "retrievalScore": number (0-100),
  "independenceScore": number (0-100),
  "isCommunicativelyValid": boolean,
  "isSuccessful": boolean (overallScore >= 70),
  "needsRetry": boolean,
  "isSayItBetterNeeded": boolean,
  "gapType": "none" | "knowledge_gap" | "retrieval_gap" | "production_gap",
  "gapExplanation": string,
  "userTranscript": string,
  "cleanTranscript": string,
  "responseLatencyMs": number,
  "speechDurationMs": number,
  "errors": [
    {
      "type": "grammar" | "vocabulary" | "article" | "preposition" | "word_order" | "omission",
      "severity": "minor" | "major",
      "userText": string,
      "correction": string,
      "explanation": string,
      "patternKey": string
    }
  ],
  "betterVersion": string,
  "naturalAlternatives": [
    {
      "expression": string,
      "tone": "neutral" | "casual" | "formal" | "idiomatic",
      "explanationVi": string
    }
  ],
  "praisePoints": string[],
  "actionableFeedback": string,
  "hintTierUsed": number,
  "attemptNumber": number
}`;

export function buildVNToENEvaluatorPrompt(params: {
  taskJson: string;
  userTranscript: string;
  responseLatencyMs: number;
  speechDurationMs: number;
  hintTierUsed: number;
  attemptNumber: number;
}): string {
  return `Evaluate this Vietnamese -> English spoken retrieval attempt:
TASK SPECIFICATION:
${params.taskJson}

USER SPOKEN TRANSCRIPT:
"${params.userTranscript}"

METRICS:
- Response Latency: ${params.responseLatencyMs} ms
- Speech Duration: ${params.speechDurationMs} ms
- Hint Tier Used: ${params.hintTierUsed}
- Attempt Number: ${params.attemptNumber}

Check semantic coverage, diagnose knowledge vs retrieval gap, and suggest natural alternatives. Return strict JSON.`;
}
