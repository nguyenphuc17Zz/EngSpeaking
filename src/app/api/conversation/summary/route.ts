import { NextResponse } from "next/server";
import { summarizeConversation } from "@/lib/conversation/engines/summarizer";
import { getAppDb } from "@/lib/db/sqlite-db";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { worldId, olderTurns, existingSummaryJson, provider = "gemini", model = "auto" } = body as {
    worldId?: string;
    olderTurns?: Array<{ role: string; text: string }>;
    existingSummaryJson?: string;
    provider?: string;
    model?: string;
  };
  if (!olderTurns) return NextResponse.json({ error: { message: "Thiếu olderTurns" } }, { status: 400 });
  const summary = await summarizeConversation(olderTurns, { existingSummaryJson, provider, model });
  if (worldId) {
    try {
      const db = getAppDb();
      db.prepare(`
        INSERT OR REPLACE INTO conversation_summaries (world_id, summary, updated_at)
        VALUES (?, ?, ?)
      `).run(worldId, JSON.stringify(summary), new Date().toISOString());
    } catch {}
  }
  return NextResponse.json({ summary });
}

