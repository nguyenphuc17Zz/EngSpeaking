// Task Generator Service for Vietnamese -> English Spoken Retrieval (Function 2)
// Dynamic AI generation with Anti-Repetition and 3 Retrieval Modes

import { generateTextWithRouting } from "@/lib/ai";
import { vnToENTaskSchema } from "@/lib/validation/vn-to-en-schemas";
import { VN_TO_EN_GENERATOR_SYSTEM, buildVNToENTaskPrompt } from "@/lib/ai/prompts/vn-to-en-prompts";
import type { VNToENTask, VNToENRetrievalMode, VNPromptCategory } from "@/types/vn-to-en";

export interface GenerateVNTaskOptions {
  retrievalMode?: VNToENRetrievalMode;
  category?: VNPromptCategory;
  targetDifficulty?: number;
  weakSkills?: string[];
  recentErrors?: string[];
  recentPrompts?: string[];
  topic?: string;
  provider?: string;
  model?: string;
}

const MOCK_VN_POOLS: Record<VNToENRetrievalMode, Array<Omit<VNToENTask, "id">>> = {
  direct: [
    {
      category: "daily_life",
      retrievalMode: "direct",
      promptVi: "Tôi thường uống một tách cà phê vào buổi sáng trước khi bắt đầu làm việc.",
      targetIntent: "I usually drink a cup of coffee in the morning before starting work.",
      expectedResponses: [
        "I usually drink a cup of coffee in the morning before I start work.",
        "I normally have a cup of coffee in the morning before work.",
        "I usually grab a cup of coffee in the morning before starting my work.",
      ],
      requiredMeaningElements: ["usually drink coffee", "in the morning", "before starting work"],
      targetSkills: ["present_simple", "daily_routine", "spoken_retrieval"],
      difficulty: { overall: 3, grammarComplexity: 2, retrievalDemand: 0.4, semanticDensity: 2 },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Tự phản xạ và nói ngay.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá chính", content: "cup of coffee / morning / start work", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc gợi ý", content: "Dùng thì Hiện tại đơn: I usually [verb] before I [verb].", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I usually drink a cup of coffee...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu hoàn chỉnh", content: "I usually drink a cup of coffee in the morning before I start work.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 2.5,
      isRapidFire: false,
      topic: "daily_routine",
    },
    {
      category: "workplace",
      retrievalMode: "direct",
      promptVi: "Tôi đang cố gắng hoàn thành báo cáo này trước buổi họp chiều nay.",
      targetIntent: "I'm trying to finish this report before the meeting this afternoon.",
      expectedResponses: [
        "I'm trying to finish this report before this afternoon's meeting.",
        "I am working on finishing this report before the meeting this afternoon.",
        "I'm trying to wrap up this report before our afternoon meeting.",
      ],
      requiredMeaningElements: ["trying to finish", "this report", "before the meeting this afternoon"],
      targetSkills: ["present_continuous", "workplace_collocations", "spoken_retrieval"],
      difficulty: { overall: 4, grammarComplexity: 3, retrievalDemand: 0.5, semanticDensity: 3 },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói trực tiếp.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "trying to finish / report / afternoon meeting", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "Dùng thì Hiện tại tiếp diễn: I am trying to [verb]...", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I'm trying to finish this report...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "I'm trying to finish this report before the meeting this afternoon.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 2.5,
      isRapidFire: false,
      topic: "workplace",
    },
    {
      category: "opinion",
      retrievalMode: "direct",
      promptVi: "Tôi nghĩ làm việc từ xa giúp tôi tiết kiệm rất nhiều thời gian đi lại.",
      targetIntent: "I think working remotely helps me save a lot of commute time.",
      expectedResponses: [
        "I think working from home saves me a lot of commuting time.",
        "In my opinion, remote work helps me save a lot of time on commuting.",
        "I believe working remotely saves me so much commute time.",
      ],
      requiredMeaningElements: ["think/believe working remotely", "saves a lot of commute time"],
      targetSkills: ["opinion_expression", "gerund_as_subject", "spoken_retrieval"],
      difficulty: { overall: 5, grammarComplexity: 3, retrievalDemand: 0.6, semanticDensity: 3 },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Diễn đạt ý kiến.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "working remotely / save / commute time", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "I think [V-ing] helps me [verb]...", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I think working remotely helps me...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "I think working remotely helps me save a lot of commute time.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 2.5,
      isRapidFire: false,
      topic: "work_and_lifestyle",
    },
  ],
  timed: [
    {
      category: "experience",
      retrievalMode: "timed",
      promptVi: "Tôi chưa bao giờ đi du lịch nước ngoài một mình trước đây.",
      targetIntent: "I have never traveled abroad alone before.",
      expectedResponses: [
        "I have never traveled abroad by myself before.",
        "I've never been on a solo trip abroad before.",
        "I have never traveled overseas alone before.",
      ],
      requiredMeaningElements: ["have never traveled abroad", "alone / by myself", "before"],
      targetSkills: ["present_perfect", "travel_vocabulary", "spoken_retrieval"],
      difficulty: { overall: 5, grammarComplexity: 3, retrievalDemand: 0.7, semanticDensity: 3 },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói ngay khi hết đếm lùi.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "never traveled abroad / alone / before", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "Dùng thì Hiện tại hoàn thành: I have never [V3]...", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I have never traveled abroad...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "I have never traveled abroad alone before.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 2.0,
      isRapidFire: false,
      topic: "travel_and_experience",
    },
    {
      category: "conditional",
      retrievalMode: "timed",
      promptVi: "Nếu ngày mai trời không mưa, chúng tôi sẽ đi cắm trại ở ngoại ô.",
      targetIntent: "If it doesn't rain tomorrow, we will go camping in the countryside.",
      expectedResponses: [
        "If it doesn't rain tomorrow, we'll go camping in the suburbs.",
        "Unless it rains tomorrow, we are going camping outside the city.",
        "If the weather is nice tomorrow, we will go camping.",
      ],
      requiredMeaningElements: ["if it doesn't rain tomorrow", "we will go camping", "countryside / suburbs"],
      targetSkills: ["first_conditional", "outdoor_activities", "spoken_retrieval"],
      difficulty: { overall: 6, grammarComplexity: 4, retrievalDemand: 0.75, semanticDensity: 3 },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói theo áp lực thời gian.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "doesn't rain tomorrow / go camping / countryside", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "Câu điều kiện loại 1: If it [present], we will [future].", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "If it doesn't rain tomorrow, we will...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "If it doesn't rain tomorrow, we will go camping in the countryside.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 2.0,
      isRapidFire: false,
      topic: "weather_and_leisure",
    },
  ],
  rapid_fire: [
    {
      category: "situational_intent",
      retrievalMode: "rapid_fire",
      promptVi: "Tôi không chắc lắm.",
      targetIntent: "I'm not really sure.",
      expectedResponses: [
        "I'm not sure.",
        "I'm not really sure.",
        "I am not quite sure.",
      ],
      requiredMeaningElements: ["not sure / uncertain"],
      targetSkills: ["rapid_collocation", "automatic_response"],
      difficulty: { overall: 2, grammarComplexity: 1, retrievalDemand: 0.8, semanticDensity: 1 },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Bật phản xạ dưới 2s!", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "not sure", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "I'm not...", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I'm not...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "I'm not really sure.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 1.0,
      isRapidFire: true,
      topic: "rapid_conversation",
    },
    {
      category: "situational_intent",
      retrievalMode: "rapid_fire",
      promptVi: "Để tôi kiểm tra lại đã.",
      targetIntent: "Let me double-check.",
      expectedResponses: [
        "Let me check.",
        "Let me double-check.",
        "I will check it out.",
      ],
      requiredMeaningElements: ["let me check / will check"],
      targetSkills: ["rapid_collocation", "work_phrases"],
      difficulty: { overall: 2, grammarComplexity: 1, retrievalDemand: 0.8, semanticDensity: 1 },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Bật phản xạ ngay!", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "let me check", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "Let me [verb]...", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "Let me...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "Let me check.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 1.0,
      isRapidFire: true,
      topic: "rapid_conversation",
    },
    {
      category: "situational_intent",
      retrievalMode: "rapid_fire",
      promptVi: "Tôi hoàn toàn đồng ý với bạn.",
      targetIntent: "I totally agree with you.",
      expectedResponses: [
        "I totally agree with you.",
        "I completely agree.",
        "You're absolutely right.",
      ],
      requiredMeaningElements: ["totally/completely agree"],
      targetSkills: ["agreement_phrases", "rapid_response"],
      difficulty: { overall: 3, grammarComplexity: 1, retrievalDemand: 0.8, semanticDensity: 1 },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói ngay!", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "totally agree", penaltyWeight: 0.1 },
        { tier: 2, title: "Cấu trúc", content: "I [adverb] agree with you.", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "I totally agree...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "I totally agree with you.", penaltyWeight: 0.9 },
      ],
      prepTimeSec: 1.0,
      isRapidFire: true,
      topic: "rapid_conversation",
    },
  ],
};

function getMockTask(options: GenerateVNTaskOptions): VNToENTask {
  const mode = options.retrievalMode || "direct";
  const pool = MOCK_VN_POOLS[mode] || MOCK_VN_POOLS.direct;
  
  const recent = options.recentPrompts || [];
  const candidates = pool.filter((t) => !recent.includes(t.promptVi));
  const selected = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : pool[Math.floor(Math.random() * pool.length)];

  const id = `vn_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    ...selected,
    id,
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

export async function generateVNToENTask(
  options: GenerateVNTaskOptions = {}
): Promise<VNToENTask> {
  const retrievalMode = options.retrievalMode || "direct";
  const targetDifficulty = options.targetDifficulty || (retrievalMode === "rapid_fire" ? 2 : retrievalMode === "timed" ? 5 : 3);
  const provider = options.provider || "gemini";
  const model = options.model || "auto";

  if (provider === "mock") {
    return getMockTask({ ...options, retrievalMode, targetDifficulty });
  }

  const userPrompt = buildVNToENTaskPrompt({
    retrievalMode,
    category: options.category,
    targetDifficulty,
    weakSkills: options.weakSkills,
    recentErrors: options.recentErrors,
    recentPrompts: options.recentPrompts,
    topic: options.topic,
  });

  let lastErrorMsg = "";

  const attemptGenerate = async (): Promise<VNToENTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: VN_TO_EN_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 900,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed) {
        lastErrorMsg = "AI trả về nội dung không phải JSON hợp lệ.";
        return null;
      }

      if (!parsed.id) {
        parsed.id = `vn_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      }

      const intent = String(parsed.targetIntent || "");

      // Ensure expectedResponses
      if (!Array.isArray(parsed.expectedResponses) || parsed.expectedResponses.length === 0) {
        parsed.expectedResponses = intent ? [intent] : ["I understand."];
      }

      // Ensure requiredMeaningElements
      if (!Array.isArray(parsed.requiredMeaningElements) || parsed.requiredMeaningElements.length === 0) {
        parsed.requiredMeaningElements = intent ? intent.split(" ").slice(0, 3) : ["communicate intent"];
      }

      // Ensure hints
      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        parsed.hints = [
          { tier: 0, title: "Không gợi ý", content: "Tự phản xạ và nói ngay.", penaltyWeight: 0 },
          { tier: 1, title: "Từ khoá chính", content: intent.split(" ").slice(0, 3).join(" "), penaltyWeight: 0.1 },
          { tier: 2, title: "Cấu trúc gợi ý", content: "Dùng cấu trúc câu tự nhiên diễn đạt ý.", penaltyWeight: 0.25 },
          { tier: 3, title: "Từ mở đầu", content: intent.split(" ").slice(0, 2).join(" "), penaltyWeight: 0.5 },
          { tier: 4, title: "Câu mẫu hoàn chỉnh", content: intent, penaltyWeight: 0.9 },
        ];
      }

      // Sanitize suggestedVocabulary
      if (!Array.isArray(parsed.suggestedVocabulary) || parsed.suggestedVocabulary.length === 0) {
        parsed.suggestedVocabulary = [];
      } else {
        parsed.suggestedVocabulary = (parsed.suggestedVocabulary as unknown[])
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

      const validated = vnToENTaskSchema.safeParse(parsed);
      if (!validated.success) {
        lastErrorMsg = `Dữ liệu bài tập AI không đúng schema: ${validated.error.message.slice(0, 150)}`;
        if (process.env.NODE_ENV !== "production") {
          console.warn("[VNToENTaskGenerator] Validation error:", validated.error);
        }
        return null;
      }
      return validated.data as VNToENTask;
    } catch (err) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[VNToENTaskGenerator] API call failed:", err);
      }
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate(); // retry once

  if (!task) {
    throw new Error(
      lastErrorMsg
        ? `Lỗi kết nối AI (${provider}/${model}): ${lastErrorMsg}`
        : `Không thể tạo bài tập từ AI (${provider}). Vui lòng kiểm tra lại API Key hoặc hạn mức dịch vụ.`
    );
  }

  return task;
}
