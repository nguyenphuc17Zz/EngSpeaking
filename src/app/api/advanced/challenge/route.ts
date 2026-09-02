import { NextResponse } from "next/server";
import { triggerChallenge } from "@/lib/advanced/challenge-engine";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { context, provider = "gemini", model = "auto" } = body as { context?: unknown; provider?: string; model?: string };
  const challenge = await triggerChallenge(context || {}, provider, model);
  return NextResponse.json({ challenge });
}
