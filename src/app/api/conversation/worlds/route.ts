import { NextResponse } from "next/server";
import { getAppDb } from "@/lib/db/sqlite-db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const db = getAppDb();

  if (id) {
    const world = db.prepare("SELECT * FROM conversation_worlds WHERE id = ?").get(id) as any;
    const turns = db.prepare("SELECT * FROM conversation_turns_world WHERE world_id = ? ORDER BY timestamp ASC").all(id);
    const facts = db.prepare("SELECT * FROM conversation_facts WHERE world_id = ?").all(id);
    const events = db.prepare("SELECT * FROM conversation_events WHERE world_id = ?").all(id);
    const summary = db.prepare("SELECT * FROM conversation_summaries WHERE world_id = ?").get(id) as any;
    return NextResponse.json({
      world,
      turns: turns || [],
      facts: facts || [],
      events: events || [],
      summary: summary?.summary ? JSON.parse(summary.summary) : null,
    });
  }

  // list
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
  const worlds = db.prepare("SELECT * FROM conversation_worlds ORDER BY created_at DESC LIMIT ?").all(limit);
  return NextResponse.json({ worlds: worlds || [] });
}

