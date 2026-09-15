import { NextResponse } from "next/server";
import { foundationRepo } from "@/lib/db/sqlite-db";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const { exerciseId, mode = "practice", skill, difficulty, exerciseType } = body as {
    exerciseId?: string;
    mode?: string;
    skill?: string;
    difficulty?: number;
    exerciseType?: string;
  };
  const id = `fsess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const session = foundationRepo.createSession({
    id,
    exercise_id: exerciseId || "unknown",
    mode,
    skill: skill || "sentence_retrieval",
    difficulty: difficulty ?? 5,
    exercise_type: exerciseType || "one_sentence",
    started_at: new Date().toISOString(),
    completed_at: null,
    status: "active",
  });
  return NextResponse.json({ session });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);
  const sessions = foundationRepo.listSessions(limit);
  return NextResponse.json({ sessions });
}

