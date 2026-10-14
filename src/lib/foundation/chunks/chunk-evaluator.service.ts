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
import {
  compactSingleChunkTaskForEval,
  compactChunkChainTaskForEval,
} from "@/lib/ai/prompts/diversity-engine";
import { normalizeSpokenText } from "@/lib/foundation/shared/text-similarity";
import type {
  ChunkTrainingTask,
  ChunkChainTask,
  ChunkEvaluationResult,
  ChunkChainEvaluationResult,
} from "@/types/chunk-automaticity";

import { cleanAiJson } from "@/lib/foundation/shared/json-parser";

function cleanJson(text: string): unknown {
  const cleaned = cleanAiJson(text);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function evaluateSingleChunkAttempt(params: {
  task: ChunkTrainingTask;
  userTranscript: string;
  responseLatencyMs: number;
  provider?: string;
  model?: string;
  forceAi?: boolean;
}): Promise<ChunkEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  const normUser = normalizeSpokenText(params.userTranscript);
  const userWordCount = normUser.split(/\s+/).filter(Boolean).length;
  const candidateExpressions = [
    params.task.expectedChunkUsage,
    params.task.chunk?.canonicalChunk,
    ...(params.task.chunk?.variants || []).map((v) => v.expression),
  ].filter(Boolean) as string[];

  let matchedExpr: string | undefined;
  for (const expr of candidateExpressions) {
    const normExpr = normalizeSpokenText(expr);
    if (normExpr && normUser.includes(normExpr)) {
      matchedExpr = expr;
      break;
    }
  }

  const lowerUser = params.userTranscript.toLowerCase();
  const isChunkSpoken = Boolean(matchedExpr) || lowerUser.includes("depend") || lowerUser.includes("sure") || lowerUser.includes("honest");
  const modelExample =
    params.task.hints?.find((h) => h.tier === 4)?.content ||
    `Well, ${params.task.expectedChunkUsage} the situation.`;
  const variantsList = (params.task.chunk?.variants || []).map((v) => v.expression);

  if (provider === "mock") {
    const isSuccessful = isChunkSpoken && params.userTranscript.length >= 8;
    return {
      isSuccessful,
      chunkDetected: isChunkSpoken,
      detectedExpression: matchedExpr || params.task.expectedChunkUsage,
      isNaturalInsertion: true,
      retrievalLatencyMs: params.responseLatencyMs,
      grammarAroundChunkScore: 92,
      naturalnessScore: 90,
      overallScore: isSuccessful ? 91 : 45,
      userTranscript: params.userTranscript,
      coachFeedbackVi: isSuccessful
        ? "Xuất sắc! Bạn đã lồng ghép cụm khẩu ngữ rất tự nhiên vào câu trả lời."
        : "Hãy chú ý dùng đúng cụm khẩu ngữ mục tiêu.",
      betterVersion: modelExample,
      alternativeVariants: variantsList,
      transferDomainSuccess: true,
      masteryDelta: isSuccessful ? 6 : -2,
    };
  }

  // 1. 0ms / 0-Token Deterministic Fast-Pass when chunk or variant is cleanly used in a full sentence
  if (!params.forceAi && matchedExpr && userWordCount >= 5) {
    const isFast = params.responseLatencyMs <= (params.task.targetLatencyMs || 3000) * 1.25;
    const overallScore = isFast ? 94 : 88;
    return {
      isSuccessful: true,
      chunkDetected: true,
      detectedExpression: matchedExpr,
      isNaturalInsertion: true,
      retrievalLatencyMs: params.responseLatencyMs,
      grammarAroundChunkScore: 92,
      naturalnessScore: isFast ? 95 : 88,
      overallScore,
      userTranscript: params.userTranscript,
      coachFeedbackVi: `Tuyệt vời! Bạn đã bật ra cụm "${matchedExpr}" tự nhiên và trọn vẹn ngữ cảnh chỉ trong ${(params.responseLatencyMs / 1000).toFixed(1)}s.`,
      betterVersion: modelExample,
      alternativeVariants: variantsList,
      transferDomainSuccess: true,
      masteryDelta: isFast ? 8 : 5,
    };
  }

  // 2. Compact LLM Evaluation
  const userPrompt = `TASK: ${compactSingleChunkTaskForEval(params.task)}
SPOKEN: "${params.userTranscript}"
LATENCY: ${params.responseLatencyMs}ms
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
          maxOutputTokens: 450,
        },
      });

      const parsed = cleanJson(res.text);
      if (!parsed || typeof parsed !== "object") return null;

      const raw = parsed as Record<string, unknown>;
      const hydrated: Record<string, unknown> = {
        ...raw,
        retrievalLatencyMs: typeof raw.retrievalLatencyMs === "number" ? raw.retrievalLatencyMs : params.responseLatencyMs,
        userTranscript: typeof raw.userTranscript === "string" ? raw.userTranscript : params.userTranscript,
        betterVersion: typeof raw.betterVersion === "string" && raw.betterVersion.trim() ? raw.betterVersion : modelExample,
        alternativeVariants: Array.isArray(raw.alternativeVariants) && raw.alternativeVariants.length > 0 ? raw.alternativeVariants : variantsList,
        transferDomainSuccess: typeof raw.transferDomainSuccess === "boolean" ? raw.transferDomainSuccess : Boolean(raw.isSuccessful),
        masteryDelta: typeof raw.masteryDelta === "number" ? raw.masteryDelta : raw.isSuccessful ? 6 : -2,
      };

      const validated = chunkEvaluationSchema.safeParse(hydrated);
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
  forceAi?: boolean;
}): Promise<ChunkChainEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  const normUser = normalizeSpokenText(params.userTranscript);
  const userWordCount = normUser.split(/\s+/).filter(Boolean).length;

  // Deterministic checks for blocks (checking both suggestedChunk and alternativeChunks)
  const detectedBlocks: ChunkChainEvaluationResult["detectedBlocks"] = [];
  params.task.blocks.forEach((b) => {
    const candidates = [b.suggestedChunk, ...(b.alternativeChunks || [])].filter(Boolean);
    let matchedChunk = "";
    for (const cand of candidates) {
      const normCand = normalizeSpokenText(cand);
      const firstTwoWords = normCand.split(" ").slice(0, 2).join(" ");
      if ((normCand && normUser.includes(normCand)) || (firstTwoWords.length >= 4 && normUser.includes(firstTwoWords))) {
        matchedChunk = cand;
        break;
      }
    }
    if (matchedChunk) {
      detectedBlocks.push({
        blockType: b.blockType,
        usedChunk: matchedChunk,
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

  // 1. 0ms / 0-Token Deterministic Fast-Pass when >= 3 of 4 blocks are detected in a substantial utterance
  if (!params.forceAi && detectedBlocks.length >= 3 && userWordCount >= 12) {
    const allFour = detectedBlocks.length >= 4;
    return {
      isSuccessful: true,
      overallScore: allFour ? 95 : 88,
      blocksUsedCount: detectedBlocks.length,
      totalBlocks: params.task.blocks.length,
      detectedBlocks,
      fluencyFlowScore: allFour ? 94 : 87,
      responseLatencyMs: params.responseLatencyMs,
      userTranscript: params.userTranscript,
      coachFeedbackVi: allFour
        ? "Xuất sắc! Bạn đã kết nối trọn vẹn cả 4 khối (Đệm → Quan điểm → Lý do → Ví dụ) thành một chuỗi lập luận cực kỳ tự nhiên và mạch lạc."
        : `Rất tốt! Bạn đã ghép nối thành công ${detectedBlocks.length}/4 khối giao tiếp một cách trôi chảy.`,
      idealCombinedSpeech: params.task.expectedAssemblyExample,
    };
  }

  // 2. Compact LLM Evaluation
  const userPrompt = `TASK: ${compactChunkChainTaskForEval(params.task)}
SPOKEN: "${params.userTranscript}"
LATENCY: ${params.responseLatencyMs}ms
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
          maxOutputTokens: 500,
        },
      });

      const parsed = cleanJson(res.text);
      if (!parsed || typeof parsed !== "object") return null;

      const raw = parsed as Record<string, unknown>;
      const hydrated: Record<string, unknown> = {
        ...raw,
        totalBlocks: typeof raw.totalBlocks === "number" ? raw.totalBlocks : params.task.blocks.length,
        responseLatencyMs: typeof raw.responseLatencyMs === "number" ? raw.responseLatencyMs : params.responseLatencyMs,
        userTranscript: typeof raw.userTranscript === "string" ? raw.userTranscript : params.userTranscript,
        idealCombinedSpeech:
          typeof raw.idealCombinedSpeech === "string" && raw.idealCombinedSpeech.trim()
            ? raw.idealCombinedSpeech
            : params.task.expectedAssemblyExample,
      };

      const validated = chunkChainEvaluationSchema.safeParse(hydrated);
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

