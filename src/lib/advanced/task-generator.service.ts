// Task generator for Advanced Studio — 3 tracks × 3 levels, mock-first + AI with bank flywheel

import { generateTextWithRouting } from "@/lib/ai";
import { advancedTaskSchema } from "@/lib/validation/advanced-schemas";
import { sampleBankTask, saveBankTask, recordUserExposure } from "@/lib/foundation/services/content-bank.service";
import { resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";
import { ADVANCED_LEVEL_CONFIG } from "./adaptive-engine";
import { defaultSkillTagForTrack } from "./track-map";
import type { AdvancedLevel, AdvancedTask, AdvancedTrack, AdvancedTrainingType } from "@/types/advanced";

export interface GenerateAdvancedTaskOptions {
  track?: AdvancedTrack;
  level?: AdvancedLevel;
  skillTag?: AdvancedTrainingType;
  targetDifficulty?: number;
  topic?: string;
  prepTimeSec?: number;
  blitzLimitSec?: number;
  provider?: string;
  model?: string;
  recentErrors?: string[];
  recentPrompts?: string[];
  targetErrorPatternKey?: string;
  pedagogicalConstraint?: string;
  forceSource?: "bank" | "ai" | "auto";
}

const TRACK_PROMPT: Record<AdvancedTrack, string> = {
  reflex: "Rapid reflex under time pressure: answer in 2-4 sentences immediately, no preparation.",
  argument: "Opinion → reason → evidence → rebuttal: take a stance and defend it with Toulmin structure.",
  extended: "Extended discourse: speak 60-120s continuously with setup → development → example → conclusion.",
};

const LEVEL_PROMPT: Record<AdvancedLevel, string> = {
  L1: "Controlled: give heavy scaffold (template with blanks, starter, keywords, vocab). Require only Claim+Data.",
  L2: "Semi-controlled: give keywords + 1-2 constraints, starter only. Require Claim+Data+Warrant.",
  L3: "Free: minimal cue, no template. Require full Claim+Data+Warrant+Rebuttal, invite counterargument awareness.",
};

function getMockTask(options: GenerateAdvancedTaskOptions): AdvancedTask {
  const track = options.track || "reflex";
  const level = options.level || "L1";
  const cfg = ADVANCED_LEVEL_CONFIG[level];
  const skillTag = options.skillTag || defaultSkillTagForTrack(track);
  const id = `adv_task_mock_${Date.now()}`;
  const mocks: Record<AdvancedTrack, { promptVi: string; intent: string; expected: string[]; elements: string[] }> = {
    reflex: {
      promptVi: "Bạn có 5 giây: cuối tuần vừa rồi bạn đã làm gì để nạp lại năng lượng?",
      intent: "Last weekend I recharged by hiking with friends and unplugging from work.",
      expected: [
        "Last weekend I recharged by hiking with friends and unplugging from work.",
        "To recharge last weekend, I went hiking with friends and stayed offline.",
      ],
      elements: ["last weekend", "hiking", "recharge"],
    },
    argument: {
      promptVi: "Bảo vệ quan điểm: làm việc từ xa không làm giảm sáng tạo của kỹ sư.",
      intent: "Remote work does not reduce engineer creativity when rituals are strong.",
      expected: [
        "In my view, remote work does not reduce creativity because strong rituals keep ideas flowing. For example, our team ships faster async. While critics say isolation hurts brainstorming, structured demos solve that.",
      ],
      elements: ["remote work", "creativity", "rituals"],
    },
    extended: {
      promptVi: "Kể về một lần bạn xử lý sự cố áp lực cao và bài học rút ra.",
      intent: "A high-pressure incident taught me to stay calm, communicate early, and document lessons.",
      expected: [
        "Let me tell you about a Black Friday outage. First we detected the spike, then we rolled back and communicated every 15 minutes. In the end we recovered in 40 minutes. The lesson was to practice runbooks before peak season.",
      ],
      elements: ["outage", "communicated", "lesson"],
    },
  };
  const m = mocks[track];
  const full = m.expected[0];
  const words = full.split(" ").filter(Boolean);
  return {
    id,
    track,
    level,
    skillTag,
    instruction:
      track === "reflex"
        ? "Trả lời ngay bằng tiếng Anh (2-4 câu, không chuẩn bị dài):"
        : track === "argument"
          ? "Nêu quan điểm → lý do → dẫn chứng → phản biện bằng tiếng Anh:"
          : "Trình bày mạch dài 60-120s bằng tiếng Anh (mở → triển khai → ví dụ → kết):",
    promptVi: m.promptVi,
    scenario: options.topic && options.topic !== "random" ? options.topic : undefined,
    targetIntent: m.intent,
    expectedResponses: m.expected,
    requiredMeaningElements: m.elements,
    scaffold: {
      level: cfg.scaffold,
      template: level === "L1" ? words.slice(0, 4).join(" ") + " ___." : null,
      keywords: level === "L3" ? [] : m.elements,
      starter: level === "L1" ? words.slice(0, 3).join(" ") + "..." : level === "L2" ? "In my view..." : null,
      constraints: level === "L2" ? ["Use 'because'", "Give one example"] : level === "L3" ? ["Include a rebuttal ('While critics argue...')"] : [],
    },
    hints: [
      { tier: 0, title: "Không gợi ý", content: "Tự phản xạ và nói ngay.", penaltyWeight: 0 },
      { tier: 1, title: "Từ khoá", content: m.elements.join(" / "), penaltyWeight: 0.1 },
      { tier: 2, title: "Khung Toulmin", content: level === "L1" ? words.slice(0, 6).join(" ") + "..." : "Claim → Data → Warrant → Rebuttal", penaltyWeight: 0.25 },
      { tier: 3, title: "Câu mở đầu", content: words.slice(0, 8).join(" ") + "...", penaltyWeight: 0.5 },
      { tier: 4, title: "Bài mẫu", content: full, penaltyWeight: 0.85 },
    ],
    suggestedVocabulary: m.elements.map((e) => ({ term: e, meaningVi: "" })),
    sayItBetter: { professional: full, casual: m.expected[1] || full, idiomatic: full },
    difficulty: { overall: options.targetDifficulty ?? cfg.difficulty, grammarComplexity: 3, retrievalDemand: 0.6, semanticDensity: 3 },
    skills: [skillTag],
    grammarTargets: ["present_simple"],
    vocabularyTargets: m.elements,
    topic: options.topic || "general",
    prepTimeSec: options.prepTimeSec ?? cfg.prepTimeSec,
    blitzLimitSec: options.blitzLimitSec ?? cfg.blitzLimitSec,
    requiredToulminElements: (cfg.toulmin as AdvancedTask["requiredToulminElements"]),
    targetErrorPatternKey: options.targetErrorPatternKey,
    source: "seed",
  };
}

function cleanJson(text: string): unknown {
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
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

const GENERATOR_SYSTEM = `You generate Advanced English speaking tasks for Vietnamese learners (B2-C1).
Return ONLY valid JSON matching AdvancedTask (no markdown).
Fields: id(string), track(reflex|argument|extended), level(L1|L2|L3), skillTag(string), instruction(Vietnamese), promptVi(Vietnamese situation), targetIntent(English core meaning), expectedResponses(2 English natural answers, L3 longer 60-120s outline), requiredMeaningElements(3-4 chunks), scaffold{level 1|2|3, template?, keywords?, starter?, constraints?}, hints[5 tiers 0-4 with penaltyWeight 0/0.1/0.25/0.5/0.85], suggestedVocabulary[{term,meaningVi}], sayItBetter{professional,casual,idiomatic}, difficulty{overall 1-10, grammarComplexity 1-5, retrievalDemand 0-1, semanticDensity 1-5}, skills[], grammarTargets[], vocabularyTargets[], topic, prepTimeSec, blitzLimitSec, requiredToulminElements.
Keep promptVi grounded in the given topic. Avoid repeating recentPrompts.`;

export async function generateAdvancedTask(options: GenerateAdvancedTaskOptions = {}): Promise<AdvancedTask> {
  const track = options.track || "reflex";
  const level = options.level || "L1";
  const cfg = ADVANCED_LEVEL_CONFIG[level];
  const provider = options.provider || "gemini";
  const model = options.model || "auto";

  if (provider === "mock") return getMockTask({ ...options, track, level });

  const effectiveTopic = resolveTopicForPrompt(options.topic);

  if (options.forceSource !== "ai") {
    try {
      const bankSample = await sampleBankTask<AdvancedTask>({
        module: "advanced",
        level: `${track}_${level}`,
        difficulty: options.targetDifficulty ?? cfg.difficulty,
        topic: options.topic && options.topic !== "random" ? options.topic : undefined,
        forceSource: options.forceSource,
      });
      if (bankSample) {
        recordUserExposure(bankSample.contentId, "advanced").catch(() => {});
        return { ...bankSample.task, source: "bank" };
      }
    } catch {}
  }

  const userPrompt = [
    `Track: ${track} — ${TRACK_PROMPT[track]}`,
    `Level: ${level} — ${LEVEL_PROMPT[level]}`,
    `Topic: ${effectiveTopic}`,
    `Target difficulty: ${options.targetDifficulty ?? cfg.difficulty}/10, prepTimeSec ${options.prepTimeSec ?? cfg.prepTimeSec}, blitzLimitSec ${options.blitzLimitSec ?? cfg.blitzLimitSec}`,
    options.skillTag ? `Skill tag: ${options.skillTag}` : "",
    options.targetErrorPatternKey ? `Must naturally elicit and repair weakness: ${options.targetErrorPatternKey}` : "",
    options.recentErrors?.length ? `Recent errors to remediate: ${options.recentErrors.slice(-5).join(", ")}` : "",
    options.recentPrompts?.length ? `Avoid repeating: ${options.recentPrompts.slice(-6).join(" | ").slice(0, 500)}` : "",
    options.pedagogicalConstraint ? `Constraint: ${options.pedagogicalConstraint}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const attempt = async (): Promise<AdvancedTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: { messages: [{ role: "user", content: userPrompt }], systemInstruction: GENERATOR_SYSTEM, temperature: 0.7, maxOutputTokens: 1100 },
      });
      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed) return null;
      if (!parsed.id) parsed.id = `adv_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      if (!parsed.track) parsed.track = track;
      if (!parsed.level) parsed.level = level;
      if (!parsed.skillTag) parsed.skillTag = options.skillTag || defaultSkillTagForTrack(track);
      if (!parsed.topic) parsed.topic = effectiveTopic || "general";
      if (typeof parsed.prepTimeSec !== "number") parsed.prepTimeSec = options.prepTimeSec ?? cfg.prepTimeSec;
      if (typeof parsed.blitzLimitSec !== "number") parsed.blitzLimitSec = options.blitzLimitSec ?? cfg.blitzLimitSec;
      if (!Array.isArray(parsed.requiredToulminElements) || parsed.requiredToulminElements.length === 0) {
        parsed.requiredToulminElements = cfg.toulmin;
      }
      parsed.source = "ai";
      const validated = advancedTaskSchema.safeParse(parsed);
      if (!validated.success) {
        if (process.env.NODE_ENV !== "production") console.warn("[AdvancedTaskGenerator] schema invalid", validated.error.issues.slice(0, 3));
        return null;
      }
      return validated.data as unknown as AdvancedTask;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.warn("[AdvancedTaskGenerator] failed", err);
      return null;
    }
  };

  let task = await attempt();
  if (!task) task = await attempt();
  if (!task) {
    if (options.forceSource !== "ai") {
      try {
        const fb = await sampleBankTask<AdvancedTask>({ module: "advanced", level: `${track}_${level}`, difficulty: options.targetDifficulty ?? cfg.difficulty, forceSource: "bank" });
        if (fb) {
          recordUserExposure(fb.contentId, "advanced").catch(() => {});
          return { ...fb.task, source: "bank" };
        }
      } catch {}
    }
    return getMockTask({ ...options, track, level });
  }

  saveBankTask({
    module: "advanced",
    category: track,
    level: `${track}_${level}`,
    difficulty: task.difficulty.overall,
    topic: task.topic || "general",
    payload: task,
    hashSourceText: task.promptVi || task.targetIntent,
  }).catch(() => {});

  return task;
}
