import { NextResponse } from "next/server";
import { loadLearnerState } from "@/lib/curriculum/learner-state-service";
import { buildLearningSession } from "@/lib/curriculum/decision-engine";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const duration = parseInt(url.searchParams.get("duration") || "10", 10);
  const provider = url.searchParams.get("provider") || "gemini";
  const model = url.searchParams.get("model") || "auto";
  // Load state (server fallback default, client will re-save after)
  const state = loadLearnerState(); // on server this returns default; client will POST its state later
  const plan = await buildLearningSession(state, duration, undefined, { provider, model });
  return NextResponse.json({ plan });
}
