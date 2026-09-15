import { NextResponse } from "next/server";
import { foundationRepo } from "@/lib/db/sqlite-db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { exerciseId, transcript, rawTranscript, durationMs, timeToFirstWordMs, hintsUsed, hintLevel, scoreOverall, completed } = body as {
    exerciseId?: string;
    transcript?: string;
    rawTranscript?: string;
    durationMs?: number;
    timeToFirstWordMs?: number;
    hintsUsed?: number;
    hintLevel?: number;
    scoreOverall?: number;
    completed?: boolean;
  };
  if (!transcript) return NextResponse.json({ error: { message: "Thiếu transcript" } }, { status: 400 });

  const attempt = foundationRepo.recordAttempt({
    id: `fatt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    session_id: sessionId,
    exercise_id: exerciseId || "unknown",
    transcript,
    raw_transcript: rawTranscript || transcript,
    duration_ms: durationMs ?? null,
    time_to_first_word_ms: timeToFirstWordMs ?? null,
    hints_used: hintsUsed ?? 0,
    hint_level: hintLevel ?? 0,
    score_overall: scoreOverall ?? null,
    completed: completed ?? true,
  });

  return NextResponse.json({ attempt });
}

