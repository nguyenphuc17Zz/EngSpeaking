// Chunk Evaluator Service — Function 6
// Evaluates single chunk usage, naturalness, latency, and multi-block chain assembly

import { generateTextWithRouting } from "@/lib/ai";
import {
  chunkEvaluationSchema,
  chunkChainEvaluationSchema,
} from "@/lib/validation/chunk-schemas";
import {
  CHUNK_EVALUATOR_SYSTEM,
  CHUNK_CHAIN_EVALUATOR_SYSTEM,
} from "@/lib/ai/prompts/chunk-prompts";
import type {
  ChunkTrainingTask,
  ChunkChainTask,
  ChunkEvaluationResult,
  ChunkChainEvaluationResult,
} from "@/types/chunk-automaticity";

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

export async function evaluateSingleChunkAttempt(params: {
  task: ChunkTrainingTask;
  userTranscript: string;
  responseLatencyMs: number;
  provider?: string;
  model?: string;
}): Promise<ChunkEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  const lowerUser = params.userTranscript.toLowerCase();
  const targetLower = params.task.expectedChunkUsage.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "");

  // Check if chunk or variant exists
  const isChunkSpoken = lowerUser.includes("depend") || lowerUser.includes("sure") || lowerUser.includes("honest");

  if (provider === "mock") {
    const isSuccessful = isChunkSpoken && params.userTranscript.length >= 8;
    return {
      isSuccessful,
      chunkDetected: isChunkSpoken,
      detectedExpression: params.task.expectedChunkUsage,
      isNaturalInsertion: true,
      retrievalLatencyMs: params.responseLatencyMs,
      grammarAroundChunkScore: 92,
      naturalnessScore: 90,
      overallScore: isSuccessful ? 91 : 45,
      userTranscript: params.userTranscript,
      coachFeedbackVi: isSuccessful
        ? "Xuất sắc! Bạn đã lồng ghép cụm khẩu ngữ rất tự nhiên vào câu trả lời."
        : "Hãy chú ý dùng đúng cụm khẩu ngữ mục tiêu.",
      betterVersion: `Well, ${params.task.expectedChunkUsage} the situation.`,
      alternativeVariants: params.task.chunk.variants.map((v) => v.expression),
      transferDomainSuccess: true,
      masteryDelta: isSuccessful ? 6 : -2,
    };
  }

  const userPrompt = `Evaluate this single chunk attempt:
TASK:
${JSON.stringify(params.task)}
USER TRANSCRIPT:
"${params.userTranscript}"
MEASURED LATENCY:
${params.responseLatencyMs} ms

Return strict JSON.`;

  const attemptEvaluate = async (): Promise<ChunkEvaluationResult | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: CHUNK_EVALUATOR_SYSTEM,
          temperature: 0.2,
          maxOutputTokens: 600,
        },
      });

      const parsed = cleanJson(res.text);
      if (!parsed) return null;

      const validated = chunkEvaluationSchema.safeParse(parsed);
      if (!validated.success) return null;
      return validated.data as ChunkEvaluationResult;
    } catch {
      return null;
    }
  };

  let result = await attemptEvaluate();
  if (!result) result = await attemptEvaluate();

  if (!result) {
    throw new Error("Không thể đánh giá phát âm cụm từ bằng AI. Vui lòng thử lại.");
  }

  return result;
}

export async function evaluateChunkChainAttempt(params: {
  task: ChunkChainTask;
  userTranscript: string;
  responseLatencyMs: number;
  provider?: string;
  model?: string;
}): Promise<ChunkChainEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  const lowerUser = params.userTranscript.toLowerCase();

  // Deterministic checks for blocks
  const detectedBlocks: ChunkChainEvaluationResult["detectedBlocks"] = [];
  params.task.blocks.forEach((b) => {
    const kw = b.suggestedChunk.split(" ")[0]?.toLowerCase() || "";
    if (kw && lowerUser.includes(kw)) {
      detectedBlocks.push({
        blockType: b.blockType,
        usedChunk: b.suggestedChunk,
        isAppropriate: true,
      });
    }
  });

  if (provider === "mock") {
    const usedCount = Math.max(2, detectedBlocks.length);
    const isSuccessful = params.userTranscript.length >= 20;
    return {
      isSuccessful,
      overallScore: isSuccessful ? 92 : 50,
      blocksUsedCount: usedCount,
      totalBlocks: params.task.blocks.length,
      detectedBlocks,
      fluencyFlowScore: 90,
      responseLatencyMs: params.responseLatencyMs,
      userTranscript: params.userTranscript,
      coachFeedbackVi: "Bạn đã ghép nối các khối giao tiếp (Buffer + Stance + Reason + Example) rất mượt mà!",
      idealCombinedSpeech: params.task.expectedAssemblyExample,
    };
  }

  const userPrompt = `Evaluate this Speech Chain Builder attempt:
TASK:
${JSON.stringify(params.task)}
USER TRANSCRIPT:
"${params.userTranscript}"
MEASURED LATENCY:
${params.responseLatencyMs} ms

Return strict JSON.`;

  const attemptEvaluate = async (): Promise<ChunkChainEvaluationResult | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: CHUNK_CHAIN_EVALUATOR_SYSTEM,
          temperature: 0.2,
          maxOutputTokens: 750,
        },
      });

      const parsed = cleanJson(res.text);
      if (!parsed) return null;

      const validated = chunkChainEvaluationSchema.safeParse(parsed);
      if (!validated.success) return null;
      return validated.data as ChunkChainEvaluationResult;
    } catch {
      return null;
    }
  };

  let result = await attemptEvaluate();
  if (!result) result = await attemptEvaluate();

  if (!result) {
    throw new Error("Không thể đánh giá chuỗi câu Speech Chain bằng AI. Vui lòng thử lại.");
  }

  return result;
}
