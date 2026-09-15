import { NextResponse } from "next/server";
import { progressRepo } from "@/lib/db/sqlite-db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skillId = url.searchParams.get("skillId") || url.searchParams.get("skill");
  const range = url.searchParams.get("range") || "30d";
  const since = rangeToSince(range);

  const history = skillId ? progressRepo.getSkillHistory("default_learner", skillId, since, 100) : [];
  return NextResponse.json({ history });
}

function rangeToSince(range: string): Date {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (range === "90d") return new Date(now.getTime() - 90 * 86400000);
  if (range === "all") return new Date(0);
  return new Date(now.getTime() - 30 * 86400000);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    progressRepo.recordSkillHistory({
      learner_state_id: body.learnerId || "default_learner",
      skill_id: body.skillId,
      mastery: body.mastery,
      confidence: body.confidence,
      retention_risk: body.retentionRisk ?? null,
      trend: body.trend ?? null,
      practice_count: body.practiceCount || 1,
      source_session_id: body.sourceSessionId,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to record skill history" }, { status: 400 });
  }
}

