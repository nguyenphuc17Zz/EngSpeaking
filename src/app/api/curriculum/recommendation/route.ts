import { NextResponse } from "next/server";
import { getNextBestAction } from "@/lib/curriculum/decision-engine";
import type { LearnerState } from "@/types/learner";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { learnerState, provider = "gemini", model = "auto" } = body as { learnerState?: LearnerState; provider?: string; model?: string };
  if (!learnerState) return NextResponse.json({ error: { message: "Thiếu learnerState" } }, { status: 400 });
  const action = await getNextBestAction(learnerState as LearnerState, undefined, { provider, model });
  return NextResponse.json({ action });
}
