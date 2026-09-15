// Task Generation Service for Sentence Builder (Function 1)
// Dynamic AI-driven task creation with Anti-Repetition and Deterministic Fallback

import { generateTextWithRouting } from "@/lib/ai";
import { sentenceBuilderTaskSchema } from "@/lib/validation/sentence-builder-schemas";
import { TASK_GENERATOR_SYSTEM, buildTaskGeneratorUserPrompt } from "@/lib/ai/prompts/sentence-builder-prompts";
import { sampleBankTask, saveBankTask, recordUserExposure } from "@/lib/foundation/services/content-bank.service";
import { resolveTopicForPrompt } from "./topics";
import type {
  SentenceBuilderTask,
  SentenceBuilderControlLevel,
  SentenceBuilderCategory,
} from "@/types/sentence-builder";

export interface GenerateTaskOptions {
  controlLevel?: SentenceBuilderControlLevel;
  taskType?: SentenceBuilderCategory;
  targetDifficulty?: number;
  topic?: string;
  prepTimeSec?: number;
  provider?: string;
  model?: string;
  pedagogicalConstraint?: string;
  forceSource?: "bank" | "ai" | "auto";
  // Legacy optional fields ignored
  weakSkills?: string[];
  recentErrors?: string[];
  recentPrompts?: string[];
  targetErrorPatternKey?: string;
}

// Minimal test fixture strictly for offline test runner when provider === "mock"
function getTestMockTask(options: GenerateTaskOptions): SentenceBuilderTask {
  const level = options.controlLevel || "controlled";
  const id = `sb_task_test_${Date.now()}`;
  return {
    id,
    taskType: "sentence_completion",
    controlLevel: level,
    instruction: "Hoàn thành câu sau bằng tiếng Anh:",
    promptVi: "Tôi thường uống cà phê vào mỗi buổi sáng.",
    targetIntent: "I usually drink coffee every morning.",
    expectedResponses: ["I usually drink coffee every morning."],
    requiredElements: ["usually", "drink coffee", "every morning"],
    scaffold: {
      level: 1,
      template: "I usually ___ every morning.",
      keywords: ["coffee", "drink"],
      starter: "I usually...",
      constraints: [],
    },
    hints: [
      { tier: 0, title: "Không gợi ý", content: "Nói ngay.", penaltyWeight: 0 },
      { tier: 1, title: "Từ khoá", content: "drink coffee", penaltyWeight: 0.1 },
      { tier: 2, title: "Khung câu", content: "I usually ___ every morning.", penaltyWeight: 0.25 },
      { tier: 3, title: "Từ mở đầu", content: "I usually...", penaltyWeight: 0.5 },
      { tier: 4, title: "Câu mẫu", content: "I usually drink coffee every morning.", penaltyWeight: 0.85 },
    ],
    suggestedVocabulary: [
      { term: "usually", phonetic: "/ˈjuː.ʒu.ə.li/", meaningVi: "thường xuyên" },
      { term: "drink", phonetic: "/drɪŋk/", meaningVi: "uống" },
      { term: "coffee", phonetic: "/ˈkɒf.i/", meaningVi: "cà phê" },
    ],
    difficulty: { overall: options.targetDifficulty ?? 3, grammarComplexity: 2, retrievalDemand: 0.5, lengthScore: 2 },
    skills: ["sentence_construction"],
    grammarTargets: ["present_simple"],
    vocabularyTargets: ["coffee", "drink"],
    topic: options.topic || "daily_life",
    prepTimeSec: 3.0,
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
      } catch {
        return null;
      }
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
    return getTestMockTask({ ...options, controlLevel, targetDifficulty });
  }

  // Resolve dynamic / infinite / custom topic
  const effectiveTopic = resolveTopicForPrompt(options.topic);

  // 1. Check Content Bank (Hybrid 70/30 Policy: 70% chance to fetch from Bank, skipped if forceSource === 'ai')
  if (options.forceSource !== "ai") {
    const bankSample = await sampleBankTask<SentenceBuilderTask>({
      module: "sentence_builder",
      level: controlLevel,
      difficulty: targetDifficulty,
      topic: options.topic && options.topic !== "random" ? options.topic : undefined,
      forceSource: options.forceSource,
    });

    if (bankSample) {
      recordUserExposure(bankSample.contentId, "sentence_builder").catch(() => {});
      return { ...bankSample.task, source: "bank" };
    }
  }

  // 2. Dynamic AI Generation (30% novel LLM generation or when bank misses)
  const userPrompt = buildTaskGeneratorUserPrompt({
    controlLevel,
    taskType: options.taskType,
    targetDifficulty,
    topic: effectiveTopic,
    pedagogicalConstraint: options.pedagogicalConstraint,
  });

  let lastErrorMsg = "";
  let isRateLimited = false;

  const attemptGenerate = async (): Promise<SentenceBuilderTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: TASK_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1000, // Sufficient tokens to ensure complete valid JSON output without cut-offs
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

      // Robust sanitization for fast/lightweight LLMs (like gemini-3.5-flash-lite or groq)
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
      const intentStr = String(parsed.targetIntent || "").trim();
      const templateStr = (parsed.scaffold as Record<string, unknown>)?.template as string | undefined;

      if (!Array.isArray(parsed.expectedResponses) || parsed.expectedResponses.length === 0) {
        parsed.expectedResponses = intentStr ? [intentStr] : [];
      } else {
        // Expand any isolated blank-fill phrases if a template with blanks exists
        const expList: string[] = (parsed.expectedResponses as unknown[])
          .map((r) => {
            const s = String(r || "").trim();
            if (templateStr && templateStr.includes("___") && s.split(/\s+/).length < 4) {
              return templateStr.replace(/_{2,}/g, s).trim();
            }
            return s;
          })
          .filter(Boolean);

        // Ensure the full targetIntent is included at the top if missing
        if (intentStr && !expList.some((r: string) => r.toLowerCase() === intentStr.toLowerCase())) {
          expList.unshift(intentStr);
        }
        parsed.expectedResponses = expList;
      }

      if (!Array.isArray(parsed.requiredElements)) {
        parsed.requiredElements = [];
      }

      // Standard 5-tier hints auto-synthesis (saves 400+ tokens of AI output)
      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        const fullSentence = intentStr || (parsed.expectedResponses as string[])?.[0] || "";
        const words = fullSentence.split(" ").filter(Boolean);
        const starter = (parsed.scaffold as Record<string, unknown>)?.starter as string | undefined;
        parsed.hints = [
          { tier: 0, title: "Không gợi ý", content: "Tự phản xạ và nói ngay.", penaltyWeight: 0 },
          { tier: 1, title: "Từ khoá", content: words.slice(0, 3).join(" "), penaltyWeight: 0.1 },
          { tier: 2, title: "Khung câu", content: templateStr || (words[0] ? `Bắt đầu bằng: "${words[0]}"` : "Pattern..."), penaltyWeight: 0.25 },
          { tier: 3, title: "Từ mở đầu", content: starter || (words.slice(0, 2).join(" ") + "..."), penaltyWeight: 0.5 },
          { tier: 4, title: "Câu mẫu bản xứ", content: fullSentence, penaltyWeight: 0.85 },
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

      if (!parsed.topic || parsed.topic === "general") {
        parsed.topic = effectiveTopic || "daily_life";
      }
      parsed.source = "ai";
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
      const errStr = err instanceof Error ? err.message : String(err);
      lastErrorMsg = errStr;
      if (errStr.includes("429") || errStr.includes("rate_limit") || errStr.includes("TPM")) {
        isRateLimited = true;
      }
      if (process.env.NODE_ENV !== "production") {
        console.warn("[SentenceBuilderTaskGenerator] API call failed:", err);
      }
      return null;
    }
  };

  let task = await attemptGenerate();

  // Retry once for transient glitches if initial attempt failed
  if (!task) {
    task = await attemptGenerate();
  }

  // Emergency Fallback to Content Bank on AI rate limits/outages (only if not forceSource === 'ai')
  if (!task) {
    if (options.forceSource !== "ai") {
      const fallbackBank = await sampleBankTask<SentenceBuilderTask>({
        module: "sentence_builder",
        level: controlLevel,
        difficulty: targetDifficulty,
        forceSource: "bank",
      });
      if (fallbackBank) {
        recordUserExposure(fallbackBank.contentId, "sentence_builder").catch(() => {});
        return { ...fallbackBank.task, source: "bank" };
      }
    }

    throw new Error(
      `Không thể tạo bài tập Sentence Builder từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
    );
  }

  // 3. Flywheel: Save newly AI-generated task into Content Bank for future reuse
  saveBankTask({
    module: "sentence_builder",
    category: task.taskType || "sentence_completion",
    level: task.controlLevel,
    difficulty: task.difficulty.overall,
    topic: task.topic || "general",
    payload: task,
    hashSourceText: task.promptVi || task.targetIntent,
  })
    .then((record) => {
      recordUserExposure(record.id, "sentence_builder").catch(() => {});
    })
    .catch(() => {});

  return task;
}
