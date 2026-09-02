import { NextResponse } from "next/server";
import { replanSession } from "@/lib/curriculum/decision-engine";
import { validateLearningPlan } from "@/lib/curriculum/validation";
import type { LearnerState, LearningSessionPlan } from "@/types/learner";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { currentPlan, livePerformance, remainingTime, learnerState } = body as {
    currentPlan?: LearningSessionPlan;
    livePerformance?: { completedBlocks: Array<{ blockId: string; performance: number }>; remainingTime: number };
    remainingTime?: number;
    learnerState?: LearnerState;
  };
  if (!currentPlan || !livePerformance || !learnerState) return NextResponse.json({ error: { message: "Thiếu currentPlan/livePerformance/learnerState" } }, { status: 400 });
  const updated = await replanSession(currentPlan as LearningSessionPlan, livePerformance as { completedBlocks: Array<{ blockId: string; performance: number }>; remainingTime: number }, learnerState as LearnerState);
  const validation = validateLearningPlan(updated);
  if (!validation.valid) return NextResponse.json({ error: { message: "Replanned invalid", details: validation.errors } }, { status: 422 });
  return NextResponse.json({ plan: updated });
}
