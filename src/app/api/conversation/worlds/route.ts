import { NextResponse } from "next/server";
import { getAppDb } from "@/lib/db/sqlite-db";

function safeJsonParse<T = unknown>(val: unknown, fallback: T | null = null): T | null {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeWorldRow(w: Record<string, unknown> | null | undefined) {
  if (!w) return null;
  return {
    ...w,
    scenario_blueprint: safeJsonParse(w.scenario_blueprint, {}),
    settings: safeJsonParse(w.settings, {}),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const db = getAppDb();

  if (id) {
    const worldRow = db.prepare("SELECT * FROM conversation_worlds WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    const turnsRows = (db.prepare("SELECT * FROM conversation_turns_world WHERE world_id = ? ORDER BY timestamp ASC").all(id) || []) as Array<Record<string, unknown>>;
    const facts = db.prepare("SELECT * FROM conversation_facts WHERE world_id = ?").all(id);
    const events = db.prepare("SELECT * FROM conversation_events WHERE world_id = ?").all(id);
    const summary = db.prepare("SELECT * FROM conversation_summaries WHERE world_id = ?").get(id) as Record<string, unknown> | undefined;
    return NextResponse.json({
      world: normalizeWorldRow(worldRow),
      turns: turnsRows.map((t) => ({
        ...t,
        pedagogy: t.pedagogy ? safeJsonParse(t.pedagogy, undefined) : undefined,
      })),
      facts: facts || [],
      events: events || [],
      summary: summary?.summary ? safeJsonParse(summary.summary, null) : null,
    });
  }

  // list
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
  const worlds = (db.prepare("SELECT * FROM conversation_worlds ORDER BY created_at DESC LIMIT ?").all(limit) || []) as Array<Record<string, unknown>>;
  return NextResponse.json({ worlds: worlds.map((w) => normalizeWorldRow(w)) });
}

