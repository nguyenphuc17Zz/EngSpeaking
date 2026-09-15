import { NextResponse } from "next/server";
import { buildAdvancedSession } from "@/lib/advanced/session-builder";
import { validateAdvancedSession } from "@/lib/advanced/validation";
import { getAppDb } from "@/lib/db/sqlite-db";
import { advancedTrainingContextSchema } from "@/lib/validation/advanced-schemas";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const raw = body as Record<string, unknown> & { context?: unknown; provider?: string; model?: string };
  // Backward-compat: legacy hub sent flat {mode, durationMinutes, pressureLevel, customPrompt};
  // new Studio sends {context:{track, level, ...}}. Normalize both to context.
  let contextInput: unknown = raw.context;
  if (!contextInput) {
    const { legacyModuleToTrackLevel } = await import("@/lib/advanced/track-map");
    const mode = typeof raw.mode === "string" ? raw.mode : undefined;
    const mapped = mode ? legacyModuleToTrackLevel(mode) : undefined;
    contextInput = {
      targetSkills: mode ? [mode] : [],
      goal: mode,
      durationMinutes: typeof raw.durationMinutes === "number" ? raw.durationMinutes : 10,
      pressureLevel: typeof raw.pressureLevel === "string" ? raw.pressureLevel : "challenging",
      topic: typeof raw.customPrompt === "string" && raw.customPrompt ? raw.customPrompt : "auto",
      scenario: typeof raw.customPrompt === "string" ? raw.customPrompt : undefined,
      track: (raw.track as string) || mapped?.track,
      level: (raw.level as string) || mapped?.level,
    };
  }
  const provider = raw.provider || "gemini";
  const model = raw.model || "auto";
  const parsed = advancedTrainingContextSchema.safeParse(contextInput);
  if (!parsed.success) return NextResponse.json({ error: { message: "Invalid context", details: parsed.error.flatten() } }, { status: 400 });
  const session = await buildAdvancedSession(parsed.data, { provider, model });
  const validation = validateAdvancedSession(session);
  if (!validation.valid) return NextResponse.json({ error: { message: "Invalid session", details: validation.errors }, session }, { status: 422 });

  // Persist to SQLite (mode encodes track_level for analytics, no schema migration needed)
  try {
    const db = getAppDb();
    const ctx = session.context as unknown as Record<string, unknown>;
    const track = typeof ctx.track === "string" ? ctx.track : null;
    const level = typeof ctx.level === "string" ? ctx.level : null;
    const modeLabel = track && level ? `advanced:${track}:${level}` : session.modules[0] || "advanced";
    db.prepare(`
      INSERT INTO advanced_training_sessions (id, learner_state_id, mode, primary_skill, secondary_skills, estimated_duration, difficulty, pressure, topic, scenario, plan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      "default_learner",
      modeLabel,
      session.blocks[0]?.skillTargets?.[0] || null,
      JSON.stringify(session.blocks.slice(1).flatMap((b) => b.skillTargets).slice(0, 5)),
      session.estimatedDurationMinutes,
      JSON.stringify(session.context.difficulty || {}),
      session.context.pressureLevel || null,
      session.context.topic || null,
      session.context.scenario ? JSON.stringify({ scenario: session.context.scenario }) : null,
      JSON.stringify(session),
      new Date().toISOString()
    );
  } catch {}

  return NextResponse.json({ session, sessionId: session.id, rationale: session.rationale });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const db = getAppDb();

  if (id) {
    const row = db.prepare("SELECT * FROM advanced_training_sessions WHERE id = ?").get(id) as any;
    if (row?.plan) {
      try { return NextResponse.json({ session: JSON.parse(row.plan) }); } catch {}
    }
  }

  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
  const rows = db.prepare("SELECT id, primary_skill, estimated_duration, created_at FROM advanced_training_sessions ORDER BY created_at DESC LIMIT ?").all(limit);
  return NextResponse.json({ sessions: rows || [] });
}

