import { NextResponse } from "next/server";
import { getAppDb } from "@/lib/db/sqlite-db";
import { createDefaultLearnerState } from "@/lib/curriculum/learner-state-service";

export async function GET() {
  const db = getAppDb();
  const row = db.prepare("SELECT * FROM learner_states WHERE id = ?").get("default_learner") as any | undefined;
  if (!row) return NextResponse.json({ state: createDefaultLearnerState(), source: "default" });

  try {
    const state = {
      speakingProfile: JSON.parse(row.speaking_profile),
      skills: JSON.parse(row.skills),
      weaknesses: [],
      strengths: [],
      goals: JSON.parse(row.goals || "[]"),
      recentPerformance: {},
      practiceHistory: { totalSessions: 0, lastSessions: [] },
      preferences: JSON.parse(row.preferences || "{}"),
      curriculumState: JSON.parse(row.curriculum_state || "{}"),
      version: row.version,
      updatedAt: row.updated_at,
    };
    return NextResponse.json({ state });
  } catch {
    return NextResponse.json({ state: createDefaultLearnerState() });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { state } = body as { state?: unknown };
  if (!state) return NextResponse.json({ error: { message: "Thiếu state" } }, { status: 400 });

  const s = state as import("@/types/learner").LearnerState;
  try {
    const db = getAppDb();
    db.prepare(`
      INSERT OR REPLACE INTO learner_states (id, profile, skills, goals, preferences, curriculum_state, speaking_profile, version, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "default_learner",
      JSON.stringify(s.speakingProfile),
      JSON.stringify(s.skills),
      JSON.stringify(s.goals || []),
      JSON.stringify(s.preferences || {}),
      JSON.stringify(s.curriculumState || {}),
      JSON.stringify(s.speakingProfile),
      s.version ?? 1,
      new Date().toISOString(),
      new Date().toISOString()
    );
  } catch {}

  return NextResponse.json({ ok: true });
}

