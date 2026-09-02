import { NextResponse } from "next/server";
import { hintRequestSchema } from "@/lib/validation/foundation-schemas";
import { getHint } from "@/lib/foundation/services/hint.service";
import { toUserMessage } from "@/lib/errors/codes";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "JSON không hợp lệ" } }, { status: 400 }); }
  const parsed = hintRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", details: parsed.error.flatten() } }, { status: 400 });
  const raw = parsed.data as typeof parsed.data & { provider?: string; model?: string };
  const provider = (raw.provider as string) || "gemini";
  const model = (raw.model as string) || "auto";
  const { exercise, transcript, hintLevel, attemptsCount } = raw;
  try {
    const hint = await getHint(exercise as import("@/types/foundation").FoundationExercise, { transcript, hintLevel, attemptsCount, provider, model });
    return NextResponse.json({ hint });
  } catch (e: unknown) {
    return NextResponse.json({ error: { code: "HINT_FAILED", message: toUserMessage(e) } }, { status: 500 });
  }
}
