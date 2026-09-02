import { NextResponse } from "next/server";
import { selectModel } from "@/lib/orchestrator/router";
import type { AITask } from "@/lib/orchestrator/task-registry";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { task, providerId, modelId, mode = "auto" } = body as { task?: AITask; providerId?: string; modelId?: string; mode?: "auto" | "manual" };
  if (!task) return NextResponse.json({ error: { message: "Thiếu task" } }, { status: 400 });
  try {
    const decision = selectModel(task, { providerId, modelId, mode });
    return NextResponse.json({ decision });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = (e as { code?: string })?.code || "UNKNOWN";
    return NextResponse.json({ error: { message: msg, code } }, { status: 400 });
  }
}
