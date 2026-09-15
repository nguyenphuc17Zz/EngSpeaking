import { generateTextWithRouting } from "@/lib/ai";
import { survivalEvaluationSchema } from "@/lib/validation/survival-schemas";
import { SURVIVAL_EVALUATOR_SYSTEM } from "@/lib/ai/prompts/survival-prompts";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalEvaluationResult,
} from "@/types/survival-speaking";
import { analyzeAristotelianCircumlocution } from "./aristotelian-evaluator.engine";
import {
  computeFastPassCircumlocution,
  computeFastPassScenario,
  calculateHesitationMetrics,
  independenceFromTier,
  normalizeSpokenText,
} from "./fast-pass.service";

function cleanJson(text: string): unknown {
  let cleaned = text.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  cleaned = cleaned.replace(/\b[a-zA-Z0-9_]+\s*=\s*(")/g, "$1");
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

export async function evaluateCircumlocutionAttempt(params: {
  task: CircumlocutionTask;
  userTranscript: string;
  responseLatencyMs: number;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
  provider?: string;
  model?: string;
}): Promise<SurvivalEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model && params.model !== "auto" ? params.model : "gemini-3.5-flash-lite";
  const hintTierUsed = params.hintTierUsed ?? 0;
  const attemptNumber = params.attemptNumber ?? 1;
  const speechDurationMs = params.speechDurationMs ?? 2800;

  // 1. Deterministic Aristotelian Structural & Taboo Analysis
  const analysis = analyzeAristotelianCircumlocution(params.task, params.userTranscript);
  const targetWordAvoided = !analysis.tabooViolated;

  const buildDeterministicFallback = (): SurvivalEvaluationResult => {
    const isSuccessful = targetWordAvoided && analysis.semanticPrecisionScore >= 60;
    const hesitationMetrics = calculateHesitationMetrics({
      userTranscript: params.userTranscript,
      speechDurationMs,
    });
    const independenceScore = independenceFromTier(hintTierUsed);
    const retrievalScore = Math.min(
      100,
      Math.max(
        30,
        Math.round(
          independenceScore * 0.6 + (isSuccessful ? 25 : 0) + (params.responseLatencyMs < 2200 ? 8 : -8)
        )
      )
    );
    const fluencyScore =
      hesitationMetrics.hesitationLevel === "smooth" ? 90 : hesitationMetrics.hesitationLevel === "moderate" ? 80 : 65;
    const errors = !targetWordAvoided
      ? [
          {
            type: "taboo" as const,
            severity: "major" as const,
            userText: analysis.violatedWord || params.task.targetWord,
            correction: "Diễn giải vòng mà không nói từ cấm",
            explanation: `Bạn đã lỡ nói từ cấm "${analysis.violatedWord}". Hãy dùng khung "It's a kind of..." thay thế.`,
            patternKey: "taboo_slip",
          },
        ]
      : [];
    return {
      isSuccessful,
      communicationRecovered: isSuccessful,
      strategyUsed: "circumlocution",
      targetWordAvoided,
      genusDetected: analysis.genusDetected,
      differentiaDetected: analysis.differentiaDetected,
      semanticPrecisionScore: analysis.semanticPrecisionScore,
      listenerGuess: analysis.listenerGuess,
      clarityBreakdown: {
        genusScore: analysis.genusScore,
        functionScore: analysis.functionScore,
        ambiguityPenalty: analysis.tabooViolated ? 70 : 0,
      },
      conceptClarityScore: isSuccessful ? analysis.semanticPrecisionScore : Math.min(50, analysis.semanticPrecisionScore),
      repairInitiationLatencyMs: params.responseLatencyMs,
      speechDurationMs,
      naturalnessScore: isSuccessful ? 88 : 50,
      overallScore: isSuccessful ? Math.max(75, analysis.semanticPrecisionScore) : 45,
      fluencyScore,
      retrievalScore,
      independenceScore,
      errors,
      praisePoints: isSuccessful ? ["Diễn giải rõ ý, đúng khung Genus + Differentia."] : ["Đã dám bật nói để cứu cánh."],
      actionableFeedback: analysis.pedagogicalFeedbackVi,
      userTranscript: params.userTranscript,
      cleanTranscript: normalizeSpokenText(params.userTranscript),
      coachFeedbackVi: analysis.pedagogicalFeedbackVi,
      idealRepairVersion: params.task.sampleExplanations[0] || `It's a kind of ${params.task.category} used for ${params.task.vietnameseMeaning}.`,
      sayItBetter: params.task.sayItBetter || {
        professional: params.task.sampleExplanations[0] || "",
        casual: params.task.sampleExplanations[1] || params.task.sampleExplanations[0] || "",
        idiomatic: params.task.sampleExplanations[0] || "",
      },
      naturalAlternatives: (params.task.sampleExplanations || []).slice(0, 3).map((e, i) => ({
        expression: e,
        tone: i === 0 ? "neutral" : i === 1 ? "casual" : "idiomatic",
        explanationVi: "Cách diễn giải mẫu",
      })),
      isSayItBetterNeeded: isSuccessful && analysis.semanticPrecisionScore < 85,
      alternativeStrategies: [
        "Khung Aristotelian: It's a kind of...",
        "Mô tả công dụng: You use it when...",
        "Bối cảnh xuất hiện: You can usually find it in...",
      ],
      hintTierUsed,
      attemptNumber,
      evaluationSource: "deterministic",
      hesitationMetrics,
      isFastPass: false,
    };
  };

  // Fast-pass 0ms before any LLM call (also used for mock provider)
  const fastPass = computeFastPassCircumlocution(params.task, params.userTranscript, {
    responseLatencyMs: params.responseLatencyMs,
    speechDurationMs,
    hintTierUsed,
    attemptNumber,
  });
  if (fastPass.canFastPass && fastPass.evaluation) {
    return fastPass.evaluation;
  }

  if (provider === "mock") {
    return buildDeterministicFallback();
  }

  const userPrompt = `Evaluate this Circumlocution Attempt according to Aristotelian Definition Paradigm:
TARGET WORD (FORBIDDEN): "${params.task.targetWord}"
FORBIDDEN TABOO LIST: ${JSON.stringify(params.task.forbiddenWords)}
EXPECTED GENUS (CATEGORY): "${params.task.genus || params.task.category}"
EXPECTED DIFFERENTIA (FUNCTION): "${params.task.differentia || params.task.hints.functionHint || ""}"
SEMANTIC ANCHORS: ${JSON.stringify(params.task.semanticKeyAnchors || [])}
USER SPOKEN TRANSCRIPT: "${params.userTranscript}"
MEASURED LATENCY: ${params.responseLatencyMs} ms
SPEECH DURATION: ${speechDurationMs} ms
HINT TIER USED (0-4): ${hintTierUsed}
ATTEMPT NUMBER: ${attemptNumber}

DETERMINISTIC PRE-ANALYSIS:
- Taboo Violated: ${analysis.tabooViolated ? `YES ("${analysis.violatedWord}")` : "NO"}
- Genus Detected: ${analysis.genusDetected ? "YES" : "NO"}
- Differentia Detected: ${analysis.differentiaDetected ? "YES" : "NO"}

Evaluate the LISTENER GUESS TEST: Based strictly on the user's transcript, what would an English native speaker guess?
Return strict JSON only.`;

  const attemptEvaluate = async (): Promise<SurvivalEvaluationResult | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: SURVIVAL_EVALUATOR_SYSTEM,
          temperature: 0.2,
          maxOutputTokens: 900,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      // Integrate Aristotelian fields safely
      if (typeof parsed.targetWordAvoided !== "boolean") {
        parsed.targetWordAvoided = targetWordAvoided;
      }
      if (typeof parsed.genusDetected !== "boolean") {
        parsed.genusDetected = analysis.genusDetected;
      }
      if (typeof parsed.differentiaDetected !== "boolean") {
        parsed.differentiaDetected = analysis.differentiaDetected;
      }
      if (typeof parsed.semanticPrecisionScore !== "number") {
        parsed.semanticPrecisionScore = analysis.semanticPrecisionScore;
      }
      if (typeof parsed.listenerGuess !== "string" || !parsed.listenerGuess.trim()) {
        parsed.listenerGuess = analysis.listenerGuess;
      }

      parsed.clarityBreakdown = {
        genusScore: analysis.genusScore,
        functionScore: analysis.functionScore,
        ambiguityPenalty: analysis.tabooViolated ? 70 : 0,
      };
      parsed.repairInitiationLatencyMs = params.responseLatencyMs;
      parsed.speechDurationMs = speechDurationMs;
      parsed.hintTierUsed = hintTierUsed;
      parsed.attemptNumber = attemptNumber;
      parsed.evaluationSource = "ai_llm";
      parsed.isFastPass = false;
      parsed.userTranscript = params.userTranscript;
      if (typeof parsed.cleanTranscript !== "string" || !parsed.cleanTranscript) {
        parsed.cleanTranscript = normalizeSpokenText(params.userTranscript);
      }
      if (!parsed.hesitationMetrics) {
        parsed.hesitationMetrics = calculateHesitationMetrics({
          userTranscript: params.userTranscript,
          speechDurationMs,
        });
      }
      if (typeof parsed.independenceScore !== "number") {
        parsed.independenceScore = independenceFromTier(hintTierUsed);
      }

      const validated = survivalEvaluationSchema.safeParse(parsed);
      if (!validated.success) return null;
      return validated.data as SurvivalEvaluationResult;
    } catch {
      return null;
    }
  };

  let result = await attemptEvaluate();
  if (!result) result = await attemptEvaluate();

  if (!result) {
    return buildDeterministicFallback();
  }

  return result;
}

export async function evaluateSurvivalScenarioAttempt(params: {
  task: SurvivalScenarioTask;
  userTranscript: string;
  responseLatencyMs: number;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
  provider?: string;
  model?: string;
}): Promise<SurvivalEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model && params.model !== "auto" ? params.model : "gemini-3.5-flash-lite";
  const hintTierUsed = params.hintTierUsed ?? 0;
  const attemptNumber = params.attemptNumber ?? 1;
  const speechDurationMs = params.speechDurationMs ?? 2500;

  const buildDeterministic = (isSuccessful: boolean): SurvivalEvaluationResult => {
    const hesitationMetrics = calculateHesitationMetrics({
      userTranscript: params.userTranscript,
      speechDurationMs,
    });
    const independenceScore = independenceFromTier(hintTierUsed);
    return {
      isSuccessful,
      communicationRecovered: true,
      strategyUsed: params.task.recommendedSkill,
      conceptClarityScore: isSuccessful ? 90 : 45,
      semanticPrecisionScore: isSuccessful ? 88 : 45,
      repairInitiationLatencyMs: params.responseLatencyMs,
      speechDurationMs,
      naturalnessScore: isSuccessful ? 88 : 50,
      overallScore: isSuccessful ? 89 : 50,
      fluencyScore: hesitationMetrics.hesitationLevel === "smooth" ? 90 : 72,
      retrievalScore: Math.min(100, Math.max(40, Math.round(independenceScore * 0.6 + 30))),
      independenceScore,
      errors: [],
      praisePoints: isSuccessful ? ["Phản xạ cứu cánh nhanh, giữ nhịp hội thoại."] : ["Đã dám bật nói để giữ hội thoại."],
      actionableFeedback: "Bạn đã xử lý tình huống rất nhanh nhạy và giữ được cuộc đối thoại tiếp tục trôi chảy!",
      userTranscript: params.userTranscript,
      cleanTranscript: normalizeSpokenText(params.userTranscript),
      coachFeedbackVi: "Bạn đã xử lý tình huống rất nhanh nhạy và giữ được cuộc đối thoại tiếp tục trôi chảy!",
      idealRepairVersion: params.task.suggestedRepairPhrases[0] || "Sorry, could you say that again?",
      sayItBetter: params.task.sayItBetter || {
        professional: params.task.suggestedRepairPhrases[0] || "",
        casual: params.task.suggestedRepairPhrases[1] || params.task.suggestedRepairPhrases[0] || "",
        idiomatic: params.task.suggestedRepairPhrases[0] || "",
      },
      naturalAlternatives: (params.task.suggestedRepairPhrases || []).slice(0, 3).map((e, i) => ({
        expression: e,
        tone: i === 0 ? "neutral" : i === 1 ? "casual" : "idiomatic",
        explanationVi: "Cụm cứu cánh mẫu",
      })),
      isSayItBetterNeeded: isSuccessful,
      alternativeStrategies: ["Hỏi lại lịch sự", "Dùng câu đệm câu giờ", "Làm rõ ý kiến"],
      hintTierUsed,
      attemptNumber,
      evaluationSource: "deterministic",
      hesitationMetrics,
      isFastPass: false,
    };
  };

  const fastPass = computeFastPassScenario(params.task, params.userTranscript, {
    responseLatencyMs: params.responseLatencyMs,
    speechDurationMs,
    hintTierUsed,
    attemptNumber,
  });
  if (fastPass.canFastPass && fastPass.evaluation) {
    return fastPass.evaluation;
  }

  if (provider === "mock") {
    const isSuccessful = params.userTranscript.length >= 10;
    return buildDeterministic(isSuccessful);
  }

  const userPrompt = `Evaluate this Real-Life Survival Scenario Attempt:
SCENARIO CONTEXT: ${params.task.contextTitleVi}
PROBLEM: ${params.task.problemDescriptionVi}
AUDIO PROMPT: "${params.task.audioPromptText}"
RECOMMENDED SKILL: ${params.task.recommendedSkill}
USER REPAIR ATTEMPT: "${params.userTranscript}"
MEASURED LATENCY: ${params.responseLatencyMs} ms
SPEECH DURATION: ${speechDurationMs} ms
HINT TIER USED (0-4): ${hintTierUsed}
ATTEMPT NUMBER: ${attemptNumber}

Return strict JSON.`;

  const attemptEvaluate = async (): Promise<SurvivalEvaluationResult | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: SURVIVAL_EVALUATOR_SYSTEM,
          temperature: 0.2,
          maxOutputTokens: 900,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown> | null;
      if (!parsed || typeof parsed !== "object") return null;
      parsed.repairInitiationLatencyMs = params.responseLatencyMs;
      parsed.speechDurationMs = speechDurationMs;
      parsed.hintTierUsed = hintTierUsed;
      parsed.attemptNumber = attemptNumber;
      parsed.evaluationSource = "ai_llm";
      parsed.isFastPass = false;
      parsed.userTranscript = params.userTranscript;
      if (typeof parsed.cleanTranscript !== "string" || !parsed.cleanTranscript) {
        parsed.cleanTranscript = normalizeSpokenText(params.userTranscript);
      }
      if (!parsed.hesitationMetrics) {
        parsed.hesitationMetrics = calculateHesitationMetrics({
          userTranscript: params.userTranscript,
          speechDurationMs,
        });
      }
      if (typeof parsed.independenceScore !== "number") {
        parsed.independenceScore = independenceFromTier(hintTierUsed);
      }

      const validated = survivalEvaluationSchema.safeParse(parsed);
      if (!validated.success) return null;
      return validated.data as SurvivalEvaluationResult;
    } catch {
      return null;
    }
  };

  let result = await attemptEvaluate();
  if (!result) result = await attemptEvaluate();

  if (!result) {
    return buildDeterministic(params.userTranscript.trim().length >= 10);
  }

  return result;
}
