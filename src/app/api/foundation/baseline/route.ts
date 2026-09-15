import { NextResponse } from "next/server";
import { generateBaselineTasks, evaluateBaseline } from "@/lib/foundation/services/baseline.service";
import { toUserMessage } from "@/lib/errors/codes";
import { foundationRepo } from "@/lib/db/sqlite-db";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const { action, speechBank, provider = "gemini", model = "auto", tasks } = body as {
    action?: "generate" | "evaluate";
    speechBank?: string[];
    provider?: string;
    model?: string;
    tasks?: Array<{ id: string; prompt: string; skill: string; transcript: string; durationMs?: number; timeToFirstWordMs?: number }>;
  };

  if (action === "generate" || !action) {
    try {
      const generated = await generateBaselineTasks({ speechBank, provider, model });
      return NextResponse.json({ tasks: generated });
    } catch (e: unknown) {
      return NextResponse.json({ error: { code: "BASELINE_FAILED", message: toUserMessage(e) } }, { status: 500 });
    }
  }

  if (action === "evaluate") {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Thiếu tasks" } }, { status: 400 });
    try {
      const result = await evaluateBaseline(tasks, { provider, model });
      const baseline = { id: `baseline_${Date.now()}`, createdAt: new Date().toISOString(), ...result };

      foundationRepo.saveBaseline({
        id: baseline.id,
        created_at: baseline.createdAt,
        overall: result.overall,
        level_suggestion: result.levelSuggestion,
        response_speed: result.responseSpeed,
        sentence_production: result.sentenceProduction,
        fluency: result.fluency,
        vocabulary_retrieval: result.vocabularyRetrieval,
        grammar_in_speech: result.grammarInSpeech,
        confidence: result.confidence,
        expansion_ability: result.expansionAbility,
        recovery_ability: result.recoveryAbility,
        tasks: baseline.tasks,
      });

      return NextResponse.json({ baseline });
    } catch (e: unknown) {
      return NextResponse.json({ error: { code: "BASELINE_FAILED", message: toUserMessage(e) } }, { status: 500 });
    }
  }

  return NextResponse.json({ error: { message: "Invalid action" } }, { status: 400 });
}

// GET latest baseline
export async function GET() {
  const latest = foundationRepo.getLatestBaseline();
  return NextResponse.json({ baselines: latest ? [latest] : [] });
}

