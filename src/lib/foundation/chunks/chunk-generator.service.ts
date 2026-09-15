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
  buildPragmaticChainUserPrompt,
} from "@/lib/ai/prompts/chunk-prompts";
import type {
  ChunkRecord,
  ChunkTrainingTask,
  ChunkChainTask,
  ChunkStage,
  PragmaticStrategyType,
} from "@/types/chunk-automaticity";
import {
  samplePragmaticDAG,
  PRAGMATIC_DAG_STRATEGIES,
  DYNAMIC_SCENARIO_SEEDS,
} from "./pragmatic-dag.engine";
import { sampleBankTask, saveBankTask, recordUserExposure } from "@/lib/foundation/services/content-bank.service";

import { SEED_CHUNK_LIBRARY } from "./seed-chunks";
export { SEED_CHUNK_LIBRARY };

// Minimal test fixture strictly for offline test runner when provider === "mock"
export function getMockChainTask(topic?: string, strategy: PragmaticStrategyType = "opinion_defense"): ChunkChainTask {
  const strategyDef = PRAGMATIC_DAG_STRATEGIES[strategy] || PRAGMATIC_DAG_STRATEGIES.opinion_defense;
  const seed = DYNAMIC_SCENARIO_SEEDS[0];

  return {
    id: `chain_test_${Date.now()}`,
    topic: topic || seed.topic,
    pragmaticStrategy: strategyDef.strategy,
    strategyTitleVi: strategyDef.titleVi,
    strategyDescriptionVi: strategyDef.descriptionVi,
    persona: seed.persona,
    domain: seed.domain,
    situationVi: seed.situationVi,
    targetQuestion: seed.targetQuestion,
    blocks: strategyDef.blocksBlueprint.map((b) => ({
      blockType: b.blockType,
      labelVi: b.labelVi,
      suggestedChunk: b.suggestedChunk,
      alternativeChunks: b.alternativeChunks,
      rhetoricalRole: b.rhetoricalRole,
      transitionConnector: b.transitionConnector,
    })),
    expectedAssemblyExample:
      "Well, to be honest, I personally feel that working from home is much better because it saves commute time. For example, in my daily routine, I can dedicate an extra two hours to deep focused work.",
    targetLatencyMs: strategyDef.recommendedLatencyMs,
    hints: [
      { tier: 0, title: "Không gợi ý", content: "Tự kết hợp cả 4 khối và nói một mạch liên tục." },
      { tier: 1, title: "Tổng quan 4 khối", content: "Đệm → Quan điểm → Lý do → Ví dụ" },
      { tier: 2, title: "Từ nối chuyển ý", content: "First of all, What is more, For example..." },
      { tier: 3, title: "Khung chuỗi câu", content: "Well, to be honest... I personally feel that..." },
      { tier: 4, title: "Chuỗi câu mẫu hoàn chỉnh", content: "Well, to be honest, I personally feel that working from home is much better because it saves commute time." },
    ],
    suggestedVocabulary: [
      { term: "first of all", meaningVi: "trước hết là", partOfSpeech: "connector" },
      { term: "dedicate", meaningVi: "dành trọn cho", partOfSpeech: "verb" },
    ],
  };
}

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

export function getMockSingleChunkTask(
  chunk: ChunkRecord = SEED_CHUNK_LIBRARY[0],
  stage: ChunkStage = "contextual_use"
): ChunkTrainingTask {
  return {
    id: `chunk_task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    chunk,
    stage,
    situationVi: `Bạn bè hỏi ý kiến của bạn về việc lựa chọn kế hoạch. Hãy dùng cụm "${chunk.canonicalChunk}" để trả lời tự nhiên.`,
    contextDomain: "daily_life",
    promptText: "Are you free to hang out this afternoon?",
    expectedChunkUsage: chunk.canonicalChunk,
    scaffoldText: stage === "controlled_recall" ? `It ______ on my work schedule.` : undefined,
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

export async function generateChunkChainTask(options: {
  topic?: string;
  strategy?: PragmaticStrategyType;
  domain?: "workplace" | "daily_life" | "travel" | "tech_ai" | "opinions" | "career";
  provider?: string;
  model?: string;
  forceSource?: "bank" | "ai" | "auto";
} = {}): Promise<ChunkChainTask> {
  const provider = options.provider || "gemini";
  const model = options.model && options.model !== "auto" ? options.model : "gemini-3.5-flash-lite";

  // 1. Sample Pragmatic DAG Blueprint & Dynamic Scenario Seed
  const { strategyDef, scenarioSeed } = samplePragmaticDAG({
    strategy: options.strategy,
    topic: options.topic,
    domain: options.domain,
  });

  if (provider === "mock") {
    return getMockChainTask(options.topic || scenarioSeed.topic, options.strategy || strategyDef.strategy);
  }

  // 2. Check Content Bank (Hybrid 70/30 Policy)
  if (options.forceSource !== "ai") {
    const bankSample = await sampleBankTask<ChunkChainTask>({
      module: "chunk_chain",
      level: options.strategy || strategyDef.strategy,
      topic: options.topic,
      forceSource: options.forceSource,
    });

    if (bankSample) {
      recordUserExposure(bankSample.contentId, "chunk_chain").catch(() => {});
      return { ...bankSample.task, source: "bank" };
    }
  }

  // 3. Synthesize Rich Context-Infused LLM Prompt from DAG
  const userPrompt = buildPragmaticChainUserPrompt({
    topic: options.topic || scenarioSeed.topic,
    strategyTitleVi: strategyDef.titleVi,
    strategyKey: strategyDef.strategy,
    strategyDescriptionVi: strategyDef.descriptionVi,
    domain: scenarioSeed.domain,
    persona: scenarioSeed.persona,
    situationVi: scenarioSeed.situationVi,
    targetQuestion: scenarioSeed.targetQuestion,
    blocksBlueprint: strategyDef.blocksBlueprint,
  });

  let lastErrorMsg = "";

  const attemptGenerate = async (): Promise<ChunkChainTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: CHUNK_CHAIN_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `chain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      }
      parsed.source = "ai";

      // Metadata synthesis
      parsed.pragmaticStrategy = parsed.pragmaticStrategy || strategyDef.strategy;
      parsed.strategyTitleVi = parsed.strategyTitleVi || strategyDef.titleVi;
      parsed.strategyDescriptionVi = parsed.strategyDescriptionVi || strategyDef.descriptionVi;
      parsed.persona = typeof parsed.persona === "string" && parsed.persona.trim() ? parsed.persona.trim() : scenarioSeed.persona;
      parsed.domain = parsed.domain || scenarioSeed.domain;
      parsed.situationVi = typeof parsed.situationVi === "string" && parsed.situationVi.trim() ? parsed.situationVi.trim() : scenarioSeed.situationVi;
      parsed.targetQuestion = typeof parsed.targetQuestion === "string" && parsed.targetQuestion.trim() ? parsed.targetQuestion.trim() : scenarioSeed.targetQuestion;
      parsed.targetLatencyMs = typeof parsed.targetLatencyMs === "number" ? parsed.targetLatencyMs : strategyDef.recommendedLatencyMs;

      // Robust block sanitization aligned with DAG blueprint
      if (Array.isArray(parsed.blocks)) {
        parsed.blocks = (parsed.blocks as any[]).map((b, idx) => {
          const blueprint = strategyDef.blocksBlueprint[idx % 4];
          const rawType = String(b.blockType || "").toLowerCase().trim();
          const validTypes = ["buffer", "stance", "reason", "example"] as const;
          const blockType = validTypes.includes(rawType as any) ? rawType : blueprint.blockType;

          const labelVi = typeof b.labelVi === "string" && b.labelVi.trim() ? b.labelVi.trim() : blueprint.labelVi;
          const rhetoricalRole = typeof b.rhetoricalRole === "string" && b.rhetoricalRole.trim() ? b.rhetoricalRole.trim() : blueprint.rhetoricalRole;
          const transitionConnector = typeof b.transitionConnector === "string" && b.transitionConnector.trim() ? b.transitionConnector.trim() : blueprint.transitionConnector;

          const suggestedChunk = typeof b.suggestedChunk === "string" && b.suggestedChunk.trim() ? b.suggestedChunk.trim() : blueprint.suggestedChunk;
          let alternativeChunks = Array.isArray(b.alternativeChunks)
            ? b.alternativeChunks
                .filter((item: unknown) => typeof item === "string")
                .map((item: string) => item.replace(/^[a-zA-Z0-9_]+\s*=\s*/, "").replace(/^["']|["']$/g, "").trim())
                .filter(Boolean)
            : [];

          if (alternativeChunks.length === 0) {
            alternativeChunks = blueprint.alternativeChunks;
          }

          return { blockType, labelVi, rhetoricalRole, transitionConnector, suggestedChunk, alternativeChunks };
        });
      } else {
        parsed.blocks = strategyDef.blocksBlueprint.map((b) => ({
          blockType: b.blockType,
          labelVi: b.labelVi,
          rhetoricalRole: b.rhetoricalRole,
          transitionConnector: b.transitionConnector,
          suggestedChunk: b.suggestedChunk,
          alternativeChunks: b.alternativeChunks,
        }));
      }

      // Robust 4-Tier hints sanitization
      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        const blocks = Array.isArray(parsed.blocks) ? (parsed.blocks as any[]) : [];
        const overview = blocks.map((b, i) => `Khối ${i + 1} (${b.labelVi || ""}): "${b.suggestedChunk || ""}"`).join(" → ");
        const example = String(parsed.expectedAssemblyExample || "");

        parsed.hints = [
          { tier: 0, title: "Không gợi ý", content: "Tự kết hợp cả 4 khối và nói một mạch liên tục." },
          { tier: 1, title: "Tổng quan 4 khối", content: overview || "Kết hợp lần lượt 4 khối" },
          { tier: 2, title: "Từ nối chuyển ý", content: blocks.map((b) => b.transitionConnector).filter(Boolean).join(" → ") || "First of all, What is more, For example..." },
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
          content: String(h.content || "")
            .replace(/^(chuỗi câu mẫu hoàn chỉnh|câu mẫu hoàn chỉnh|câu mẫu|sample speech|model answer):\s*/i, "")
            .trim(),
        }));
      }

      if (!Array.isArray(parsed.suggestedVocabulary) || parsed.suggestedVocabulary.length === 0) {
        parsed.suggestedVocabulary = [
          { term: "first of all", meaningVi: "trước hết là", partOfSpeech: "connector" },
          { term: "in fact", meaningVi: "trên thực tế", partOfSpeech: "connector" },
          { term: "for instance", meaningVi: "chẳng hạn như", partOfSpeech: "connector" },
        ];
      }

      const validated = chunkChainTaskSchema.safeParse(parsed);
      if (!validated.success) {
        lastErrorMsg = `Dữ liệu không khớp schema: ${validated.error.message.slice(0, 150)}`;
        return null;
      }
      return validated.data as ChunkChainTask;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      lastErrorMsg = errMsg;
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
        console.warn("[ChunkGenerator] Groq/LLM Rate Limit (429) hit in generateChunkChainTask:", errMsg);
      } else {
        console.error("attemptGenerate catch error:", errMsg);
      }
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  // Emergency Fallback to Content Bank on AI rate limits/outages
  if (!task) {
    const fallbackBank = await sampleBankTask<ChunkChainTask>({
      module: "chunk_chain",
      forceSource: "bank",
    });
    if (fallbackBank) {
      recordUserExposure(fallbackBank.contentId, "chunk_chain").catch(() => {});
      return { ...fallbackBank.task, source: "bank" };
    }

    throw new Error(
      `Không thể tạo bài tập Chunk Chain từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
    );
  }

  // Save newly AI-generated task into Content Bank
  saveBankTask({
    module: "chunk_chain",
    category: task.domain || "general",
    level: task.pragmaticStrategy,
    difficulty: 4,
    topic: task.topic,
    payload: task,
    hashSourceText: `${task.topic}_${task.pragmaticStrategy}_${task.targetQuestion}`,
  })
    .then((record) => {
      recordUserExposure(record.id, "chunk_chain").catch(() => {});
    })
    .catch(() => {});

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
    return getMockSingleChunkTask(chunk, stage);
  }

  const domains = ["workplace", "daily_life", "opinions", "travel"] as const;
  const domain = domains[Math.floor(Math.random() * domains.length)];

  const userPrompt = `Generate a realistic spoken communicative task for the target chunk "${chunk.canonicalChunk}" (Meaning: "${chunk.meaningVi}") in domain "${domain}" at progressive stage "${stage}".
Make sure situationVi is in natural Vietnamese and promptText is an authentic question in English. Return strict JSON.`;

  let lastErrorMsg = "";

  const attemptGenerate = async (): Promise<ChunkTrainingTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: CHUNK_TASK_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 800,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `chunk_task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      }
      parsed.source = "ai";
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
            content: (chunk.variants || []).map((v: { expression: string }) => v.expression).join(" / "),
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
          content: String(h.content || "")
            .replace(/^(câu mẫu hoàn chỉnh|câu mẫu|chuỗi câu mẫu hoàn chỉnh|khung câu điền chỗ|khung câu|model answer|sample sentence):\s*/i, "")
            .trim(),
        }));
      }

      if (!Array.isArray(parsed.suggestedVocabulary)) {
        parsed.suggestedVocabulary = [
          { term: chunk.canonicalChunk, meaningVi: chunk.meaningVi, partOfSpeech: "phrase" },
        ];
      }

      const validated = chunkTrainingTaskSchema.safeParse(parsed);
      if (!validated.success) {
        lastErrorMsg = `Dữ liệu không khớp schema: ${validated.error.message.slice(0, 150)}`;
        return null;
      }
      return validated.data as ChunkTrainingTask;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      lastErrorMsg = errMsg;
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
        console.warn("[ChunkGenerator] Groq/LLM Rate Limit (429) hit in generateSingleChunkTask:", errMsg);
      }
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  // Never fall back silently to mock data; throw error directly
  if (!task) {
    throw new Error(
      `Không thể tạo bài tập Chunk Single Drill từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
    );
  }

  return task;
}
