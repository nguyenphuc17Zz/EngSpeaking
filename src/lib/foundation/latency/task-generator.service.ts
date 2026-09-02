// Task Generator Service for Response Latency Training (Function 4)
// Dynamic generation with Anti-Repetition and 3 Drill Modes + Baseline Test

import { generateTextWithRouting } from "@/lib/ai";
import { latencyTaskSchema } from "@/lib/validation/latency-schemas";
import { LATENCY_GENERATOR_SYSTEM, buildLatencyTaskUserPrompt } from "@/lib/ai/prompts/latency-prompts";
import type { LatencyTask, LatencyDrillMode } from "@/types/latency-training";

export interface GenerateLatencyTaskOptions {
  drillMode?: LatencyDrillMode;
  category?: string;
  targetDifficulty?: number;
  targetLatencyMs?: number;
  recentPrompts?: string[];
  provider?: string;
  model?: string;
}

const MOCK_LATENCY_POOLS: Record<LatencyDrillMode, Array<Omit<LatencyTask, "id">>> = {
  open_response: [
    {
      drillMode: "open_response",
      promptText: "What do you usually do to relax after a long day at work?",
      promptLanguage: "en",
      targetIntent: "Talking about relaxation activities after work",
      expectedKeywords: ["usually", "relax", "listen to music", "gym", "watch", "read"],
      sampleResponses: [
        "I usually listen to music or watch a movie to unwind.",
        "I normally go for a quick walk or cook dinner.",
        "I like reading a book or taking a hot bath.",
      ],
      targetLatencyMs: 3000,
      difficulty: 3,
      category: "daily_conversation",
      bufferPhraseSuggestion: "That's a good question. I usually...",
    },
    {
      drillMode: "open_response",
      promptText: "Why do you think working from home has become so popular?",
      promptLanguage: "en",
      targetIntent: "Explaining reasons why remote work is popular",
      expectedKeywords: ["flexible", "save time", "commute", "comfort", "focus"],
      sampleResponses: [
        "I think it saves a lot of commute time and offers more flexibility.",
        "In my opinion, people can focus better and balance their personal life.",
      ],
      targetLatencyMs: 3500,
      difficulty: 4,
      category: "opinions",
      bufferPhraseSuggestion: "Let me think for a second. I believe...",
    },
    {
      drillMode: "open_response",
      promptText: "What did you do last weekend that you enjoyed?",
      promptLanguage: "en",
      targetIntent: "Sharing past weekend activities using past tense",
      expectedKeywords: ["went", "visited", "hung out", "stayed", "had"],
      sampleResponses: [
        "Last weekend, I went to a coffee shop with my friends and had a great time.",
        "I stayed at home and cooked a nice dinner for my family.",
      ],
      targetLatencyMs: 3000,
      difficulty: 3,
      category: "past_events",
      bufferPhraseSuggestion: "Well, last weekend I...",
    },
  ],
  rapid_retrieval: [
    {
      drillMode: "rapid_retrieval",
      promptText: "Tôi không chắc lắm.",
      promptLanguage: "vi",
      targetIntent: "I'm not really sure.",
      expectedKeywords: ["not sure", "not certain"],
      sampleResponses: ["I'm not really sure.", "I am not quite sure.", "I'm not sure."],
      targetLatencyMs: 1800,
      difficulty: 2,
      category: "reactions",
    },
    {
      drillMode: "rapid_retrieval",
      promptText: "Để tôi kiểm tra lại đã.",
      promptLanguage: "vi",
      targetIntent: "Let me double-check that.",
      expectedKeywords: ["let me check", "double check"],
      sampleResponses: ["Let me check that.", "Let me double-check.", "I'll check on that."],
      targetLatencyMs: 1800,
      difficulty: 2,
      category: "workplace",
    },
    {
      drillMode: "rapid_retrieval",
      promptText: "Bạn nói hoàn toàn đúng.",
      promptLanguage: "vi",
      targetIntent: "You're totally right.",
      expectedKeywords: ["totally right", "agree", "absolutely"],
      sampleResponses: ["You're totally right.", "I completely agree with you.", "You're absolutely right."],
      targetLatencyMs: 1800,
      difficulty: 2,
      category: "reactions",
    },
    {
      drillMode: "rapid_retrieval",
      promptText: "Không có vấn đề gì cả.",
      promptLanguage: "vi",
      targetIntent: "No problem at all.",
      expectedKeywords: ["no problem", "no worries", "not at all"],
      sampleResponses: ["No problem at all.", "Not a problem.", "No worries."],
      targetLatencyMs: 1500,
      difficulty: 1,
      category: "reactions",
    },
  ],
  timed_countdown: [
    {
      drillMode: "timed_countdown",
      promptText: "If you had a free day tomorrow, where would you go?",
      promptLanguage: "en",
      targetIntent: "Second conditional imaginary place response",
      expectedKeywords: ["would go", "would visit", "beach", "mountains", "stay home"],
      sampleResponses: [
        "If I had a free day, I would definitely go to the beach.",
        "I would probably visit a quiet cafe and read books all day.",
      ],
      targetLatencyMs: 2500,
      difficulty: 4,
      category: "opinions",
      bufferPhraseSuggestion: "If that happened, I would...",
    },
    {
      drillMode: "timed_countdown",
      promptText: "How do you usually handle stress during busy workdays?",
      promptLanguage: "en",
      targetIntent: "Explaining stress management habits",
      expectedKeywords: ["take a break", "deep breath", "walk", "coffee", "music"],
      sampleResponses: [
        "I usually take a short walk or drink some tea to clear my head.",
        "I take deep breaths and prioritize my tasks one by one.",
      ],
      targetLatencyMs: 2500,
      difficulty: 4,
      category: "workplace",
    },
  ],
  baseline_test: [
    {
      drillMode: "baseline_test",
      promptText: "What is your favorite food and why do you like it?",
      promptLanguage: "en",
      targetIntent: "Explaining favorite food preference",
      expectedKeywords: ["favorite food", "like", "delicious", "flavor", "taste"],
      sampleResponses: ["My favorite food is noodles because of the rich and flavorful broth."],
      targetLatencyMs: 3500,
      difficulty: 3,
      category: "daily_conversation",
      isBaseline: true,
    },
    {
      drillMode: "baseline_test",
      promptText: "Describe what you usually do when you wake up in the morning.",
      promptLanguage: "en",
      targetIntent: "Morning routine description",
      expectedKeywords: ["wake up", "brush", "coffee", "breakfast", "start"],
      sampleResponses: ["When I wake up, I usually drink a glass of water and brush my teeth."],
      targetLatencyMs: 3500,
      difficulty: 3,
      category: "daily_conversation",
      isBaseline: true,
    },
  ],
};

function getMockTask(options: GenerateLatencyTaskOptions): LatencyTask {
  const mode = options.drillMode || "open_response";
  const pool = MOCK_LATENCY_POOLS[mode] || MOCK_LATENCY_POOLS.open_response;

  const recent = options.recentPrompts || [];
  const candidates = pool.filter((t) => !recent.includes(t.promptText));
  const selected = candidates.length > 0
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : pool[Math.floor(Math.random() * pool.length)];

  const id = `lat_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const buffer = selected.bufferPhraseSuggestion || "Well, to be honest...";
  const kws = (selected.expectedKeywords || []).join(" / ");
  const sample = selected.sampleResponses?.[0] || "Sample answer...";

  return {
    ...selected,
    id,
    targetLatencyMs: options.targetLatencyMs ?? selected.targetLatencyMs,
    difficulty: options.targetDifficulty ?? selected.difficulty,
    hints: selected.hints || [
      { tier: 0, title: "Không gợi ý", content: "Tự bật câu trả lời ngay lập tức." },
      { tier: 1, title: "Từ khoá cốt lõi", content: kws || "Trả lời trực tiếp ý chính" },
      { tier: 2, title: "Cụm từ đệm mở đầu", content: buffer },
      { tier: 3, title: "Khung câu", content: `${buffer} I ______ .` },
      { tier: 4, title: "Câu mẫu hoàn chỉnh", content: sample },
    ],
    suggestedVocabulary: selected.suggestedVocabulary || [
      { term: "to be honest", meaningVi: "thành thật mà nói", partOfSpeech: "phrase" },
      { term: "in my opinion", meaningVi: "theo quan điểm của tôi", partOfSpeech: "phrase" },
    ],
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

export async function generateLatencyTask(
  options: GenerateLatencyTaskOptions = {}
): Promise<LatencyTask> {
  const drillMode = options.drillMode || "open_response";
  const targetLatencyMs = options.targetLatencyMs || (drillMode === "rapid_retrieval" ? 1800 : drillMode === "timed_countdown" ? 2500 : 3000);
  const targetDifficulty = options.targetDifficulty || 3;
  const provider = options.provider || "gemini";
  const model = options.model || "auto";

  if (provider === "mock") {
    return getMockTask({ ...options, drillMode, targetLatencyMs, targetDifficulty });
  }

  const userPrompt = buildLatencyTaskUserPrompt({
    drillMode,
    category: options.category,
    targetDifficulty,
    targetLatencyMs,
    recentPrompts: options.recentPrompts,
  });

  const attemptGenerate = async (): Promise<LatencyTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: LATENCY_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `lat_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      }

      // Sanitize 4-Tier hints if missing
      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        const kws = Array.isArray(parsed.expectedKeywords) ? (parsed.expectedKeywords as string[]).join(" / ") : "";
        const buffer = String(parsed.bufferPhraseSuggestion || "Well, to be honest...");
        const sample = Array.isArray(parsed.sampleResponses) && parsed.sampleResponses[0] ? String(parsed.sampleResponses[0]) : "Sample answer...";
        parsed.hints = [
          { tier: 0, title: "Không gợi ý", content: "Tự bật câu trả lời ngay." },
          { tier: 1, title: "Từ khoá cốt lõi", content: kws || "Trả lời trực tiếp vào ý chính" },
          { tier: 2, title: "Cụm từ đệm mở đầu", content: buffer },
          { tier: 3, title: "Khung câu", content: `${buffer} I ______ .` },
          { tier: 4, title: "Câu mẫu hoàn chỉnh", content: sample },
        ];
      }

      if (!Array.isArray(parsed.suggestedVocabulary)) {
        parsed.suggestedVocabulary = [];
      }

      const validated = latencyTaskSchema.safeParse(parsed);
      if (!validated.success) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[LatencyTaskGenerator] Schema error:", validated.error);
        }
        return null;
      }
      return validated.data as LatencyTask;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[LatencyTaskGenerator] API failed:", err);
      }
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  if (!task) {
    if (provider === "mock") {
      return getMockTask({ ...options, drillMode, targetLatencyMs, targetDifficulty });
    }
    throw new Error("Không thể tạo câu hỏi phản xạ từ AI. Vui lòng thử lại.");
  }

  return task;
}
