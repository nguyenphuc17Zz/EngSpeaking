// Task Generator Service for Chunk Automaticity & Chain Building (Function 6)
// Provides 8-Stage Progressive tasks, Chain assembly tasks, and Seed Chunk Library

import { generateTextWithRouting } from "@/lib/ai";
import {
  chunkRecordSchema,
  chunkChainTaskSchema,
  chunkTrainingTaskSchema,
} from "@/lib/validation/chunk-schemas";
import {
  CHUNK_TASK_GENERATOR_SYSTEM,
  CHUNK_CHAIN_GENERATOR_SYSTEM,
} from "@/lib/ai/prompts/chunk-prompts";
import type {
  ChunkRecord,
  ChunkTrainingTask,
  ChunkChainTask,
  ChunkStage,
} from "@/types/chunk-automaticity";

export const SEED_CHUNK_LIBRARY: ChunkRecord[] = [
  {
    id: "chunk_depend_on",
    familyKey: "depend_on_conditional",
    canonicalChunk: "It depends on...",
    meaningVi: "Điều này còn phụ thuộc vào...",
    type: "sentence_frame",
    difficulty: 3,
    functionName: "Conditional Decision",
    variants: [
      { id: "v1", expression: "That really depends on...", register: "neutral", exampleSentence: "That really depends on your budget." },
      { id: "v2", expression: "It depends whether...", register: "formal", exampleSentence: "It depends whether we finish on time." },
      { id: "v3", expression: "It mostly depends on...", register: "casual", exampleSentence: "It mostly depends on the weather." },
    ],
    exampleSentences: [
      "It depends on how much free time you have.",
      "Whether we go out depends on the traffic.",
    ],
    masteryScore: 72,
    retrievalLatencyMs: 1800,
    stage: "contextual_use",
    practiceCount: 8,
    successCount: 6,
    independentSuccessCount: 5,
  },
  {
    id: "chunk_to_be_honest",
    familyKey: "to_be_honest_stance",
    canonicalChunk: "To be honest, ...",
    meaningVi: "Thành thật mà nói thì...",
    type: "conversation_opener",
    difficulty: 2,
    functionName: "Expressing Stance",
    variants: [
      { id: "v1", expression: "Honestly speaking, ...", register: "neutral", exampleSentence: "Honestly speaking, I prefer tea." },
      { id: "v2", expression: "Truth be told, ...", register: "formal", exampleSentence: "Truth be told, we need more time." },
    ],
    exampleSentences: [
      "To be honest, I didn't like the meeting.",
      "To be honest, that's not my favorite topic.",
    ],
    masteryScore: 85,
    retrievalLatencyMs: 1400,
    stage: "automaticity",
    practiceCount: 12,
    successCount: 11,
    independentSuccessCount: 10,
  },
  {
    id: "chunk_the_main_reason",
    familyKey: "the_main_reason_cause",
    canonicalChunk: "The main reason is that...",
    meaningVi: "Lý do chính là vì...",
    type: "sentence_frame",
    difficulty: 3,
    functionName: "Giving Reason",
    variants: [
      { id: "v1", expression: "The primary reason is because...", register: "formal", exampleSentence: "The primary reason is because of safety." },
      { id: "v2", expression: "Mostly because...", register: "casual", exampleSentence: "Mostly because I'm busy." },
    ],
    exampleSentences: [
      "The main reason is that it saves a lot of travel time.",
      "The main reason is that I enjoy working independently.",
    ],
    masteryScore: 65,
    retrievalLatencyMs: 2400,
    stage: "spoken_recall",
    practiceCount: 6,
    successCount: 4,
    independentSuccessCount: 3,
  },
  {
    id: "chunk_for_example",
    familyKey: "for_example_elaboration",
    canonicalChunk: "For example, ...",
    meaningVi: "Ví dụ như...",
    type: "example_giving",
    difficulty: 2,
    functionName: "Giving Illustration",
    variants: [
      { id: "v1", expression: "For instance, ...", register: "formal", exampleSentence: "For instance, last week we had a test." },
      { id: "v2", expression: "Take ... as an example", register: "neutral", exampleSentence: "Take remote work as an example." },
    ],
    exampleSentences: [
      "For example, you can take an online course.",
      "For example, yesterday I walked 5 kilometers.",
    ],
    masteryScore: 90,
    retrievalLatencyMs: 1200,
    stage: "automaticity",
    practiceCount: 15,
    successCount: 14,
    independentSuccessCount: 14,
  },
];

const MOCK_CHAIN_TASKS: ChunkChainTask[] = [
  {
    id: "chain_task_remote_work",
    topic: "Lợi ích của làm việc từ xa (Remote Work)",
    situationVi: "Đồng nghiệp hỏi vì sao bạn muốn làm việc từ xa thay vì lên công ty mỗi ngày.",
    targetQuestion: "Why do you prefer working from home?",
    blocks: [
      {
        blockType: "buffer",
        labelVi: "1. Câu đệm mở đầu",
        suggestedChunk: "Well, to be honest...",
        alternativeChunks: ["That's a good question...", "Honestly speaking..."],
      },
      {
        blockType: "stance",
        labelVi: "2. Nêu quan điểm",
        suggestedChunk: "I personally feel that...",
        alternativeChunks: ["From my perspective...", "In my experience..."],
      },
      {
        blockType: "reason",
        labelVi: "3. Nêu lý do cốt lõi",
        suggestedChunk: "The main reason is that...",
        alternativeChunks: ["Mostly because it...", "The primary reason is..."],
      },
      {
        blockType: "example",
        labelVi: "4. Dẫn chứng thực tế",
        suggestedChunk: "For example, I can...",
        alternativeChunks: ["For instance, every day I...", "Take my mornings as an example..."],
      },
    ],
    expectedAssemblyExample:
      "Well, to be honest, I personally feel that working from home is much better. The main reason is that it saves two hours of commuting every day. For example, I can use that extra time to exercise or cook a healthy breakfast.",
    targetLatencyMs: 3500,
  },
  {
    id: "chain_task_weekend_plans",
    topic: "Kế hoạch du lịch cuối tuần",
    situationVi: "Bạn bè rủ bạn đi dã ngoại cuối tuần và muốn biết quyết định của bạn.",
    targetQuestion: "Are you joining us for the camping trip this weekend?",
    blocks: [
      {
        blockType: "buffer",
        labelVi: "1. Câu đệm mở đầu",
        suggestedChunk: "Let me think for a second...",
        alternativeChunks: ["Well, I'm not sure yet...", "That sounds exciting, but..."],
      },
      {
        blockType: "stance",
        labelVi: "2. Nêu quyết định có điều kiện",
        suggestedChunk: "It depends on...",
        alternativeChunks: ["That really depends on...", "It mostly depends whether..."],
      },
      {
        blockType: "reason",
        labelVi: "3. Nêu lý do",
        suggestedChunk: "The thing is that...",
        alternativeChunks: ["The main reason is...", "Because I might have..."],
      },
      {
        blockType: "example",
        labelVi: "4. Dẫn chứng minh họa",
        suggestedChunk: "For instance, if my project...",
        alternativeChunks: ["For example, tomorrow I...", "Take Friday as an example..."],
      },
    ],
    expectedAssemblyExample:
      "Let me think for a second. It depends on my work deadline this Friday. The thing is that I have a major presentation. For instance, if my project finishes early, I will definitely join you guys!",
    targetLatencyMs: 3500,
  },
];

function cleanJson(text: string): unknown {
  let cleaned = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  // Clean invalid assignments like "var_name = " inside arrays/objects
  cleaned = cleaned.replace(/\b[a-zA-Z0-9_]+\s*=\s*(")/g, "$1");
  // Clean trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const candidate = m[0]
          .replace(/\b[a-zA-Z0-9_]+\s*=\s*(")/g, "$1")
          .replace(/,\s*([}\]])/g, "$1");
        return JSON.parse(candidate);
      } catch {}
    }
    return null;
  }
}

export async function generateChunkChainTask(options: {
  topic?: string;
  provider?: string;
  model?: string;
} = {}): Promise<ChunkChainTask> {
  const provider = options.provider || "gemini";
  const model = options.model && options.model !== "auto" ? options.model : "gemini-3.5-flash-lite";

  if (provider === "mock") {
    const selected = MOCK_CHAIN_TASKS[Math.floor(Math.random() * MOCK_CHAIN_TASKS.length)];
    return {
      ...selected,
      id: `chain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Tự kết hợp cả 4 khối và nói một mạch liên tục." },
        {
          tier: 1,
          title: "Tổng quan 4 khối",
          content: selected.blocks.map((b, i) => `Khối ${i + 1} (${b.labelVi}): "${b.suggestedChunk}"`).join(" → "),
        },
        { tier: 2, title: "Từ nối chuyển ý", content: "First of all, What is more, For example..." },
        {
          tier: 3,
          title: "Khung chuỗi câu",
          content: `${selected.blocks[0].suggestedChunk} ______ . ${selected.blocks[1].suggestedChunk} ______ .`,
        },
        { tier: 4, title: "Chuỗi câu mẫu hoàn chỉnh", content: selected.expectedAssemblyExample },
      ],
      suggestedVocabulary: [
        { term: "first of all", meaningVi: "trước hết là", partOfSpeech: "connector" },
        { term: "in fact", meaningVi: "trên thực tế", partOfSpeech: "connector" },
        { term: "for instance", meaningVi: "chẳng hạn như", partOfSpeech: "connector" },
      ],
    };
  }

  const userPrompt = `Generate a realistic Speech Chain Builder task combining 4 blocks (buffer -> stance -> reason -> example) on topic: ${
    options.topic || "Workplace / Daily life / Travel / Society & Opinions"
  }. Return strict JSON.`;

  const attemptGenerate = async (): Promise<ChunkChainTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: CHUNK_CHAIN_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `chain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      }

      // Robust block sanitization
      if (Array.isArray(parsed.blocks)) {
        parsed.blocks = (parsed.blocks as any[]).map((b, idx) => {
          const rawType = String(b.blockType || "").toLowerCase().trim();
          const validTypes = ["buffer", "stance", "reason", "example"] as const;
          const fallbackType = validTypes[idx % 4];
          const blockType = validTypes.includes(rawType as any) ? rawType : fallbackType;

          let labelVi = typeof b.labelVi === "string" && b.labelVi.trim() ? b.labelVi.trim() : "";
          if (!labelVi) {
            if (blockType === "buffer") labelVi = "Khối 1: Đệm câu (Buffer)";
            else if (blockType === "stance") labelVi = "Khối 2: Lập trường (Stance)";
            else if (blockType === "reason") labelVi = "Khối 3: Lý do (Reason)";
            else labelVi = "Khối 4: Ví dụ (Example)";
          }

          const suggestedChunk = typeof b.suggestedChunk === "string" ? b.suggestedChunk.trim() : "Well, ...";
          const alternativeChunks = Array.isArray(b.alternativeChunks)
            ? b.alternativeChunks
                .filter((item: unknown) => typeof item === "string")
                .map((item: string) => item.replace(/^[a-zA-Z0-9_]+\s*=\s*/, "").replace(/^["']|["']$/g, "").trim())
            : [];

          return { blockType, labelVi, suggestedChunk, alternativeChunks };
        });
      }

      // Robust 4-Tier hints sanitization
      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        const blocks = Array.isArray(parsed.blocks) ? (parsed.blocks as any[]) : [];
        const overview = blocks.map((b, i) => `Khối ${i + 1} (${b.labelVi || ""}): "${b.suggestedChunk || ""}"`).join(" → ");
        const example = String(parsed.expectedAssemblyExample || "");

        parsed.hints = [
          { tier: 0, title: "Không gợi ý", content: "Tự kết hợp cả 4 khối và nói một mạch liên tục." },
          { tier: 1, title: "Tổng quan 4 khối", content: overview || "Kết hợp lần lượt 4 khối" },
          { tier: 2, title: "Từ nối chuyển ý", content: "Dùng các từ nối: First of all, What is more, For instance..." },
          {
            tier: 3,
            title: "Khung chuỗi câu",
            content: blocks.length >= 2 ? `${blocks[0].suggestedChunk} ______ . ${blocks[1].suggestedChunk} ______ .` : "Khung chuỗi...",
          },
          { tier: 4, title: "Chuỗi câu mẫu hoàn chỉnh", content: example },
        ];
      } else {
        parsed.hints = (parsed.hints as any[]).map((h, i) => ({
          tier: typeof h.tier === "number" ? h.tier : i,
          title: String(h.title || `Tầng ${i}`),
          content: String(h.content || ""),
        }));
      }

      if (!Array.isArray(parsed.suggestedVocabulary)) {
        parsed.suggestedVocabulary = [
          { term: "first of all", meaningVi: "trước hết là", partOfSpeech: "connector" },
          { term: "in fact", meaningVi: "trên thực tế", partOfSpeech: "connector" },
          { term: "for instance", meaningVi: "chẳng hạn như", partOfSpeech: "connector" },
        ];
      }

      const validated = chunkChainTaskSchema.safeParse(parsed);
      if (!validated.success) {
        console.error("chunkChainTaskSchema validation failed:", JSON.stringify(validated.error.issues, null, 2));
        return null;
      }
      return validated.data as ChunkChainTask;
    } catch (err: any) {
      console.error("attemptGenerate catch error:", err?.message || err);
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  if (!task) {
    throw new Error("Không thể tạo chuỗi bài tập Chunk Chain từ AI. Vui lòng thử lại.");
  }

  return task;
}

export async function generateSingleChunkTask(options: {
  chunk?: ChunkRecord;
  stage?: ChunkStage;
  provider?: string;
  model?: string;
} = {}): Promise<ChunkTrainingTask> {
  const chunk = options.chunk || SEED_CHUNK_LIBRARY[0];
  const stage = options.stage || "contextual_use";
  const provider = options.provider || "gemini";
  const model = options.model && options.model !== "auto" ? options.model : "gemini-3.5-flash-lite";

  if (provider === "mock") {
    return {
      id: `chunk_task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      chunk,
      stage,
      situationVi: `Bạn bè hỏi ý kiến của bạn về việc lựa chọn kế hoạch. Hãy dùng cụm "${chunk.canonicalChunk}" để trả lời tự nhiên.`,
      contextDomain: "daily_life",
      promptText: "Are you free to hang out this afternoon?",
      expectedChunkUsage: chunk.canonicalChunk,
      scaffoldText: stage === "controlled_recall" ? "It ______ on my work schedule." : undefined,
      targetLatencyMs: 2500,
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Tự bật cụm từ ngay lập tức." },
        { tier: 1, title: "Cụm mục tiêu", content: `Dùng cụm: "${chunk.canonicalChunk}"` },
        {
          tier: 2,
          title: "Cụm biến thể",
          content: chunk.variants.map((v) => v.expression).join(" / "),
        },
        {
          tier: 3,
          title: "Khung câu",
          content: `Well, ${chunk.canonicalChunk} how much free time I have.`,
        },
        {
          tier: 4,
          title: "Câu mẫu hoàn chỉnh",
          content: `Well, ${chunk.canonicalChunk} my schedule, but I'd love to join you!`,
        },
      ],
      suggestedVocabulary: [
        { term: chunk.canonicalChunk, meaningVi: chunk.meaningVi, partOfSpeech: "phrase" },
        ...(chunk.variants.slice(0, 2).map((v) => ({ term: v.expression, meaningVi: "biến thể tự nhiên", partOfSpeech: "phrase" }))),
      ],
    };
  }

  const domains = ["workplace", "daily_life", "opinions", "travel"] as const;
  const domain = domains[Math.floor(Math.random() * domains.length)];

  const userPrompt = `Generate a realistic spoken communicative task for the target chunk "${chunk.canonicalChunk}" (Meaning: "${chunk.meaningVi}") in domain "${domain}" at progressive stage "${stage}".
Make sure situationVi is in natural Vietnamese and promptText is an authentic question in English. Return strict JSON.`;

  const attemptGenerate = async (): Promise<ChunkTrainingTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: CHUNK_TASK_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1200,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `chunk_task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      }
      parsed.chunk = chunk;
      parsed.stage = stage;
      parsed.expectedChunkUsage = chunk.canonicalChunk;

      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        parsed.hints = [
          { tier: 0, title: "Không gợi ý", content: "Tự bật cụm từ ngay lập tức." },
          { tier: 1, title: "Cụm mục tiêu", content: `Dùng cụm: "${chunk.canonicalChunk}"` },
          {
            tier: 2,
            title: "Cụm biến thể",
            content: chunk.variants.map((v) => v.expression).join(" / "),
          },
          {
            tier: 3,
            title: "Khung câu",
            content: `Well, ${chunk.canonicalChunk} ______ .`,
          },
          {
            tier: 4,
            title: "Câu mẫu hoàn chỉnh",
            content: `Well, ${chunk.canonicalChunk} the current situation.`,
          },
        ];
      } else {
        parsed.hints = (parsed.hints as any[]).map((h, i) => ({
          tier: typeof h.tier === "number" ? h.tier : i,
          title: String(h.title || `Tầng ${i}`),
          content: String(h.content || ""),
        }));
      }

      if (!Array.isArray(parsed.suggestedVocabulary)) {
        parsed.suggestedVocabulary = [
          { term: chunk.canonicalChunk, meaningVi: chunk.meaningVi, partOfSpeech: "phrase" },
        ];
      }

      const validated = chunkTrainingTaskSchema.safeParse(parsed);
      if (!validated.success) return null;
      return validated.data as ChunkTrainingTask;
    } catch {
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  if (!task) {
    throw new Error("Không thể tạo bài tập Chunk từ AI. Vui lòng thử lại.");
  }

  return task;
}
