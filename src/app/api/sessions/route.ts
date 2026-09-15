import { NextResponse } from "next/server";
import { sessionRepo } from "@/lib/db/sqlite-db";
import { logger } from "@/lib/logger";

// POST /api/sessions — create session
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const { provider, model, sttProvider, sttModel, ttsProvider, ttsModel } = (body as Record<string, string>) || {};

  const id = crypto.randomUUID();
  const session = sessionRepo.create({
    id,
    started_at: new Date().toISOString(),
    ended_at: null,
    status: "active",
    provider: provider || null,
    model: model || null,
    stt_provider: sttProvider || null,
    stt_model: sttModel || null,
    tts_provider: ttsProvider || null,
    tts_model: ttsModel || null,
  });

  logger.sessionStarted({ id });
  return NextResponse.json({ session });
}

// GET /api/sessions — list recent
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);
  const sessions = sessionRepo.list(limit);
  return NextResponse.json({ sessions });
}

