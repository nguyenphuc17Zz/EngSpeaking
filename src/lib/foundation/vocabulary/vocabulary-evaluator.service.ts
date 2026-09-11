// Vocabulary & Context Evaluator Service — Function 8
// Evaluates Step 1 (Phoneme & Stress Diagnostics) and Step 2 (Guided vs Spontaneous Sentence Context)

import { generateTextWithRouting } from "@/lib/ai";
import {
  wordPronunciationEvaluationSchema,
  sentenceContextEvaluationSchema,
} from "@/lib/validation/vocabulary-context-schemas";
import {
  WORD_PRONUNCIATION_EVALUATOR_SYSTEM,
  SENTENCE_CONTEXT_EVALUATOR_SYSTEM,
} from "@/lib/ai/prompts/vocabulary-context-prompts";
import {
  decomposeIpa,
  getMinimalPairContrast,
  calculateWeightedPhonemeScore,
  calculateNormalizedPVI,
} from "./phoneme-stress.engine";
import type {
  SpokenWordItem,
  ContextSentenceItem,
  SpontaneousChallenge,
  WordPronunciationEvaluation,
  SentenceContextEvaluation,
} from "@/types/vocabulary-context";

function cleanJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    const m = withoutFence.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

export async function evaluateWordPronunciation(params: {
  wordItem: SpokenWordItem;
  userTranscript: string;
  provider?: string;
  model?: string;
}): Promise<WordPronunciationEvaluation> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  const cleanUser = params.userTranscript.trim().toLowerCase();
  const cleanTarget = params.wordItem.word.trim().toLowerCase();
  const isMatch = cleanUser.includes(cleanTarget);

  // Pre-compute acoustic & phonological breakdown
  const phonemeAnalysis = decomposeIpa(params.wordItem.ipaUS);
  const minimalPair = getMinimalPairContrast(params.wordItem.word);
  const weightedScore = calculateWeightedPhonemeScore(params.wordItem.ipaUS, cleanUser);

  const topL1Pitfall = phonemeAnalysis.vietnameseL1Pitfalls[0];
  const l1TrapText = topL1Pitfall
    ? `${topL1Pitfall.titleVi}: ${topL1Pitfall.descriptionVi}`
    : "Chú ý giữ âm đuôi dứt khoát và phát âm rõ âm tiết mang trọng âm.";

  const minimalPairText = minimalPair
    ? `Tránh nhầm với "${minimalPair.confusedWord}" (${minimalPair.confusedIpa}): ${minimalPair.explanationVi}`
    : undefined;

  const syllablesDetected = phonemeAnalysis.syllables.map((s) => (s.isPrimaryStressed ? `[${s.raw}]` : s.raw));

  if (provider === "mock") {
    const finalScore = isMatch ? 92 : weightedScore.similarityScore > 50 ? 68 : 45;
    const endingScore = isMatch ? 94 : weightedScore.codaScore;
    const stressScore = isMatch ? 90 : weightedScore.stressScore;

    return {
      isSuccessful: isMatch || finalScore >= 70,
      wordSpokenCorrectly: isMatch,
      pronunciationScore: finalScore,
      stressAccuracyScore: stressScore,
      endingSoundScore: endingScore,
      overallScore: finalScore,
      detectedPhonemes: params.wordItem.ipaUS,
      userTranscript: params.userTranscript,
      feedbackVi: isMatch
        ? `Phát âm từ "${params.wordItem.word}" rất chuẩn xác! Trọng âm âm tiết ${phonemeAnalysis.primaryStressIndex + 1} và âm đuôi rất rõ.`
        : `Chưa nghe rõ từ "${params.wordItem.word}". Hãy lưu ý âm đuôi và trọng âm.`,
      phonemeCorrectionAdvice: params.wordItem.stressExplanationVi,
      syllablesDetected,
      vietnameseL1TrapWarning: l1TrapText,
      minimalPairAdvice: minimalPairText,
      endingSoundStatus: isMatch ? "clear" : "weak",
    };
  }

  const userPrompt = `Evaluate this single word pronunciation with Acoustic Phonological Analysis:
TARGET WORD: "${params.wordItem.word}"
TARGET IPA: "${params.wordItem.ipaUS}"
SYLLABLES: ${JSON.stringify(phonemeAnalysis.syllables)}
PRIMARY STRESS: Syllable ${phonemeAnalysis.primaryStressIndex + 1}
CRITICAL ENDING SOUNDS: ${phonemeAnalysis.criticalEndingConsonants.join(", ") || "None"}
VIETNAMESE L1 PITFALLS: ${JSON.stringify(phonemeAnalysis.vietnameseL1Pitfalls)}
MINIMAL PAIR: ${minimalPair ? JSON.stringify(minimalPair) : "None"}
USER TRANSCRIPT: "${params.userTranscript}"

Return strict JSON matching the schema.`;

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: WORD_PRONUNCIATION_EVALUATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 500,
      },
    });

    const parsed = cleanJson(res.text) as Record<string, unknown>;
    if (!parsed) throw new Error("Could not parse JSON");

    if (!parsed.syllablesDetected) parsed.syllablesDetected = syllablesDetected;
    if (!parsed.vietnameseL1TrapWarning) parsed.vietnameseL1TrapWarning = l1TrapText;
    if (!parsed.minimalPairAdvice && minimalPairText) parsed.minimalPairAdvice = minimalPairText;
    if (!parsed.endingSoundStatus) parsed.endingSoundStatus = isMatch ? "clear" : "weak";

    const validated = wordPronunciationEvaluationSchema.safeParse(parsed);
    if (!validated.success) throw new Error("Validation error");
    return validated.data as WordPronunciationEvaluation;
  } catch {
    return {
      isSuccessful: isMatch,
      wordSpokenCorrectly: isMatch,
      pronunciationScore: isMatch ? 88 : 45,
      stressAccuracyScore: isMatch ? 85 : 40,
      endingSoundScore: isMatch ? 90 : 50,
      overallScore: isMatch ? 88 : 45,
      userTranscript: params.userTranscript,
      feedbackVi: isMatch
        ? `Bạn đã phát âm từ "${params.wordItem.word}" rất tốt!`
        : `Hãy nghe lại phát âm mẫu và chú ý âm đuôi.`,
      phonemeCorrectionAdvice: params.wordItem.endingSoundGuideVi,
      syllablesDetected,
      vietnameseL1TrapWarning: l1TrapText,
      minimalPairAdvice: minimalPairText,
      endingSoundStatus: isMatch ? "clear" : "weak",
    };
  }
}

export async function evaluateSentenceContext(params: {
  wordItem: SpokenWordItem;
  sentenceItem?: ContextSentenceItem;
  spontaneousChallenge?: SpontaneousChallenge;
  userTranscript: string;
  mode?: "guided" | "spontaneous";
  provider?: string;
  model?: string;
}): Promise<SentenceContextEvaluation> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";
  const mode = params.mode || "guided";

  const cleanUser = params.userTranscript.trim().toLowerCase();
  const cleanTarget = params.wordItem.word.trim().toLowerCase();
  const targetWordUsed = cleanUser.includes(cleanTarget);

  // Check collocation usage
  const targetCollocation =
    mode === "spontaneous"
      ? (params.spontaneousChallenge?.targetCollocation || params.wordItem.collocations[0]?.phrase || "").toLowerCase()
      : (params.wordItem.collocations[0]?.phrase || "").toLowerCase();

  const collocationUsedNaturally =
    targetCollocation !== "" ? cleanUser.includes(targetCollocation) : targetWordUsed;

  // Approximate PVI rhythm score based on speech token cadence
  const words = cleanUser.split(/\s+/).filter(Boolean);
  const estimatedDurations = words.map((w) => w.length * 50); // rough duration proxy in ms
  const pviRhythmScore = calculateNormalizedPVI(estimatedDurations);

  if (provider === "mock") {
    const isSuccessful = targetWordUsed && cleanUser.length >= 10;
    return {
      isSuccessful,
      sentenceClarityScore: 90,
      linkingFluencyScore: 88,
      intonationScore: 86,
      overallScore: isSuccessful ? 89 : 45,
      userTranscript: params.userTranscript,
      feedbackVi:
        mode === "spontaneous"
          ? isSuccessful
            ? `Phản xạ xuất sắc! Bạn đã tự ứng biến câu nói có chứa từ "${params.wordItem.word}" và kết hợp cụm từ rất tự nhiên.`
            : `Hãy đảm bảo bạn đã dùng từ vựng mục tiêu "${params.wordItem.word}" khi trả lời thử thách phản xạ.`
          : "Bạn đã lồng ghép từ vựng vào câu rất tự nhiên và trôi chảy!",
      fluencyAdviceVi: "Hãy giữ nhịp điệu và ngữ điệu tự nhiên khi nói cả câu.",
      mode,
      targetWordUsed,
      collocationUsedNaturally,
      pviRhythmScore: pviRhythmScore > 30 ? pviRhythmScore : 65,
      suggestedAlternativeEn:
        mode === "spontaneous"
          ? `In practical speech: "I strongly suggest we ${targetCollocation || `use ${params.wordItem.word}`} before moving forward."`
          : undefined,
    };
  }

  const userPrompt =
    mode === "spontaneous"
      ? `Evaluate this Spontaneous Production Speaking attempt:
TARGET WORD: "${params.wordItem.word}"
TARGET COLLOCATION: "${targetCollocation}"
SPONTANEOUS SCENARIO PROMPT: "${params.spontaneousChallenge?.promptEn || "Free prompt"}"
USER SPOKEN TRANSCRIPT: "${params.userTranscript}"
EVALUATION MODE: spontaneous

Check if the user actively produced the target word and used it in a grammatically sound, colloquial spoken sentence.`
      : `Evaluate this Context Sentence Speaking attempt:
TARGET WORD: "${params.wordItem.word}"
EXPECTED SENTENCE: "${params.sentenceItem?.sentenceEn || ""}"
USER SPOKEN TRANSCRIPT: "${params.userTranscript}"
EVALUATION MODE: guided`;

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: SENTENCE_CONTEXT_EVALUATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 500,
      },
    });

    const parsed = cleanJson(res.text) as Record<string, unknown>;
    if (!parsed) throw new Error("Could not parse JSON");

    if (parsed.mode === undefined) parsed.mode = mode;
    if (parsed.targetWordUsed === undefined) parsed.targetWordUsed = targetWordUsed;
    if (parsed.collocationUsedNaturally === undefined) parsed.collocationUsedNaturally = collocationUsedNaturally;
    if (parsed.pviRhythmScore === undefined) parsed.pviRhythmScore = pviRhythmScore;

    const validated = sentenceContextEvaluationSchema.safeParse(parsed);
    if (!validated.success) throw new Error("Validation error");
    return validated.data as SentenceContextEvaluation;
  } catch {
    return {
      isSuccessful: targetWordUsed,
      sentenceClarityScore: 86,
      linkingFluencyScore: 84,
      intonationScore: 85,
      overallScore: targetWordUsed ? 85 : 50,
      userTranscript: params.userTranscript,
      feedbackVi:
        mode === "spontaneous"
          ? `Bạn đã ứng biến phản xạ tốt với từ vựng "${params.wordItem.word}".`
          : "Câu nói rõ ràng và truyền tải đúng ngữ cảnh!",
      fluencyAdviceVi: "Tập trung nối âm nhẹ giữa các từ trong câu.",
      mode,
      targetWordUsed,
      collocationUsedNaturally,
      pviRhythmScore: 70,
    };
  }
}
