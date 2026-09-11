import { generateTextWithRouting } from "@/lib/ai";
import { survivalEvaluationSchema } from "@/lib/validation/survival-schemas";
import { SURVIVAL_EVALUATOR_SYSTEM } from "@/lib/ai/prompts/survival-prompts";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
  SurvivalEvaluationResult,
} from "@/types/survival-speaking";
import { analyzeAristotelianCircumlocution } from "./aristotelian-evaluator.engine";

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
  provider?: string;
  model?: string;
}): Promise<SurvivalEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model && params.model !== "auto" ? params.model : "gemini-3.5-flash-lite";

  // 1. Deterministic Aristotelian Structural & Taboo Analysis
  const analysis = analyzeAristotelianCircumlocution(params.task, params.userTranscript);
  const targetWordAvoided = !analysis.tabooViolated;

  if (provider === "mock") {
    const isSuccessful = targetWordAvoided && analysis.semanticPrecisionScore >= 60;
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
      naturalnessScore: isSuccessful ? 88 : 50,
      overallScore: isSuccessful ? Math.max(75, analysis.semanticPrecisionScore) : 45,
      userTranscript: params.userTranscript,
      coachFeedbackVi: analysis.pedagogicalFeedbackVi,
      idealRepairVersion: params.task.sampleExplanations[0] || `It's a kind of ${params.task.category} used for ${params.task.vietnameseMeaning}.`,
      alternativeStrategies: [
        "Khung Aristotelian: It's a kind of...",
        "Mô tả công dụng: You use it when...",
        "Bối cảnh xuất hiện: You can usually find it in...",
      ],
    };
  }

  const userPrompt = `Evaluate this Circumlocution Attempt according to Aristotelian Definition Paradigm:
TARGET WORD (FORBIDDEN): "${params.task.targetWord}"
FORBIDDEN TABOO LIST: ${JSON.stringify(params.task.forbiddenWords)}
EXPECTED GENUS (CATEGORY): "${params.task.genus || params.task.category}"
EXPECTED DIFFERENTIA (FUNCTION): "${params.task.differentia || params.task.hints.functionHint || ""}"
SEMANTIC ANCHORS: ${JSON.stringify(params.task.semanticKeyAnchors || [])}
USER SPOKEN TRANSCRIPT: "${params.userTranscript}"
MEASURED LATENCY: ${params.responseLatencyMs} ms

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
    throw new Error("Không thể đánh giá phần diễn giải Circumlocution từ AI. Vui lòng thử lại.");
  }

  return result;
}

export async function evaluateSurvivalScenarioAttempt(params: {
  task: SurvivalScenarioTask;
  userTranscript: string;
  responseLatencyMs: number;
  provider?: string;
  model?: string;
}): Promise<SurvivalEvaluationResult> {
  const provider = params.provider || "gemini";
  const model = params.model && params.model !== "auto" ? params.model : "gemini-3.5-flash-lite";

  if (provider === "mock") {
    const isSuccessful = params.userTranscript.length >= 10;
    return {
      isSuccessful,
      communicationRecovered: true,
      strategyUsed: params.task.recommendedSkill,
      conceptClarityScore: 90,
      repairInitiationLatencyMs: params.responseLatencyMs,
      naturalnessScore: 88,
      overallScore: isSuccessful ? 89 : 50,
      userTranscript: params.userTranscript,
      coachFeedbackVi: "Bạn đã xử lý tình huống rất nhanh nhạy và giữ được cuộc đối thoại tiếp tục trôi chảy!",
      idealRepairVersion: params.task.suggestedRepairPhrases[0] || "Sorry, could you say that again?",
      alternativeStrategies: ["Hỏi lại lịch sự", "Dùng câu đệm câu giờ", "Làm rõ ý kiến"],
    };
  }

  const userPrompt = `Evaluate this Real-Life Survival Scenario Attempt:
SCENARIO CONTEXT: ${params.task.contextTitleVi}
PROBLEM: ${params.task.problemDescriptionVi}
AUDIO PROMPT: "${params.task.audioPromptText}"
USER REPAIR ATTEMPT: "${params.userTranscript}"
MEASURED LATENCY: ${params.responseLatencyMs} ms

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

      const parsed = cleanJson(res.text);
      if (!parsed) return null;

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
    throw new Error("Không thể đánh giá phản xạ cứu cánh từ AI. Vui lòng thử lại.");
  }

  return result;
}
