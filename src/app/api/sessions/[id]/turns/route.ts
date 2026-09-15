import { NextResponse } from "next/server";
import { sessionRepo } from "@/lib/db/sqlite-db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { role, text, timestamp, durationMs } = body as { role?: string; text?: string; timestamp?: string; durationMs?: number };

  if (!role || !text) return NextResponse.json({ error: { message: "Thiếu role/text" } }, { status: 400 });

  const turn = sessionRepo.addTurn({
    id: crypto.randomUUID(),
    session_id: sessionId,
    role,
    text,
    timestamp: timestamp || new Date().toISOString(),
    duration_ms: durationMs ?? null,
  });

  return NextResponse.json({ turn });
}

