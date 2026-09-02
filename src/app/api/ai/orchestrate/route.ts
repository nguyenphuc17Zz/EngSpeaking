import { NextResponse } from "next/server";
import { aiOrchestrator } from "@/lib/orchestrator/orchestrator";
import type { AITask } from "@/lib/orchestrator/task-registry";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { task, input, mode = "auto", providerId, modelId, priority, responseSchema } = body as {
    task?: AITask;
    input?: unknown;
    mode?: "auto" | "manual";
    providerId?: string;
    modelId?: string;
    priority?: "low" | "normal" | "high";
    responseSchema?: unknown;
  };
  if (!task) return NextResponse.json({ error: { message: "Thiếu task" } }, { status: 400 });
  try {
    const res = await aiOrchestrator.execute({ task, input, mode, providerId, modelId, priority, responseSchema });
    return NextResponse.json(res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = (e as { code?: string })?.code || "UNKNOWN";
    return NextResponse.json({ error: { message: msg, code } }, { status: code === "PROVIDER_NOT_CONFIGURED" ? 503 : code === "MODEL_NOT_SUPPORTED" ? 400 : 500 });
  }
}
