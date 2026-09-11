import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validation/schemas";
import { generateTextWithRouting, generateConversationReply } from "@/lib/ai";
import { VoiceEngineError } from "@/lib/errors/codes";
import { toUserMessage } from "@/lib/errors/codes";
import { logger } from "@/lib/logger";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

function sanitizeInput(text: string, max = 2000): string {
  return text.slice(0, max).replace(/<[^>]*>/g, "").replace(/\b(system|assistant)\s*:/gi, "");
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = checkRateLimit(`chat:${ip}`, 30);
  if (!rl.allowed) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Quá nhiều yêu cầu, vui lòng thử lại sau." } }, { status: 429, headers: rateLimitResponse(rl.remaining, rl.resetMs) });
  }
  const requestId = crypto.randomUUID();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "JSON không hợp lệ" } }, { status: 400 });
  }

  const { provider = "auto", model = "auto", messages, systemInstruction, temperature, maxOutputTokens, turns, mode } = body as {
    provider?: string;
    model?: string;
    messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    turns?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    mode?: "opening" | "opening_pedagogical" | "reply" | "pedagogical_reply" | "lifeline";
    currentUserText?: string;
    scenarioContext?: string;
  };

  try {
    // Opening pedagogical prompt mode with dynamic initial hints
    if (mode === "opening_pedagogical") {
      const scenarioContext = (body as { scenarioContext?: string }).scenarioContext;
      const { generateOpeningPedagogicalPrompt } = await import("@/lib/ai");
      const result = await generateOpeningPedagogicalPrompt({ provider, model, scenarioContext });
      logger.aiCompleted({ provider: result.provider, model: result.model });
      return NextResponse.json({ result });
    }

    // Opening prompt mode
    if (mode === "opening") {
      const { generateOpeningPrompt } = await import("@/lib/ai");
      const result = await generateOpeningPrompt({ provider, model });
      logger.aiCompleted({ provider: result.provider, model: result.model });
      return NextResponse.json({ result });
    }

    // Pedagogical Conversation reply with dual response + turn feedback
    if (mode === "pedagogical_reply" && Array.isArray(turns)) {
      if (turns.length > 50) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Quá nhiều turns (tối đa 50)" } }, { status: 400 });
      let currentUserText = (body as { currentUserText?: string }).currentUserText || "";
      if (!currentUserText.trim()) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Thiếu currentUserText" } }, { status: 400 });
      currentUserText = sanitizeInput(currentUserText, 2000);
      const scenarioContext = (body as { scenarioContext?: string }).scenarioContext;
      const discourseStage = (body as { discourseStage?: any }).discourseStage;
      const activeTwist = (body as { activeTwist?: any }).activeTwist;
      const userTurnDurationMs = (body as { userTurnDurationMs?: number }).userTurnDurationMs;
      const safeTurns = turns.slice(-20).map((t) => ({ ...t, content: sanitizeInput(t.content, 1000) }));
      const { generatePedagogicalConversationReply } = await import("@/lib/ai");
      const result = await generatePedagogicalConversationReply({
        provider,
        model,
        turns: safeTurns,
        currentUserText,
        scenarioContext,
        discourseStage,
        activeTwist,
        userTurnDurationMs,
      });
      const headers = { "x-request-id": requestId, ...rateLimitResponse(rl.remaining, rl.resetMs) } as Record<string, string>;
      return NextResponse.json({ result }, { headers });
    }

    // Silence Lifeline emergency hint generation
    if (mode === "lifeline") {
      const lastAiTurnText = (body as { lastAiTurnText?: string }).lastAiTurnText || "";
      const scenarioTitle = (body as { scenarioTitle?: string }).scenarioTitle || "";
      const { generateLifelineEmergencyHints } = await import("@/lib/ai");
      const result = await generateLifelineEmergencyHints({
        provider,
        model,
        lastAiTurnText: sanitizeInput(lastAiTurnText, 500),
        scenarioTitle: sanitizeInput(scenarioTitle, 200),
      });
      return NextResponse.json({ result });
    }

    // Conversation reply with context management
    if (mode === "reply" && Array.isArray(turns)) {
      if (turns.length > 50) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Quá nhiều turns (tối đa 50)" } }, { status: 400 });
      let currentUserText = (body as { currentUserText?: string }).currentUserText || "";
      if (!currentUserText.trim()) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Thiếu currentUserText" } }, { status: 400 });
      currentUserText = sanitizeInput(currentUserText, 2000);
      const safeTurns = turns.slice(-20).map((t) => ({ ...t, content: sanitizeInput(t.content, 1000) }));
      const result = await generateConversationReply({ provider, model, turns: safeTurns, currentUserText });
      const headers = { "x-request-id": requestId, ...rateLimitResponse(rl.remaining, rl.resetMs) } as Record<string, string>;
      return NextResponse.json({ result }, { headers });
    }

    // Generic chat
    const parsed = chatRequestSchema.safeParse({ messages, systemInstruction, temperature, maxOutputTokens, model, provider });
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Dữ liệu không hợp lệ", details: parsed.error.flatten() } }, { status: 400 });
    }
    logger.aiStarted({ provider, model });
    const result = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: parsed.data.messages,
        systemInstruction: parsed.data.systemInstruction,
        temperature: parsed.data.temperature,
        maxOutputTokens: parsed.data.maxOutputTokens,
      },
    });
    logger.aiCompleted({ provider: result.provider });
    return NextResponse.json({ result });
  } catch (e: unknown) {
    logger.error({ error: e instanceof Error ? e.message : String(e) });
    if (e instanceof VoiceEngineError) {
      const status = e.code === "PROVIDER_NOT_CONFIGURED" ? 503 : e.code === "QUOTA_ERROR" ? 429 : e.code === "TIMEOUT" ? 504 : 500;
      return NextResponse.json({ error: { code: e.code, message: toUserMessage(e), provider: e.provider } }, { status });
    }
    return NextResponse.json({ error: { code: "UNKNOWN", message: toUserMessage(e) } }, { status: 500 });
  }
}
