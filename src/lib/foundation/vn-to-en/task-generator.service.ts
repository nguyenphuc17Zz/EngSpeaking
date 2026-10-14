// Task Generator Service for Vietnamese -> English Spoken Retrieval (Function 2)
// Dynamic AI generation with Anti-Repetition and 3 Retrieval Modes

import { generateTextWithRouting } from "@/lib/ai";
import { vnToENTaskSchema } from "@/lib/validation/vn-to-en-schemas";
import { VN_TO_EN_GENERATOR_SYSTEM, buildVNToENTaskPrompt } from "@/lib/ai/prompts/vn-to-en-prompts";
import { sampleBankTask, saveBankTask, recordUserExposure } from "@/lib/foundation/services/content-bank.service";
import { resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";
import { hydrateStandardFiveTierHints } from "@/lib/ai/prompts/diversity-engine";
import type { VNToENTask, VNToENRetrievalMode, VNPromptCategory } from "@/types/vn-to-en";

export interface GenerateVNTaskOptions {
  retrievalMode?: VNToENRetrievalMode;
  category?: VNPromptCategory;
  targetDifficulty?: number;
  weakSkills?: string[];
  recentErrors?: string[];
  recentPrompts?: string[];
  pedagogicalConstraint?: string;
  topic?: string;
  provider?: string;
  model?: string;
  forceSource?: "bank" | "ai" | "auto";
}

// Minimal test fixture strictly for offline test runner when provider === "mock"
function getTestMockTask(options: GenerateVNTaskOptions): VNToENTask {
  const mode = options.retrievalMode || "endless";
  const id = `vn_task_test_${Date.now()}`;
  return {
    id,
    category: "daily_life",
    retrievalMode: mode,
    promptVi: "Tôi thường uống một tách cà phê vào buổi sáng trước khi bắt đầu làm việc.",
    targetIntent: "I usually drink a cup of coffee in the morning before starting work.",
    expectedResponses: [
      "I usually drink a cup of coffee in the morning before I start work.",
      "I normally have a cup of coffee in the morning before work.",
      "I usually grab a cup of coffee in the morning before starting my work.",
    ],
    requiredMeaningElements: ["usually drink coffee", "in the morning", "before starting work"],
    targetSkills: ["present_simple", "daily_routine", "spoken_retrieval"],
    difficulty: {
      overall: options.targetDifficulty ?? 3,
      grammarComplexity: 2,
      retrievalDemand: 0.4,
      semanticDensity: 2,
    },
    hints: [
      { tier: 0, title: "Không gợi ý", content: "Tự phản xạ và nói ngay.", penaltyWeight: 0 },
      { tier: 1, title: "Từ khoá chính", content: "cup of coffee / morning / start work", penaltyWeight: 0.1 },
      { tier: 2, title: "Cấu trúc gợi ý", content: "Dùng thì Hiện tại đơn: I usually [verb] before I [verb].", penaltyWeight: 0.25 },
      { tier: 3, title: "Từ mở đầu", content: "I usually drink a cup of coffee...", penaltyWeight: 0.5 },
      { tier: 4, title: "Câu mẫu hoàn chỉnh", content: "I usually drink a cup of coffee in the morning before I start work.", penaltyWeight: 0.9 },
    ],
    prepTimeSec: mode === "rapid_fire" ? 1.0 : mode === "timed" ? 1.5 : 2.5,
    isRapidFire: mode === "rapid_fire",
    topic: "daily_routine",
    suggestedVocabulary: [{ term: "drink coffee", meaningVi: "uống cà phê" }],
    sayItBetter: {
      professional: "I typically drink a cup of coffee in the morning prior to commencing work.",
      casual: "I usually grab a cup of coffee in the morning before starting work.",
      idiomatic: "I always kick off my morning with a nice cup of joe before getting down to work.",
    },
  };
}

import { cleanAiJson } from "@/lib/foundation/shared/json-parser";

export function cleanJson(text: string): unknown {
  const cleaned = cleanAiJson(text);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function generateVNToENTask(
  options: GenerateVNTaskOptions = {}
): Promise<VNToENTask> {
  const retrievalMode = options.retrievalMode || "endless";
  const targetDifficulty = options.targetDifficulty || (retrievalMode === "rapid_fire" ? 2 : retrievalMode === "timed" ? 5 : 3);
  const provider = options.provider || "gemini";
  const model = options.model || "auto";

  if (provider === "mock") {
    return getTestMockTask({ ...options, retrievalMode, targetDifficulty });
  }

  // Resolve dynamic / infinite / custom topic from rich situation pool avoiding recentPrompts
  const effectiveTopic = resolveTopicForPrompt(options.topic, undefined, options.recentPrompts);

  // 1. Check Content Bank (Hybrid 70/30 Policy: 70% chance to fetch from Bank, skipped if forceSource === "ai")
  if (options.forceSource !== "ai") {
    const bankSample = await sampleBankTask<VNToENTask>({
      module: "vn_to_en",
      level: retrievalMode,
      difficulty: targetDifficulty,
      category: options.category,
      topic: options.topic && options.topic !== "random" ? options.topic : undefined,
      forceSource: options.forceSource,
    });

    if (bankSample) {
      recordUserExposure(bankSample.contentId, "vn_to_en").catch(() => {});
      const task = { ...bankSample.task, source: "bank" as const };
      if (!task.sayItBetter) {
        const expList = task.expectedResponses || [];
        task.sayItBetter = {
          professional: expList[0] || task.targetIntent || "",
          casual: expList[1] || expList[0] || task.targetIntent || "",
          idiomatic: expList[2] || expList[0] || task.targetIntent || "",
        };
      }
      return task;
    }
  }

  // 2. Dynamic AI Generation (100% novel LLM generation grounded deeply in the resolved topic)
  const userPrompt = buildVNToENTaskPrompt({
    retrievalMode,
    category: options.category,
    targetDifficulty,
    weakSkills: options.weakSkills,
    recentErrors: options.recentErrors,
    recentPrompts: options.recentPrompts,
    pedagogicalConstraint: options.pedagogicalConstraint,
    topic: effectiveTopic,
  });

  let lastErrorMsg = "";

  const attemptGenerate = async (
    targetProvider = provider,
    targetModel = model
  ): Promise<VNToENTask | null> => {
    try {
      const maxOutputTokens = targetProvider === "groq" ? 650 : 750;

      const res = await generateTextWithRouting({
        provider: targetProvider,
        model: targetModel,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: VN_TO_EN_GENERATOR_SYSTEM,
          temperature: 0.78,
          maxOutputTokens,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed) {
        lastErrorMsg = "AI trả về nội dung không phải JSON hợp lệ.";
        if (process.env.NODE_ENV !== "production") {
          console.warn("[VNToENTaskGenerator] Failed to parse JSON. Raw AI response snippet:", res.text.slice(0, 300));
        }
        return null;
      }

      if (!parsed.id) {
        parsed.id = `vn_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      }

      parsed.source = "ai";

      const intent = String(parsed.targetIntent || "");

      // Ensure expectedResponses
      if (!Array.isArray(parsed.expectedResponses) || parsed.expectedResponses.length === 0) {
        parsed.expectedResponses = intent ? [intent] : ["I understand."];
      }

      // Ensure requiredMeaningElements
      if (!Array.isArray(parsed.requiredMeaningElements) || parsed.requiredMeaningElements.length === 0) {
        parsed.requiredMeaningElements = intent ? intent.split(" ").slice(0, 3) : ["communicate intent"];
      }

      // Deterministic 5-tier hints hydration (saves ~200 output tokens)
      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        const grammarCue = typeof parsed.grammarCueVi === "string" ? parsed.grammarCueVi : undefined;
        const starter = typeof parsed.starter === "string" ? parsed.starter : undefined;
        parsed.hints = hydrateStandardFiveTierHints({
          keywords: (parsed.requiredMeaningElements as string[]) || [],
          grammarCueVi: grammarCue,
          starterOrSkeleton: starter,
          fullModelAnswer: intent || (parsed.expectedResponses as string[])[0] || "",
          tierTitles: ["Không gợi ý", "Từ khoá chính", "Cấu trúc gợi ý", "Từ mở đầu", "Câu mẫu hoàn chỉnh"],
        });
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

      // Ensure sayItBetter is present and structured
      const rawSib = (parsed.sayItBetter && typeof parsed.sayItBetter === "object")
        ? (parsed.sayItBetter as Record<string, unknown>)
        : {};
      const expList = Array.isArray(parsed.expectedResponses) ? parsed.expectedResponses.map(String) : [];
      const defaultProf = expList[0] || intent || "I understand the situation.";
      const defaultCasual = expList[1] || expList[0] || intent || "Got it, no problem.";
      const defaultIdiom = expList[2] || expList[0] || intent || "I'm on top of it.";

      parsed.sayItBetter = {
        professional: String(rawSib.professional || defaultProf),
        casual: String(rawSib.casual || defaultCasual),
        idiomatic: String(rawSib.idiomatic || defaultIdiom),
      };

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
      const errStr = err instanceof Error ? err.message : String(err);
      lastErrorMsg = errStr;
      if (errStr.includes("429") || errStr.includes("rate_limit") || errStr.includes("TPM")) {
        console.warn("[VNToENTaskGenerator] Rate limit hit (429 TPM):", errStr);
      } else if (process.env.NODE_ENV !== "production") {
        console.warn("[VNToENTaskGenerator] API call failed:", err);
      }
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) {
    const waitMatch = lastErrorMsg.match(/try again in ([\d\.]+)s/i);
    const waitSec = waitMatch ? parseFloat(waitMatch[1]) : 0;
    if (waitSec > 0 && waitSec <= 6) {
      const waitMs = Math.ceil(waitSec * 1000) + 350;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    task = await attemptGenerate();
  }

  // Cross-provider failover: if primary provider failed, attempt secondary provider before giving up
  if (!task && provider !== "groq") {
    try {
      const { isProviderConfigured } = await import("@/lib/config/server");
      if (isProviderConfigured("groq")) {
        task = await attemptGenerate("groq", "openai/gpt-oss-120b");
      }
    } catch {}
  } else if (!task && provider === "groq") {
    try {
      const { isProviderConfigured } = await import("@/lib/config/server");
      if (isProviderConfigured("gemini")) {
        task = await attemptGenerate("gemini", "gemini-2.5-flash");
      }
    } catch {}
  }

  // Emergency Fallback to Content Bank on AI rate limits/outages
  if (!task) {
    // If the user explicitly requested AI generation ("Tạo mới bằng AI"),
    // do NOT silently mask the failure by returning from Content Bank.
    // Report the real error directly to the user as requested ("nó bị lỗi gì thì cứ báo ra")
    if (options.forceSource === "ai") {
      throw new Error(
        `Không thể tạo bài tập VN-to-EN từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
      );
    }

    const fallbackBank = await sampleBankTask<VNToENTask>({
      module: "vn_to_en",
      level: retrievalMode,
      difficulty: targetDifficulty,
      forceSource: "bank",
    });
    if (fallbackBank) {
      recordUserExposure(fallbackBank.contentId, "vn_to_en").catch(() => {});
      const fallbackTask = { ...fallbackBank.task, source: "bank" as const };
      if (!fallbackTask.sayItBetter) {
        const expList = fallbackTask.expectedResponses || [];
        fallbackTask.sayItBetter = {
          professional: expList[0] || fallbackTask.targetIntent || "",
          casual: expList[1] || expList[0] || fallbackTask.targetIntent || "",
          idiomatic: expList[2] || expList[0] || fallbackTask.targetIntent || "",
        };
      }
      return fallbackTask;
    }

    throw new Error(
      `Không thể tạo bài tập VN-to-EN từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
    );
  }

  // 3. Flywheel: Save newly AI-generated task into Content Bank for future reuse
  saveBankTask({
    module: "vn_to_en",
    category: task.category || "daily_life",
    level: task.retrievalMode,
    difficulty: task.difficulty.overall,
    topic: task.topic || "general",
    payload: task,
    hashSourceText: task.promptVi || task.targetIntent,
  })
    .then((record) => {
      recordUserExposure(record.id, "vn_to_en").catch(() => {});
    })
    .catch(() => {});

  return task;
}
