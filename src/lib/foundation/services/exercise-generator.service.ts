// Exercise generation service — AI + Zod + regenerate once §57, token-optimized §59
import { generateTextWithRouting } from "@/lib/ai";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";
import { foundationExerciseSchema } from "@/lib/validation/foundation-schemas";
import { EXERCISE_GENERATOR_SYSTEM, buildExerciseUserPrompt } from "@/lib/foundation/prompts/exercise-generator";
import type { FoundationExercise } from "@/types/foundation";
import { getLevelForSkill } from "@/lib/foundation/skills/taxonomy";
import { scalarToDims, dimsToScalar } from "@/lib/foundation/difficulty/model";
import type { GenerateExerciseParams } from "@/lib/foundation/engines/exercise-engine";

function mockExercise(params: GenerateExerciseParams): FoundationExercise {
  const skill = params.skill || "sentence_retrieval";
  const type = params.type || "one_sentence";
  const difficulty = params.difficulty ?? 5;
  const level = params.level ?? getLevelForSkill(skill, difficulty);
  const id = `mock_ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const prompts: Record<string, string> = {
    one_sentence: "What did you do yesterday?",
    chunk_practice: 'Use the chunk "I think..." in a natural sentence about your weekend.',
    pattern_practice: 'Pattern: "If I had more time, I would..." — make it personal.',
    substitution: 'Base: "I go to the gym every morning." Change the frequency.',
    answer_expansion: 'Base: "I like coffee." Expand by adding where and why.',
    controlled_speaking: "Talk about your job using past tense and give one reason.",
    timed_speaking: "Speak for 30 seconds about your favorite hobby.",
    rapid_response: "Answer quickly: What do you usually eat for breakfast?",
    follow_up: "You said you like traveling. Where would you like to go next?",
    stimulus_speaking: "Describe this situation: You missed your morning train and are late for work.",
    translation_bridge: "Vietnamese: \"Tôi thường làm việc tại nhà.\" → Say it in English.",
    vocabulary_activation: 'Use the word "challenge" in a personal sentence.',
    grammar_speaking: "Talk about a past experience using past perfect or simple past.",
    pronunciation_micro: 'Practice: "I\'d like to think about it." — say it clearly.',
    repeat: "Listen and repeat: 'I’m really looking forward to the weekend.'",
    shadow: "Shadow this sentence at 1.0x: 'The project was more difficult than I expected.'",
    confidence: "Speak for 20 seconds about your daily routine — keep going even if imperfect.",
    recovery: "You froze mid-sentence. Try this recovery: 'Let me think for a second...'",
    self_correction: "Try to self-correct: 'Yesterday I go...' → fix the tense.",
    repeat_until_better: "Retry your last answer, make it one sentence longer.",
    micro_monologue: "Monologue 45s: Talk about your weekend plans.",
  };
  return {
    id,
    skill,
    type: type as FoundationExercise["type"],
    level,
    difficulty,
    instruction: instructionFor(type, difficulty),
    prompt: prompts[type] || prompts.one_sentence,
    targetPhrase: type === "chunk_practice" ? "I think..." : undefined,
    targetPattern: type === "pattern_practice" ? "If I had more time, I would..." : undefined,
    constraints: type === "controlled_speaking" ? [{ type: "tense", instruction: "Use past tense", target: "past" }] : undefined,
    expectedDurationSec: durationFor(type, difficulty),
    hintPolicy: { maxHints: 3, allowSentenceStarter: true, allowModelAnswer: true },
    evaluationCriteria: [{ dimension: "completion", weight: 1, description: "Completed the task in spoken English" }],
    topic: params.topic || "general",
    source: "mock",
  };
}

function instructionFor(type: string, difficulty: number): string {
  const map: Record<string, string> = {
    one_sentence: "Trả lời bằng một câu tiếng Anh tự nhiên.",
    chunk_practice: "Dùng cụm từ mục tiêu trong một câu cá nhân.",
    pattern_practice: "Bắt chước mẫu câu rồi biến đổi cho cá nhân bạn.",
    substitution: "Nghe câu gốc, thay đổi yếu tố được yêu cầu và nói lại.",
    repeat: "Nghe và lặp lại chính xác.",
    shadow: "Nghe và nhại theo (shadowing) cùng nhịp.",
    answer_expansion: "Mở rộng câu trả lời bằng cách thêm where/when/why.",
    controlled_speaking: "Nói theo ràng buộc đã cho.",
    timed_speaking: `Nói liên tục trong ${durationFor(type, difficulty)}s.`,
    rapid_response: "Bắt đầu nói trong 3 giây!",
    follow_up: "Trả lời câu hỏi tiếp nối.",
    stimulus_speaking: "Mô tả tình huống đã cho bằng tiếng Anh.",
    translation_bridge: "Chuyển câu tiếng Việt sang tiếng Anh và nói.",
    vocabulary_activation: "Dùng từ mục tiêu trong câu nói tự nhiên.",
    grammar_speaking: "Nói dùng ngữ pháp mục tiêu.",
    pronunciation_micro: "Luyện phát âm cụm mục tiêu.",
    confidence: "Nói liên tục, không dừng — hoàn thành là ưu tiên.",
    recovery: "Dùng cụm phục hồi để tiếp tục khi bí.",
    self_correction: "Thử tự sửa lỗi khi nghe gợi ý.",
    repeat_until_better: "Thử lại và làm tốt hơn lần trước.",
    micro_monologue: "Độc thoại ngắn về chủ đề đã cho.",
  };
  return map[type] || "Nói bằng tiếng Anh theo yêu cầu.";
}

function durationFor(type: string, difficulty: number): number {
  if (type === "timed_speaking") return difficulty <= 4 ? 15 : difficulty <= 7 ? 30 : 45;
  if (type === "micro_monologue") return difficulty <= 4 ? 15 : difficulty <= 7 ? 30 : 60;
  if (type === "confidence") return 20;
  if (type === "shadow" || type === "repeat") return 10;
  return 20;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Remove markdown fences if present
  const withoutFence = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    // Try to find first {...} block
    const m = withoutFence.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch {}
    }
    return null;
  }
}

import {
  sampleBankTask,
  saveBankTask,
  getFallbackBankTask,
} from "@/lib/foundation/services/content-bank.service";

export interface GenerateExerciseOptions {
  provider?: string;
  model?: string;
  userId?: string;
  forceSource?: "bank" | "ai" | "auto";
  bankRatio?: number;
}

export async function generateExercise(
  params: GenerateExerciseParams,
  opts?: GenerateExerciseOptions
): Promise<FoundationExercise> {
  const difficulty = params.difficulty ?? 5;
  const level = params.level ?? getLevelForSkill(params.skill || "sentence_retrieval", difficulty);

  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";

  // Mock fast path strictly for unit tests
  if (provider === "mock") {
    return mockExercise({ ...params, difficulty, level });
  }

  // 1. Content Bank 70/30 Policy Lookup
  try {
    const cached = await sampleBankTask<FoundationExercise>({
      module: "foundation_exercise",
      category: params.type || "one_sentence",
      level: String(level),
      difficulty,
      topic: params.topic,
      userId: opts?.userId,
      forceSource: opts?.forceSource,
      bankRatio: opts?.bankRatio,
    });
    if (cached) {
      return {
        ...cached.task,
        source: "bank",
      };
    }
  } catch (bankErr) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ExerciseGenerator] Bank lookup warning:", bankErr);
    }
  }

  // 2. Real-time AI Generation
  const userPrompt = buildExerciseUserPrompt({ ...params, difficulty, level });
  let lastErrorMsg = "";

  const attemptOnce = async (): Promise<FoundationExercise | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: EXERCISE_GENERATOR_SYSTEM,
          temperature: 0.6,
          maxOutputTokens: 700,
        },
      });
      const parsed = extractJson(res.text);
      if (!parsed) {
        lastErrorMsg = "AI trả về nội dung không phải JSON hợp lệ";
        return null;
      }
      // Ensure id exists
      const withId = parsed as Record<string, unknown>;
      if (!withId.id) withId.id = `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      if (!withId.source) withId.source = "ai";
      // Validate
      const validated = foundationExerciseSchema.safeParse(withId);
      if (!validated.success) {
        lastErrorMsg = `Dữ liệu không khớp schema: ${validated.error.message.slice(0, 150)}`;
        return null;
      }
      // Quality check §57
      if (!validated.data.instruction || validated.data.evaluationCriteria.length === 0) {
        lastErrorMsg = "Thiếu instruction hoặc evaluationCriteria";
        return null;
      }
      if (validated.data.difficulty < 1 || validated.data.difficulty > 10) {
        lastErrorMsg = "Difficulty ngoài khoảng 1-10";
        return null;
      }
      return validated.data as unknown as FoundationExercise;
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      return null;
    }
  };

  let exercise = await attemptOnce();
  if (!exercise) exercise = await attemptOnce(); // regenerate once §57

  if (exercise) {
    // 3. Asynchronously save to Content Bank for future reuse
    saveBankTask({
      module: "foundation_exercise",
      category: exercise.type,
      level: String(exercise.level),
      difficulty: exercise.difficulty,
      topic: exercise.topic,
      hashSourceText: exercise.prompt || exercise.instruction,
      payload: exercise,
      qualityScore: 9,
    }).catch((saveErr) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[ExerciseGenerator] Failed to save exercise to content bank:", saveErr);
      }
    });

    return exercise;
  }

  // 4. Emergency Fallback: Pool -> Error
  try {
    const fallback = await getFallbackBankTask<FoundationExercise>({
      module: "foundation_exercise",
      category: params.type || "one_sentence",
      level: String(level),
    });
    if (fallback) {
      return {
        ...fallback,
        source: "bank",
      };
    }
  } catch {}

  throw new Error(
    `Không thể tạo bài tập Foundation Exercise từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
  );
}

// Re-export mock for explicit use
export { mockExercise };
