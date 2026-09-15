// Task Generator Service for Survival Speaking & Circumlocution (Function 7)
// Provides seed libraries and AI generation for Circumlocution and Real-life Scenarios

import { generateTextWithRouting } from "@/lib/ai";
import {
  circumlocutionTaskSchema,
  survivalScenarioTaskSchema,
} from "@/lib/validation/survival-schemas";
import {
  CIRCUMLOCUTION_TASK_SYSTEM,
  SURVIVAL_SCENARIO_SYSTEM,
} from "@/lib/ai/prompts/survival-prompts";
import { sampleBankTask, saveBankTask, recordUserExposure } from "@/lib/foundation/services/content-bank.service";
import type {
  CircumlocutionTask,
  SurvivalScenarioTask,
} from "@/types/survival-speaking";

import {
  SEED_CIRCUMLOCUTION_TASKS,
  SEED_SURVIVAL_SCENARIOS,
} from "./seed-survival";
import { generateTabooVariations } from "./aristotelian-evaluator.engine";
export {
  SEED_CIRCUMLOCUTION_TASKS,
  SEED_SURVIVAL_SCENARIOS,
};

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

export async function generateCircumlocutionTask(options: {
  difficulty?: "easy" | "medium" | "hard";
  provider?: string;
  model?: string;
  forceSource?: "bank" | "ai" | "auto";
} = {}): Promise<CircumlocutionTask> {
  const provider = options.provider || "gemini";
  const model = options.model && options.model !== "auto" ? options.model : "gemini-3.5-flash-lite";

  if (provider === "mock") {
    const selected = SEED_CIRCUMLOCUTION_TASKS[Math.floor(Math.random() * SEED_CIRCUMLOCUTION_TASKS.length)];
    return { ...selected, id: `circ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  }

  // 1. Check Content Bank (Hybrid 70/30 Policy)
  const diff = options.difficulty || "medium";
  const numDiff = diff === "easy" ? 3 : diff === "medium" ? 5 : 8;
  if (options.forceSource !== "ai") {
    const bankSample = await sampleBankTask<CircumlocutionTask>({
      module: "survival_circumlocution",
      level: diff,
      difficulty: numDiff,
      forceSource: options.forceSource,
    });

    if (bankSample) {
      recordUserExposure(bankSample.contentId, "survival_circumlocution").catch(() => {});
      return { ...bankSample.task, source: "bank" };
    }
  }

  const domains = [
    "Household & Appliances",
    "Workplace & Office Tools",
    "Digital Technology & Software",
    "Travel, Flight & Luggage",
    "Food, Cooking & Restaurant",
    "Business & Finance Terms",
    "Medical & Health Equipment",
    "Social & Emotional Concepts",
  ];
  const chosenDomain = domains[Math.floor(Math.random() * domains.length)];

  const userPrompt = `Generate an authentic Circumlocution Speaking task in domain "${chosenDomain}" with difficulty "${options.difficulty || "medium"}".
The learner must describe this concept without using the forbidden target word. Return strict JSON.`;

  let lastErrorMsg = "";

  const attemptGenerate = async (): Promise<CircumlocutionTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: CIRCUMLOCUTION_TASK_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `circ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      }
      parsed.source = "ai";

      // Ensure hints object exists
      if (!parsed.hints || typeof parsed.hints !== "object") {
        parsed.hints = {
          functionHint: "Dùng trong sinh hoạt hoặc công việc hằng ngày",
          categoryHint: "Một vật dụng hoặc khái niệm phổ biến",
          contextHint: "Thường gặp trong cuộc sống",
          starterHint: "It's a kind of item that you use to...",
        };
      }

      // Aristotelian metadata sanitization
      const hObj = parsed.hints as Record<string, string>;
      if (typeof parsed.genus !== "string" || !parsed.genus.trim()) {
        parsed.genus = hObj.categoryHint || (typeof parsed.category === "string" ? parsed.category : "a general item/concept");
      }
      if (typeof parsed.differentia !== "string" || !parsed.differentia.trim()) {
        parsed.differentia = hObj.functionHint || "used for everyday tasks";
      }

      const targetWordStr = String(parsed.targetWord || "").trim();
      const forbiddenList = Array.isArray(parsed.forbiddenWords)
        ? (parsed.forbiddenWords as string[]).map((w) => String(w).trim()).filter(Boolean)
        : [targetWordStr];

      if (!forbiddenList.includes(targetWordStr) && targetWordStr) {
        forbiddenList.unshift(targetWordStr);
      }
      parsed.forbiddenWords = forbiddenList;

      // Auto-generate taboo lemmas if missing
      if (!Array.isArray(parsed.tabooLemmas) || parsed.tabooLemmas.length === 0) {
        const generated = new Set<string>();
        for (const w of forbiddenList) {
          generateTabooVariations(w).forEach((v) => generated.add(v));
        }
        parsed.tabooLemmas = Array.from(generated);
      }

      // Auto-generate semanticKeyAnchors if missing
      if (!Array.isArray(parsed.semanticKeyAnchors) || parsed.semanticKeyAnchors.length === 0) {
        const diffWords = String(parsed.differentia || "").split(/[^a-zA-Z]+/).filter((w) => w.length >= 4);
        const starterWords = String(hObj.starterHint || "").split(/[^a-zA-Z]+/).filter((w) => w.length >= 4);
        const combined = Array.from(new Set([...diffWords, ...starterWords])).slice(0, 5);
        parsed.semanticKeyAnchors = combined.length > 0 ? combined : ["use", "item", "function"];
      }

      // Sanitize 5-tier hints
      if (!Array.isArray(parsed.tierHints) || parsed.tierHints.length === 0) {
        parsed.tierHints = [
          { tier: 0, title: "Không gợi ý", content: "Tự diễn giải trong 5 giây mà không dùng từ cấm." },
          { tier: 1, title: "Chức năng", content: hObj.functionHint || "Chức năng chính" },
          { tier: 2, title: "Chủng loại", content: hObj.categoryHint || "Chủng loại/vị trí" },
          { tier: 3, title: "Khung câu", content: hObj.starterHint ? `${hObj.starterHint} ______` : "It is a kind of..." },
          { tier: 4, title: "Câu mẫu", content: Array.isArray(parsed.sampleExplanations) && parsed.sampleExplanations[0] ? String(parsed.sampleExplanations[0]) : "Sample explanation..." },
        ];
      }

      // Sanitize sampleExplanations
      if (!Array.isArray(parsed.sampleExplanations) || parsed.sampleExplanations.length === 0) {
        parsed.sampleExplanations = [
          `It's a ${parsed.genus} that ${parsed.differentia}.`,
        ];
      }

      // Sanitize semanticKeyAnchors
      if (!Array.isArray(parsed.semanticKeyAnchors) || parsed.semanticKeyAnchors.length === 0) {
        const words = `${parsed.genus} ${parsed.differentia}`.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
        parsed.semanticKeyAnchors = words.slice(0, 5);
      }

      // Sanitize suggestedVocabulary
      if (!Array.isArray(parsed.suggestedVocabulary)) {
        parsed.suggestedVocabulary = [];
      } else {
        parsed.suggestedVocabulary = (parsed.suggestedVocabulary as any[]).map((v) => ({
          term: String(v.term || ""),
          meaningVi: String(v.meaningVi || ""),
          partOfSpeech: "phrase",
        }));
      }

      const validated = circumlocutionTaskSchema.safeParse(parsed);
      if (!validated.success) {
        lastErrorMsg = `Dữ liệu không khớp schema: ${validated.error.message.slice(0, 150)}`;
        return null;
      }
      return validated.data as CircumlocutionTask;
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      console.error("generateCircumlocutionTask error:", lastErrorMsg);
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  // Emergency Fallback to Content Bank on AI rate limits/outages
  if (!task) {
    const fallbackBank = await sampleBankTask<CircumlocutionTask>({
      module: "survival_circumlocution",
      level: diff,
      difficulty: numDiff,
      forceSource: "bank",
    });
    if (fallbackBank) {
      recordUserExposure(fallbackBank.contentId, "survival_circumlocution").catch(() => {});
      return { ...fallbackBank.task, source: "bank" };
    }

    throw new Error(
      `Không thể tạo bài tập Diễn đạt vòng (Circumlocution) từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
    );
  }

  // Save newly AI-generated task into Content Bank
  saveBankTask({
    module: "survival_circumlocution",
    category: task.category || "general",
    level: task.difficulty,
    difficulty: numDiff,
    topic: task.category || "general",
    payload: task,
    hashSourceText: task.targetWord,
  })
    .then((record) => {
      recordUserExposure(record.id, "survival_circumlocution").catch(() => {});
    })
    .catch(() => {});

  return task;
}

export async function generateSurvivalScenarioTask(options: {
  context?: string;
  provider?: string;
  model?: string;
  forceSource?: "bank" | "ai" | "auto";
} = {}): Promise<SurvivalScenarioTask> {
  const provider = options.provider || "gemini";
  const model = options.model && options.model !== "auto" ? options.model : "gemini-3.5-flash-lite";

  if (provider === "mock") {
    const selected = SEED_SURVIVAL_SCENARIOS[Math.floor(Math.random() * SEED_SURVIVAL_SCENARIOS.length)];
    return { ...selected, id: `scen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  }

  // 1. Check Content Bank (Hybrid 70/30 Policy)
  if (options.forceSource !== "ai") {
    const bankSample = await sampleBankTask<SurvivalScenarioTask>({
      module: "survival_scenario",
      topic: options.context,
      forceSource: options.forceSource,
    });

    if (bankSample) {
      recordUserExposure(bankSample.contentId, "survival_scenario").catch(() => {});
      return { ...bankSample.task, source: "bank" };
    }
  }

  const contexts = [
    "Job Interview (interviewer speaks too fast or uses tough terminology)",
    "Workplace & Team Meeting (boss asks unexpected opinion on budget/strategy)",
    "Client Presentation (client asks tricky question or disagrees)",
    "Airport & Immigration (officer asks for unexpected paperwork)",
    "Restaurant & Dining (wrong order or bill dispute)",
    "Technical Discussion (complex technical term you forgot)",
    "Phone & Video Call (audio cutting out, need 5 seconds to find info)",
  ];
  const chosenContext = options.context || contexts[Math.floor(Math.random() * contexts.length)];

  const userPrompt = `Generate an authentic Real-Life Survival Communication Scenario in context: "${chosenContext}".
Create a real problem where the speaker must immediately react and repair the conversation within 5 seconds. Return strict JSON.`;

  let lastErrorMsg = "";

  const attemptGenerate = async (): Promise<SurvivalScenarioTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: SURVIVAL_SCENARIO_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `scen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      }
      parsed.source = "ai";

      const phrases = Array.isArray(parsed.suggestedRepairPhrases)
        ? (parsed.suggestedRepairPhrases as string[])
        : ["Sorry, could you repeat that please?"];

      // Sanitize 4-tier stepper hints
      if (!Array.isArray(parsed.tierHints) || parsed.tierHints.length === 0) {
        parsed.tierHints = [
          { tier: 0, title: "Không gợi ý", content: "Tự phản xạ và xử lý tình huống ngay lập tức." },
          { tier: 1, title: "Chiến lược", content: "Dùng câu đệm xin nhắc lại hoặc làm rõ ý." },
          { tier: 2, title: "Mẫu mở đầu", content: phrases[0] ? `${phrases[0].slice(0, 20)}...` : "Could you..." },
          { tier: 3, title: "Câu mẫu", content: phrases[0] || "Sorry, I didn't catch that. Could you say it again?" },
        ];
      }

      // Sanitize suggestedVocabulary
      if (!Array.isArray(parsed.suggestedVocabulary)) {
        parsed.suggestedVocabulary = [];
      } else {
        parsed.suggestedVocabulary = (parsed.suggestedVocabulary as any[]).map((v) => ({
          term: String(v.term || ""),
          meaningVi: String(v.meaningVi || ""),
          partOfSpeech: "phrase",
        }));
      }

      const validated = survivalScenarioTaskSchema.safeParse(parsed);
      if (!validated.success) {
        lastErrorMsg = `Dữ liệu không khớp schema: ${validated.error.message.slice(0, 150)}`;
        return null;
      }
      return validated.data as SurvivalScenarioTask;
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      console.error("generateSurvivalScenarioTask error:", lastErrorMsg);
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  // Emergency Fallback to Content Bank on AI rate limits/outages
  if (!task) {
    const fallbackBank = await sampleBankTask<SurvivalScenarioTask>({
      module: "survival_scenario",
      forceSource: "bank",
    });
    if (fallbackBank) {
      recordUserExposure(fallbackBank.contentId, "survival_scenario").catch(() => {});
      return { ...fallbackBank.task, source: "bank" };
    }

    throw new Error(
      `Không thể tạo bài tập Tình huống sinh tồn (Survival Scenario) từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
    );
  }

  // Save newly AI-generated task into Content Bank
  saveBankTask({
    module: "survival_scenario",
    category: task.context || "general",
    difficulty: 5,
    topic: task.context || "general",
    payload: task,
    hashSourceText: task.audioPromptText || task.problemDescriptionVi,
  })
    .then((record) => {
      recordUserExposure(record.id, "survival_scenario").catch(() => {});
    })
    .catch(() => {});

  return task;
}
