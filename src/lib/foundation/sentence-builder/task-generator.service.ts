// Task Generation Service for Sentence Builder (Function 1)
// Dynamic AI-driven task creation with Anti-Repetition and Deterministic Fallback

import { generateTextWithRouting } from "@/lib/ai";
import { sentenceBuilderTaskSchema } from "@/lib/validation/sentence-builder-schemas";
import { TASK_GENERATOR_SYSTEM, buildTaskGeneratorUserPrompt } from "@/lib/ai/prompts/sentence-builder-prompts";
import type {
  SentenceBuilderTask,
  SentenceBuilderControlLevel,
  SentenceBuilderCategory,
} from "@/types/sentence-builder";

export interface GenerateTaskOptions {
  controlLevel?: SentenceBuilderControlLevel;
  taskType?: SentenceBuilderCategory;
  targetDifficulty?: number;
  weakSkills?: string[];
  recentErrors?: string[];
  recentPrompts?: string[];
  topic?: string;
  prepTimeSec?: number;
  provider?: string;
  model?: string;
}

// 20+ High Quality Dynamic Mock Templates for Robust Offline/Fallback Generation
const MOCK_TASK_POOLS: Record<SentenceBuilderControlLevel, Array<Omit<SentenceBuilderTask, "id">>> = {
  controlled: [
    {
      taskType: "translation_output",
      controlLevel: "controlled",
      instruction: "Hãy nói bằng tiếng Anh theo khung mẫu bên dưới:",
      promptVi: "Tôi thường uống cà phê vào buổi sáng trước khi bắt đầu làm việc.",
      targetIntent: "I usually drink coffee in the morning before starting work.",
      expectedResponses: [
        "I usually drink coffee in the morning before I start work.",
        "I normally have coffee in the morning before starting work.",
        "I usually drink coffee in the morning before working.",
      ],
      requiredElements: ["usually drink coffee", "in the morning", "before starting work"],
      scaffold: {
        level: 1,
        template: "I usually ______ in the morning before I ______.",
        keywords: ["drink coffee", "start work"],
        starter: "I usually...",
        constraints: ["Dùng thì Hiện tại đơn"],
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Tự phản xạ và nói ngay.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá chính", content: "drink coffee / morning / start work", penaltyWeight: 0.1 },
        { tier: 2, title: "Khung câu", content: "I usually [verb] in the morning before I [verb].", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I usually drink coffee...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu hoàn chỉnh", content: "I usually drink coffee in the morning before I start work.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 2, grammarComplexity: 2, retrievalDemand: 0.3, lengthScore: 2 },
      skills: ["present_simple", "sentence_construction", "routine_vocabulary"],
      grammarTargets: ["present_simple", "time_clauses"],
      vocabularyTargets: ["usually", "start work"],
      topic: "daily_routine",
      prepTimeSec: 3.0,
    },
    {
      taskType: "sentence_completion",
      controlLevel: "controlled",
      instruction: "Điền và nói trọn vẹn câu sau:",
      promptVi: "Nói về thói quen sau giờ làm của bạn.",
      sourceText: "Sau khi tan làm, tôi thường đi tập gym.",
      targetIntent: "After work, I usually go to the gym.",
      expectedResponses: [
        "After work, I usually go to the gym.",
        "I usually go to the gym after I finish work.",
        "After finishing work, I often hit the gym.",
      ],
      requiredElements: ["after work", "usually go to the gym"],
      scaffold: {
        level: 1,
        template: "After work, I usually ______.",
        keywords: ["go to the gym"],
        starter: "After work, I usually...",
        constraints: [],
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói ngay.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "after work / go to the gym", penaltyWeight: 0.1 },
        { tier: 2, title: "Khung câu", content: "After work, I usually [action].", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "After work, I usually go...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "After work, I usually go to the gym.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.4, lengthScore: 2 },
      skills: ["sentence_construction", "routine_vocabulary"],
      grammarTargets: ["adverbs_of_frequency"],
      vocabularyTargets: ["gym", "after work"],
      topic: "health_and_fitness",
      prepTimeSec: 3.0,
    },
    {
      taskType: "translation_output",
      controlLevel: "controlled",
      instruction: "Chuyển câu sau sang tiếng Anh:",
      promptVi: "Hôm qua tôi đã làm việc tại nhà vì trời mưa to.",
      targetIntent: "Yesterday I worked from home because it rained heavily.",
      expectedResponses: [
        "Yesterday I worked from home because it was raining heavily.",
        "I worked from home yesterday because of the heavy rain.",
        "Yesterday I worked at home because it rained a lot.",
      ],
      requiredElements: ["worked from home", "yesterday", "because it rained heavily"],
      scaffold: {
        level: 1,
        template: "Yesterday I ______ from home because it ______.",
        keywords: ["worked", "rained heavily"],
        starter: "Yesterday I worked...",
        constraints: ["Dùng thì Quá khứ đơn (Past Simple)"],
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói ngay.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "yesterday / worked from home / rained heavily", penaltyWeight: 0.1 },
        { tier: 2, title: "Khung câu", content: "Yesterday I [past verb] from home because it [past verb].", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "Yesterday I worked from home...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "Yesterday I worked from home because it rained heavily.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 4, grammarComplexity: 3, retrievalDemand: 0.5, lengthScore: 3 },
      skills: ["past_simple", "cause_and_effect", "work_vocabulary"],
      grammarTargets: ["past_simple_regular", "conjunction_because"],
      vocabularyTargets: ["work from home", "rain heavily"],
      topic: "work_and_weather",
      prepTimeSec: 3.0,
    },
  ],
  semi_controlled: [
    {
      taskType: "constraint_speaking",
      controlLevel: "semi_controlled",
      instruction: "Tạo và nói 1 câu hoàn chỉnh sử dụng các từ khoá sau:",
      promptVi: "Nói về việc bạn chuẩn bị cho buổi họp vào buổi sáng.",
      targetIntent: "I usually prepare my slides before the morning meeting.",
      expectedResponses: [
        "I prepare my slides before the morning meeting.",
        "I usually check the meeting notes in the morning.",
        "Before the morning meeting, I prepare all necessary documents.",
      ],
      requiredElements: ["prepare", "morning", "meeting"],
      scaffold: {
        level: 2,
        template: null,
        keywords: ["prepare", "slides / notes", "morning meeting"],
        starter: null,
        constraints: ["Dùng từ nối 'before' hoặc 'in order to'"],
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Tự tạo câu từ từ khoá.", penaltyWeight: 0 },
        { tier: 1, title: "Gợi ý ý tưởng", content: "prepare my slides / review the agenda", penaltyWeight: 0.1 },
        { tier: 2, title: "Khung cấu trúc", content: "I [action] before the morning meeting.", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I always prepare my...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "I always prepare my slides before the morning meeting.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 5, grammarComplexity: 3, retrievalDemand: 0.65, lengthScore: 3 },
      skills: ["sentence_construction", "vocabulary_retrieval", "workplace_communication"],
      grammarTargets: ["prepositional_phrases", "time_connectors"],
      vocabularyTargets: ["prepare", "meeting"],
      topic: "workplace",
      prepTimeSec: 2.0,
    },
    {
      taskType: "sentence_transformation",
      controlLevel: "semi_controlled",
      instruction: "Biến đổi câu sau sang Thể Phủ Định trong Quá Khứ:",
      promptVi: "Chuyển câu: 'I went to the office yesterday' sang phủ định (Tôi đã không đến văn phòng hôm qua vì...).",
      baseSentence: "I went to the office yesterday.",
      transformationType: "negative",
      targetIntent: "I didn't go to the office yesterday because I was sick.",
      expectedResponses: [
        "I didn't go to the office yesterday.",
        "I didn't go to the office yesterday because I was feeling unwell.",
        "Yesterday, I didn't go to the office.",
      ],
      requiredElements: ["didn't go", "office", "yesterday"],
      scaffold: {
        level: 2,
        template: null,
        keywords: ["didn't go", "office", "yesterday"],
        starter: null,
        constraints: ["Dùng trợ động từ 'didn't' + động từ nguyên mẫu"],
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói ngay câu phủ định.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "didn't go / office / yesterday", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "I didn't [verb] to the [place] yesterday.", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I didn't go to...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "I didn't go to the office yesterday.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 5, grammarComplexity: 3, retrievalDemand: 0.6, lengthScore: 3 },
      skills: ["sentence_transformation", "past_simple_negative"],
      grammarTargets: ["past_negative_did_not"],
      vocabularyTargets: ["office", "yesterday"],
      topic: "workplace",
      prepTimeSec: 2.0,
    },
    {
      taskType: "sentence_expansion",
      controlLevel: "semi_controlled",
      instruction: "Mở rộng câu gốc bằng cách thêm lý do (because) và địa điểm (where):",
      promptVi: "Câu gốc: 'I like reading books.' Hãy mở rộng câu này khi nói.",
      baseSentence: "I like reading books.",
      targetIntent: "I like reading books at the coffee shop because it helps me relax.",
      expectedResponses: [
        "I like reading books at the coffee shop because it helps me relax.",
        "I enjoy reading books in my room because it's very quiet.",
        "I like reading books on weekends because it reduces my stress.",
      ],
      requiredElements: ["like reading books", "location/time", "because + reason"],
      scaffold: {
        level: 2,
        template: null,
        keywords: ["reading books", "coffee shop / home", "because / relax"],
        starter: null,
        constraints: ["Thêm mệnh đề lý do 'because'"],
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Mở rộng và nói ngay.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "at the coffee shop / because it helps me relax", penaltyWeight: 0.1 },
        { tier: 2, title: "Khung cấu trúc", content: "I like reading books [where] because [why].", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I like reading books at the coffee shop because...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "I like reading books at the coffee shop because it helps me relax.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 6, grammarComplexity: 4, retrievalDemand: 0.7, lengthScore: 4 },
      skills: ["sentence_expansion", "complex_sentences", "active_vocabulary"],
      grammarTargets: ["complex_sentences_because", "prepositions_of_place"],
      vocabularyTargets: ["reading books", "relax"],
      topic: "hobbies_and_lifestyle",
      prepTimeSec: 2.0,
    },
  ],
  free: [
    {
      taskType: "personal_context",
      controlLevel: "free",
      instruction: "Nói tự do 1-2 câu theo tình huống (Không có từ gợi ý):",
      promptVi: "Hãy giải thích ngắn gọn tại sao bạn thích làm việc từ xa (Remote Work) hơn làm việc tại văn phòng.",
      targetIntent: "Speaker explains preference for remote work (e.g. saves commute time, more flexible).",
      expectedResponses: [
        "I prefer working remotely because it saves me two hours of commuting every day.",
        "Remote work is better for me because I can focus better and manage my own schedule.",
        "I like working from home because it gives me a better work-life balance.",
      ],
      requiredElements: ["preference for remote work", "clear reason (commute / focus / balance)"],
      scaffold: {
        level: 3,
        template: null,
        keywords: [],
        starter: null,
        constraints: [],
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói tự do theo ý bạn.", penaltyWeight: 0 },
        { tier: 1, title: "Từ vựng gợi ý", content: "prefer remote work / save commute time / work-life balance", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc đề xuất", content: "I prefer [A] because it helps me [benefit].", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I prefer working remotely because...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu tham khảo", content: "I prefer working remotely because it saves me a lot of time on commuting.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 7, grammarComplexity: 4, retrievalDemand: 0.85, lengthScore: 4 },
      skills: ["spontaneous_speech", "opinion_expression", "complex_sentence_construction"],
      grammarTargets: ["gerunds_after_prefer", "causal_connectors"],
      vocabularyTargets: ["remote work", "commute", "flexibility"],
      topic: "work_and_career",
      prepTimeSec: 1.5,
    },
    {
      taskType: "personal_context",
      controlLevel: "free",
      instruction: "Nói tự do 1-2 câu theo tình huống:",
      promptVi: "Mô tả một thói quen buổi tối giúp bạn nạp lại năng lượng sau một ngày làm việc bận rộn.",
      targetIntent: "Speaker describes an evening routine to recharge (e.g. listening to music, taking a walk, reading).",
      expectedResponses: [
        "In the evening, I usually take a short walk in the park to clear my mind.",
        "After a busy workday, I enjoy listening to acoustic music and drinking herbal tea.",
        "To unwind after work, I usually work out for 30 minutes and take a warm shower.",
      ],
      requiredElements: ["evening routine activity", "purpose (recharge / unwind / relax)"],
      scaffold: {
        level: 3,
        template: null,
        keywords: [],
        starter: null,
        constraints: [],
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói tự do.", penaltyWeight: 0 },
        { tier: 1, title: "Từ vựng gợi ý", content: "unwind / take a walk / clear my mind / recharge", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "To unwind after a busy day, I usually [action].", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "To recharge my energy in the evening, I...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu tham khảo", content: "In the evening, I usually take a short walk in the park to unwind and clear my mind.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 8, grammarComplexity: 4, retrievalDemand: 0.9, lengthScore: 5 },
      skills: ["spontaneous_speech", "descriptive_speaking", "advanced_vocabulary_retrieval"],
      grammarTargets: ["infinitive_of_purpose", "compound_predicates"],
      vocabularyTargets: ["unwind", "recharge", "routine"],
      topic: "lifestyle_and_wellbeing",
      prepTimeSec: 1.5,
    },
  ],
};

function getMockTask(options: GenerateTaskOptions): SentenceBuilderTask {
  const level = options.controlLevel || "controlled";
  const pool = MOCK_TASK_POOLS[level] || MOCK_TASK_POOLS.controlled;
  
  // Filter out recent prompts to avoid repetition
  const recent = options.recentPrompts || [];
  const candidates = pool.filter((t) => !recent.includes(t.promptVi));
  const selected = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : pool[Math.floor(Math.random() * pool.length)];

  const id = `sb_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    ...selected,
    id,
    prepTimeSec: options.prepTimeSec ?? (level === "controlled" ? 3.0 : level === "semi_controlled" ? 2.0 : 1.5),
    difficulty: {
      ...selected.difficulty,
      overall: options.targetDifficulty ?? selected.difficulty.overall,
    },
  };
}

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

export async function generateSentenceBuilderTask(
  options: GenerateTaskOptions = {}
): Promise<SentenceBuilderTask> {
  const controlLevel = options.controlLevel || "controlled";
  const targetDifficulty = options.targetDifficulty || (controlLevel === "controlled" ? 3 : controlLevel === "semi_controlled" ? 5 : 7);
  const provider = options.provider || "gemini";
  const model = options.model || "auto";

  if (provider === "mock") {
    return getMockTask({ ...options, controlLevel, targetDifficulty });
  }

  const userPrompt = buildTaskGeneratorUserPrompt({
    controlLevel,
    taskType: options.taskType,
    targetDifficulty,
    weakSkills: options.weakSkills,
    recentErrors: options.recentErrors,
    recentPrompts: options.recentPrompts,
    topic: options.topic,
    prepTimeSec: options.prepTimeSec,
  });

  let lastErrorMsg = "";
  const attemptGenerate = async (): Promise<SentenceBuilderTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: TASK_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed) {
        lastErrorMsg = "AI không trả về JSON hợp lệ: " + res.text.slice(0, 150);
        return null;
      }

      if (!parsed.id) {
        parsed.id = `sb_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      }

      // Robust sanitization for fast/lightweight LLMs (like gemini-3.5-flash-lite)
      if (parsed.sourceText === null) delete parsed.sourceText;
      if (parsed.baseSentence === null) delete parsed.baseSentence;
      if (parsed.transformationType === null) delete parsed.transformationType;
      if (typeof parsed.difficulty === "number") {
        parsed.difficulty = { overall: parsed.difficulty, grammarComplexity: 2, retrievalDemand: 0.5, lengthScore: 2 };
      }
      if (!parsed.instruction) parsed.instruction = "Hãy nói câu sau sang tiếng Anh:";
      if (!parsed.taskType) parsed.taskType = "sentence_completion";
      if (!parsed.controlLevel) parsed.controlLevel = controlLevel;
      if (!parsed.scaffold || typeof parsed.scaffold !== "object") {
        parsed.scaffold = { level: 1, template: null, keywords: [], starter: null, constraints: [] };
      }
      if (!Array.isArray(parsed.expectedResponses) || parsed.expectedResponses.length === 0) {
        parsed.expectedResponses = parsed.targetIntent ? [String(parsed.targetIntent)] : [];
      }
      if (!Array.isArray(parsed.requiredElements)) {
        parsed.requiredElements = [];
      }
      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        const intent = String(parsed.targetIntent || "");
        parsed.hints = [
          { tier: 0, title: "Không gợi ý", content: "Nói ngay không cần xem gợi ý.", penaltyWeight: 0 },
          { tier: 1, title: "Từ khoá", content: intent.split(" ").slice(0, 3).join(" "), penaltyWeight: 0.1 },
          { tier: 2, title: "Khung câu", content: (parsed.scaffold as Record<string, unknown>)?.template || "Pattern...", penaltyWeight: 0.25 },
          { tier: 3, title: "Từ mở đầu", content: intent.split(" ")[0] || "Starter...", penaltyWeight: 0.5 },
          { tier: 4, title: "Câu mẫu bản xứ", content: intent, penaltyWeight: 0.85 },
        ];
      }

      // Sanitize suggestedVocabulary
      if (!Array.isArray(parsed.suggestedVocabulary) || parsed.suggestedVocabulary.length === 0) {
        if (Array.isArray(parsed.vocabularyTargets) && parsed.vocabularyTargets.length > 0) {
          parsed.suggestedVocabulary = parsed.vocabularyTargets.map((v: unknown) => ({
            term: String(v),
            meaningVi: "",
          }));
        } else if (Array.isArray((parsed.scaffold as Record<string, unknown>)?.keywords) && ((parsed.scaffold as Record<string, unknown>)?.keywords as unknown[]).length > 0) {
          parsed.suggestedVocabulary = ((parsed.scaffold as Record<string, unknown>)?.keywords as unknown[]).map((k: unknown) => ({
            term: String(k),
            meaningVi: "",
          }));
        } else {
          parsed.suggestedVocabulary = [];
        }
      } else {
        parsed.suggestedVocabulary = parsed.suggestedVocabulary
          .map((item: unknown) => {
            if (typeof item === "string") return { term: item, meaningVi: "" };
            if (typeof item === "object" && item !== null) {
              const o = item as Record<string, unknown>;
              return {
                term: String(o.term || ""),
                meaningVi: String(o.meaningVi || ""),
                partOfSpeech: o.partOfSpeech ? String(o.partOfSpeech) : undefined,
                phonetic: o.phonetic ? String(o.phonetic) : undefined,
              };
            }
            return { term: String(item), meaningVi: "" };
          })
          .filter((it: { term: string }) => Boolean(it.term));
      }

      const validated = sentenceBuilderTaskSchema.safeParse(parsed);
      if (!validated.success) {
        lastErrorMsg = `Dữ liệu bài tập AI không đúng cấu trúc schema: ${validated.error.message.slice(0, 200)}`;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[SentenceBuilderTaskGenerator] Validation error:", validated.error);
        }
        return null;
      }
      return validated.data as SentenceBuilderTask;
    } catch (err) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[SentenceBuilderTaskGenerator] API call failed:", err);
      }
      return null;
    }
  };

  let task = await attemptGenerate();
  // Retry once if first attempt fails or returns malformed JSON
  if (!task) {
    task = await attemptGenerate();
  }

  // Pure 100% Real AI — Throw error, NEVER fallback to fake/mock data
  if (!task) {
    throw new Error(
      `Không thể tạo bài tập bằng AI (${provider} • ${model}): ${
        lastErrorMsg || "Mô hình AI không phản hồi hoặc mất kết nối mạng."
      }`
    );
  }

  return task;
}
