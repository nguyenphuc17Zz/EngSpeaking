// Barrel — provider factory that never leaks keys to client
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { GroqProvider } from "@/lib/ai/providers/groq";
import { MockProvider } from "@/lib/ai/providers/mock";
import { getProviderApiKey } from "@/lib/config/server";
import type { AIProvider } from "@/lib/ai/interfaces/provider";
import type { TextGenerationInput, TextGenerationResult } from "@/types/ai";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";
import { resolveAutoModelServer } from "@/lib/ai/routing/auto-resolver";
import {
  CONVERSATION_SYSTEM_PROMPT_V1,
  PEDAGOGICAL_CONVERSATION_SYSTEM_PROMPT,
  OPENING_PEDAGOGICAL_SYSTEM_PROMPT,
  INFINITE_SCENARIO_SYSTEM_PROMPT,
  OPENING_PROMPT_INSTRUCTION,
  truncateHistory,
} from "@/lib/ai/prompts/conversation";
import { logger } from "@/lib/logger";

export function createProvider(providerId: string): AIProvider | null {
  const key = getProviderApiKey(providerId) || "";
  const lower = providerId.toLowerCase();
  // MOCK kill-switch §7: never allow mock in production unless explicitly MOCK_AI=true
  if (lower === "mock" && process.env.NODE_ENV === "production" && process.env.MOCK_AI !== "true") {
    return null;
  }
  if (lower === "gemini") {
    if (!key && process.env.MOCK_AI === "true") return new MockProvider();
    return new GeminiProvider(key);
  }
  if (lower === "groq") {
    if (!key && process.env.MOCK_AI === "true") return new MockProvider();
    return new GroqProvider(key);
  }
  if (lower === "mock") return new MockProvider();
  return null;
}

export async function generateTextWithRouting(opts: {
  provider: string; // "auto" | id
  model: string; // "auto" | id
  input: Omit<TextGenerationInput, "model">;
}): Promise<TextGenerationResult> {
  let providerId = opts.provider;
  let modelId = opts.model;
  // Strict per user choice: "auto" resolves deterministically, but no fallback on failure §36
  if (providerId === "auto" || modelId === "auto") {
    const resolved = resolveAutoModelServer("conversation");
    if (providerId === "auto") providerId = resolved.providerId;
    if (modelId === "auto") modelId = resolved.modelId;
  }
  const provider = createProvider(providerId);
  if (!provider) throw new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: `Provider ${providerId} not configured`, provider: providerId });
  logger.providerSelected({ provider: providerId, model: modelId });
  const result = await provider.generateText({ ...opts.input, model: modelId });
  // Validate via Zod
  const { textGenerationResultSchema } = await import("@/lib/validation/schemas");
  const parsed = textGenerationResultSchema.safeParse(result);
  if (!parsed.success) throw new VoiceEngineError({ code: VoiceErrorCode.INVALID_PROVIDER_RESPONSE, message: "Invalid AI response", raw: parsed.error });
  return result;
}

export async function generateOpeningPrompt(opts: { provider: string; model: string }): Promise<TextGenerationResult> {
  return generateTextWithRouting({
    provider: opts.provider,
    model: opts.model,
    input: {
      messages: [{ role: "user", content: OPENING_PROMPT_INSTRUCTION }],
      systemInstruction: CONVERSATION_SYSTEM_PROMPT_V1,
      temperature: 0.8,
      maxOutputTokens: 120,
    },
  });
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
      } catch {}
    }
    return null;
  }
}

export async function generateConversationReply(opts: {
  provider: string;
  model: string;
  turns: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  currentUserText: string;
}): Promise<TextGenerationResult> {
  const history = truncateHistory([...opts.turns, { role: "user" as const, content: opts.currentUserText }], 14);
  // Build messages excluding duplicate system (we inject via systemInstruction)
  const messages = history.filter((t) => t.role !== "system").map((t) => ({ role: t.role as "user" | "assistant", content: t.content }));
  return generateTextWithRouting({
    provider: opts.provider,
    model: opts.model,
    input: {
      messages,
      systemInstruction: CONVERSATION_SYSTEM_PROMPT_V1,
      temperature: 0.7,
      maxOutputTokens: 220,
    },
  });
}

export interface DynamicScaffoldingHints {
  tier1Keywords: Array<{ term: string; meaning: string }>;
  tier2Starters: Array<{ starter: string; meaning: string }>;
  tier3FullAnswer: { en: string; vi: string };
}

export interface PedagogicalConversationResult {
  provider: string;
  model: string;
  replyText: string;
  pedagogy: {
    grammarIssue: string | null;
    grammarFix: string | null;
    nativeReformulation: string;
    vocabularyUsed: string[];
    turnScore: number;
    coachTipVi?: string;
  };
  hints: DynamicScaffoldingHints;
}

export async function generatePedagogicalConversationReply(opts: {
  provider: string;
  model: string;
  turns: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  currentUserText: string;
  scenarioContext?: string;
}): Promise<PedagogicalConversationResult> {
  const history = truncateHistory([...opts.turns, { role: "user" as const, content: opts.currentUserText }], 14);
  const messages = history
    .filter((t) => t.role !== "system")
    .map((t) => ({ role: t.role as "user" | "assistant", content: t.content }));

  const systemPrompt = opts.scenarioContext
    ? `${PEDAGOGICAL_CONVERSATION_SYSTEM_PROMPT}\n\nCurrent Scenario / Goal:\n${opts.scenarioContext}`
    : PEDAGOGICAL_CONVERSATION_SYSTEM_PROMPT;

  const rawRes = await generateTextWithRouting({
    provider: opts.provider,
    model: opts.model,
    input: {
      messages,
      systemInstruction: systemPrompt,
      temperature: 0.5,
      maxOutputTokens: 750,
    },
  });

  const parsed = cleanJson(rawRes.text) as {
    replyText?: string;
    pedagogy?: {
      grammarIssue?: string | null;
      grammarFix?: string | null;
      nativeReformulation?: string;
      vocabularyUsed?: string[];
      turnScore?: number;
      coachTipVi?: string;
    };
    hints?: {
      tier1Keywords?: Array<{ term: string; meaning: string }>;
      tier2Starters?: Array<{ starter: string; meaning: string }>;
      tier3FullAnswer?: { en: string; vi: string };
    };
  } | null;

  const fallbackHints: DynamicScaffoldingHints = {
    tier1Keywords: [
      { term: "From my perspective", meaning: "Theo góc nhìn của tôi" },
      { term: "As far as I know", meaning: "Theo như tôi biết" },
      { term: "Take into account", meaning: "Cân nhắc, tính đến" },
    ],
    tier2Starters: [
      { starter: "I'd say that...", meaning: "Tôi sẽ nói rằng..." },
      { starter: "When it comes to...", meaning: "Khi nói đến..." },
      { starter: "To be honest, I think...", meaning: "Thành thật mà nói, tôi nghĩ..." },
    ],
    tier3FullAnswer: {
      en: "From my experience, taking consistent steps brings the best outcome.",
      vi: "Từ trải nghiệm của tôi, từng bước nhỏ nhất quán luôn đem lại kết quả tốt nhất.",
    },
  };

  if (parsed && parsed.replyText) {
    return {
      provider: rawRes.provider,
      model: rawRes.model,
      replyText: parsed.replyText.trim(),
      pedagogy: {
        grammarIssue: parsed.pedagogy?.grammarIssue || null,
        grammarFix: parsed.pedagogy?.grammarFix || null,
        nativeReformulation:
          parsed.pedagogy?.nativeReformulation || opts.currentUserText,
        vocabularyUsed: parsed.pedagogy?.vocabularyUsed || [],
        turnScore: parsed.pedagogy?.turnScore || 85,
        coachTipVi: parsed.pedagogy?.coachTipVi || "Phản xạ giao tiếp tốt!",
      },
      hints: {
        tier1Keywords: parsed.hints?.tier1Keywords?.length ? parsed.hints.tier1Keywords : fallbackHints.tier1Keywords,
        tier2Starters: parsed.hints?.tier2Starters?.length ? parsed.hints.tier2Starters : fallbackHints.tier2Starters,
        tier3FullAnswer: parsed.hints?.tier3FullAnswer?.en ? parsed.hints.tier3FullAnswer : fallbackHints.tier3FullAnswer,
      },
    };
  }

  // Fallback if raw text returned instead of JSON
  return {
    provider: rawRes.provider,
    model: rawRes.model,
    replyText: rawRes.text.trim() || "That's interesting, could you tell me more?",
    pedagogy: {
      grammarIssue: null,
      grammarFix: null,
      nativeReformulation: opts.currentUserText,
      vocabularyUsed: [],
      turnScore: 80,
      coachTipVi: "Tiếp tục duy trì hội thoại nhé!",
    },
    hints: fallbackHints,
  };
}

export async function generateOpeningPedagogicalPrompt(opts: {
  provider: string;
  model: string;
  scenarioContext?: string;
}): Promise<{
  provider: string;
  model: string;
  openingPrompt: string;
  hints: DynamicScaffoldingHints;
}> {
  const systemPrompt = opts.scenarioContext
    ? `${OPENING_PEDAGOGICAL_SYSTEM_PROMPT}\n\nCurrent Scenario / Goal:\n${opts.scenarioContext}`
    : OPENING_PEDAGOGICAL_SYSTEM_PROMPT;

  const rawRes = await generateTextWithRouting({
    provider: opts.provider,
    model: opts.model,
    input: {
      messages: [{ role: "user", content: "Generate the opening greeting and dynamic scaffolding hints." }],
      systemInstruction: systemPrompt,
      temperature: 0.6,
      maxOutputTokens: 600,
    },
  });

  const parsed = cleanJson(rawRes.text) as {
    openingPrompt?: string;
    hints?: {
      tier1Keywords?: Array<{ term: string; meaning: string }>;
      tier2Starters?: Array<{ starter: string; meaning: string }>;
      tier3FullAnswer?: { en: string; vi: string };
    };
  } | null;

  const fallbackHints: DynamicScaffoldingHints = {
    tier1Keywords: [
      { term: "I have experience with", meaning: "Tôi có kinh nghiệm với" },
      { term: "Recently, I focused on", meaning: "Gần đây, tôi tập trung vào" },
      { term: "In terms of background", meaning: "Về nền tảng của tôi" },
    ],
    tier2Starters: [
      { starter: "To start with, I...", meaning: "Để bắt đầu, tôi..." },
      { starter: "Regarding my background, I...", meaning: "Về kinh nghiệm của tôi, tôi..." },
    ],
    tier3FullAnswer: {
      en: "Hello! I am excited to be here and look forward to our conversation.",
      vi: "Xin chào! Tôi rất hào hứng được có mặt ở đây và mong chờ cuộc trò chuyện này.",
    },
  };

  return {
    provider: rawRes.provider,
    model: rawRes.model,
    openingPrompt: parsed?.openingPrompt || "Hello! Let's get started with our conversation today. How are you doing?",
    hints: {
      tier1Keywords: parsed?.hints?.tier1Keywords?.length ? parsed.hints.tier1Keywords : fallbackHints.tier1Keywords,
      tier2Starters: parsed?.hints?.tier2Starters?.length ? parsed.hints.tier2Starters : fallbackHints.tier2Starters,
      tier3FullAnswer: parsed?.hints?.tier3FullAnswer?.en ? parsed.hints.tier3FullAnswer : fallbackHints.tier3FullAnswer,
    },
  };
}

export interface TacticalScenario {
  id: string;
  title: string;
  titleVi: string;
  category: "workplace" | "interview" | "daily" | "travel" | "debate" | "custom";
  aiRole: string;
  userRole: string;
  goal: string;
  targetTurns: number;
  openingPrompt: string;
  tacticalGuide: {
    recommendedTone: string;
    strategyTip: string;
    pitfallsToAvoid: string;
  };
  hints: DynamicScaffoldingHints;
}

export async function generateInfiniteScenario(opts: {
  provider: string;
  model: string;
  topic?: string;
  category?: string;
  level?: string;
}): Promise<TacticalScenario> {
  const userInstruction = opts.topic
    ? `Topic or custom user prompt: "${opts.topic}". Category preference: ${opts.category || "any"}. Level: ${opts.level || "B1-B2"}.`
    : `Generate an exciting, unexpected, highly practical scenario for category: ${opts.category || "workplace"}. Level: ${opts.level || "B1-B2"}.`;

  const rawRes = await generateTextWithRouting({
    provider: opts.provider,
    model: opts.model,
    input: {
      messages: [{ role: "user", content: userInstruction }],
      systemInstruction: INFINITE_SCENARIO_SYSTEM_PROMPT,
      temperature: 0.8,
      maxOutputTokens: 900,
    },
  });

  const parsed = cleanJson(rawRes.text) as TacticalScenario | null;

  if (parsed && parsed.title && parsed.openingPrompt) {
    return {
      id: parsed.id || `scen_${Date.now()}`,
      title: parsed.title,
      titleVi: parsed.titleVi || parsed.title,
      category: parsed.category || "workplace",
      aiRole: parsed.aiRole || "AI Conversation Partner",
      userRole: parsed.userRole || "Learner",
      goal: parsed.goal || "Luyện phản xạ giao tiếp tự nhiên và đạt mục tiêu hội thoại.",
      targetTurns: parsed.targetTurns || 6,
      openingPrompt: parsed.openingPrompt,
      tacticalGuide: {
        recommendedTone: parsed.tacticalGuide?.recommendedTone || "Tự tin, lịch thiệp và mạch lạc.",
        strategyTip: parsed.tacticalGuide?.strategyTip || "Tập trung trả lời thẳng vào trọng tâm câu hỏi của AI.",
        pitfallsToAvoid: parsed.tacticalGuide?.pitfallsToAvoid || "Tránh trả lời cộc lốc chỉ có một từ.",
      },
      hints: parsed.hints?.tier1Keywords?.length
        ? parsed.hints
        : {
            tier1Keywords: [
              { term: "From my perspective", meaning: "Theo góc nhìn của tôi" },
              { term: "In terms of", meaning: "Xét về mặt" },
            ],
            tier2Starters: [
              { starter: "I would say that...", meaning: "Tôi muốn nói rằng..." },
            ],
            tier3FullAnswer: {
              en: "I appreciate you bringing this up, and I would like to share my thoughts.",
              vi: "Tôi rất cảm ơn bạn đã nêu vấn đề này, và tôi muốn chia sẻ suy nghĩ của mình.",
            },
          },
    };
  }

  // Fallback
  return {
    id: `scen_${Date.now()}`,
    title: "International Project Discussion",
    titleVi: "Thảo luận Dự án Quốc tế",
    category: "workplace",
    aiRole: "Technical Project Lead",
    userRole: "Software Engineer",
    goal: "Báo cáo tiến độ và đề xuất giải pháp kỹ thuật tối ưu.",
    targetTurns: 6,
    openingPrompt: "Hello! Thanks for meeting today. Could you walk me through your recent progress on the core features?",
    tacticalGuide: {
      recommendedTone: "Chuyên nghiệp, rõ ràng và cầu thị.",
      strategyTip: "Nêu kết quả trước rồi giải thích chi tiết sau.",
      pitfallsToAvoid: "Tránh đổ lỗi khi gặp sự cố kỹ thuật.",
    },
    hints: {
      tier1Keywords: [
        { term: "Progress update", meaning: "Cập nhật tiến độ" },
        { term: "Key milestone", meaning: "Cột mốc quan trọng" },
      ],
      tier2Starters: [
        { starter: "Regarding our progress, we...", meaning: "Về tiến độ, chúng tôi..." },
      ],
      tier3FullAnswer: {
        en: "We have completed the core API integration and are currently conducting end-to-end tests.",
        vi: "Chúng tôi đã hoàn thành việc tích hợp API cốt lõi và đang tiến hành kiểm thử toàn diện.",
      },
    },
  };
}
