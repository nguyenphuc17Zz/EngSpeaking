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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesTargetWordInTranscript(transcript: string, targetWord: string): boolean {
  const cleanTranscript = transcript.trim().toLowerCase();
  const cleanTarget = targetWord.trim().toLowerCase();
  if (!cleanTranscript || !cleanTarget) return false;

  const escaped = escapeRegex(cleanTarget);
  const patterns: string[] = [`${escaped}(?:s|es|ed|d|ing|er|est|ly)?`];

  // Handle dropped trailing 'e' before -ing/-ed (e.g., collaborate -> collaborating)
  if (cleanTarget.endsWith("e") && cleanTarget.length > 3) {
    const stem = escapeRegex(cleanTarget.slice(0, -1));
    patterns.push(`${stem}(?:ing|ed|er|est|able)`);
  }
  // Handle trailing 'y' -> 'ies' / 'ied'
  if (cleanTarget.endsWith("y") && cleanTarget.length > 2) {
    const stem = escapeRegex(cleanTarget.slice(0, -1));
    patterns.push(`${stem}(?:ies|ied|ier|iest|ily)`);
  }
  // Handle doubled final consonant before -ing/-ed (e.g., plan -> planning)
  if (cleanTarget.length >= 3 && /[b-df-hj-np-tv-z]$/.test(cleanTarget)) {
    const lastChar = escapeRegex(cleanTarget[cleanTarget.length - 1]);
    patterns.push(`${escaped}${lastChar}(?:ing|ed|er|est)`);
  }

  const regex = new RegExp(`\\b(?:${patterns.join("|")})\\b`, "i");
  return regex.test(cleanTranscript);
}

export async function evaluateWordPronunciation(params: {
  wordItem: SpokenWordItem;
  userTranscript: string;
  provider?: string;
  model?: string;
  forceAi?: boolean;
}): Promise<WordPronunciationEvaluation> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  const cleanUser = params.userTranscript.trim().toLowerCase();
  const cleanTarget = params.wordItem.word.trim().toLowerCase();
  const isMatch = matchesTargetWordInTranscript(cleanUser, cleanTarget);

  // Pre-compute acoustic & phonological breakdown
  const phonemeAnalysis = decomposeIpa(params.wordItem.ipaUS);
  const minimalPair = getMinimalPairContrast(params.wordItem.word);
  const weightedScore = calculateWeightedPhonemeScore(params.wordItem.ipaUS, cleanUser, {
    targetWord: cleanTarget,
  });

  const topL1Pitfall = phonemeAnalysis.vietnameseL1Pitfalls[0];
  const l1TrapText = topL1Pitfall
    ? `${topL1Pitfall.titleVi}: ${topL1Pitfall.descriptionVi}`
    : "Chú ý giữ âm đuôi dứt khoát và phát âm rõ âm tiết mang trọng âm.";

  const minimalPairText = minimalPair
    ? `Tránh nhầm với "${minimalPair.confusedWord}" (${minimalPair.confusedIpa}): ${minimalPair.explanationVi}`
    : undefined;

  const syllablesDetected = phonemeAnalysis.syllables.map((s) => (s.isPrimaryStressed ? `[${s.raw}]` : s.raw));

  // 1. 0ms / 0-Token Deterministic Fast-Pass when STT cleanly recognizes the target word (or mock provider)
  if (provider === "mock" || (!params.forceAi && isMatch)) {
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

  // 2. Compact LLM Phonological Diagnostic when STT heard a near-miss / mispronunciation
  const userPrompt = `WORD PRONUNCIATION EVAL:
TARGET: "${params.wordItem.word}" (${params.wordItem.ipaUS}) | Primary Stress: Syllable ${phonemeAnalysis.primaryStressIndex + 1}
CODAS: ${phonemeAnalysis.criticalEndingConsonants.join(", ") || "None"}
SPOKEN TRANSCRIPT HEARD BY STT: "${params.userTranscript}"
Return strict JSON.`;

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: WORD_PRONUNCIATION_EVALUATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 350,
      },
    });

    const parsed = cleanJson(res.text) as Record<string, unknown>;
    if (!parsed) throw new Error("Could not parse JSON");

    if (!parsed.userTranscript) parsed.userTranscript = params.userTranscript;
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
  forceAi?: boolean;
}): Promise<SentenceContextEvaluation> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";
  const mode = params.mode || "guided";

  const cleanUser = params.userTranscript.trim().toLowerCase();
  const cleanTarget = params.wordItem.word.trim().toLowerCase();
  const targetWordUsed = matchesTargetWordInTranscript(cleanUser, cleanTarget);

  // Check collocation usage
  const targetCollocation =
    mode === "spontaneous"
      ? (params.spontaneousChallenge?.targetCollocation || params.wordItem.collocations[0]?.phrase || "").toLowerCase()
      : (params.wordItem.collocations[0]?.phrase || "").toLowerCase();

  const collocationUsedNaturally =
    targetCollocation !== "" ? matchesTargetWordInTranscript(cleanUser, targetCollocation) || cleanUser.includes(targetCollocation) : targetWordUsed;

  // Approximate PVI rhythm score based on speech token cadence
  const words = cleanUser.split(/\s+/).filter(Boolean);
  const estimatedDurations = words.map((w) => w.length * 50); // rough duration proxy in ms
  const pviRhythmScore = calculateNormalizedPVI(estimatedDurations);

  // Check guided sentence overlap for 0ms Fast-Pass
  const expectedGuidedWords = (params.sentenceItem?.sentenceEn || "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const userWordSet = new Set(words.map((w) => w.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "")));
  const guidedOverlapRatio =
    expectedGuidedWords.length > 0
      ? expectedGuidedWords.filter((w) => userWordSet.has(w)).length / expectedGuidedWords.length
      : 0;

  const canFastPassGuided = mode === "guided" && targetWordUsed && guidedOverlapRatio >= 0.8;
  const canFastPassSpontaneous = mode === "spontaneous" && targetWordUsed && collocationUsedNaturally && words.length >= 6;

  if (provider === "mock" || (!params.forceAi && (canFastPassGuided || canFastPassSpontaneous))) {
    const isSuccessful = targetWordUsed && cleanUser.length >= 10;
    return {
      isSuccessful,
      sentenceClarityScore: 92,
      linkingFluencyScore: 90,
      intonationScore: 89,
      overallScore: isSuccessful ? 91 : 45,
      userTranscript: params.userTranscript,
      feedbackVi:
        mode === "spontaneous"
          ? isSuccessful
            ? `Phản xạ xuất sắc! Bạn đã tự ứng biến câu nói có chứa từ "${params.wordItem.word}" và kết hợp cụm từ rất tự nhiên.`
            : `Hãy đảm bảo bạn đã dùng từ vựng mục tiêu "${params.wordItem.word}" khi trả lời thử thách phản xạ.`
          : "Bạn đã lồng ghép từ vựng vào câu rất tự nhiên, nối âm và nhịp điệu trôi chảy!",
      fluencyAdviceVi: params.sentenceItem?.rhythmNoteVi || "Hãy giữ nhịp điệu và ngữ điệu tự nhiên khi nói cả câu.",
      mode,
      targetWordUsed,
      collocationUsedNaturally,
      pviRhythmScore: pviRhythmScore > 30 ? pviRhythmScore : 72,
      suggestedAlternativeEn:
        mode === "spontaneous"
          ? `In practical speech: "I strongly suggest we ${targetCollocation || `use ${params.wordItem.word}`} before moving forward."`
          : undefined,
    };
  }

  const userPrompt =
    mode === "spontaneous"
      ? `SPONTANEOUS CONTEXT EVAL:
WORD: "${params.wordItem.word}" | COLLOCATION: "${targetCollocation}"
PROMPT: "${params.spontaneousChallenge?.promptEn || "Free prompt"}"
SPOKEN: "${params.userTranscript}"
Return strict JSON.`
      : `GUIDED CONTEXT EVAL:
WORD: "${params.wordItem.word}" | EXPECTED: "${params.sentenceItem?.sentenceEn || ""}"
SPOKEN: "${params.userTranscript}"
Return strict JSON.`;

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: SENTENCE_CONTEXT_EVALUATOR_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 380,
      },
    });

    const parsed = cleanJson(res.text) as Record<string, unknown>;
    if (!parsed) throw new Error("Could not parse JSON");

    if (parsed.userTranscript === undefined) parsed.userTranscript = params.userTranscript;
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
