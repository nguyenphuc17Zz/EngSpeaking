import { NextResponse } from "next/server";
import { generateInfiniteScenario } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = checkRateLimit(`scenario:${ip}`, 30, 60000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { message: "Quá nhiều yêu cầu tạo kịch bản. Vui lòng thử lại sau ít giây." } },
      { status: 429, headers: rateLimitResponse(rl.remaining, rl.resetMs) }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "JSON không hợp lệ" } }, { status: 400 });
  }

  try {
    const {
      provider = "gemini",
      model = "auto",
      topic,
      category,
      level,
    } = (body || {}) as {
      provider?: string;
      model?: string;
      topic?: string;
      category?: string;
      level?: string;
    };

    if (topic && typeof topic === "string" && topic.length > 500) {
      return NextResponse.json(
        { error: { message: "Chủ đề tối đa 500 ký tự" } },
        { status: 400 }
      );
    }

    const scenario = await generateInfiniteScenario({
      provider,
      model,
      topic: typeof topic === "string" ? topic.trim() : undefined,
      category,
      level,
    });

    logger.aiCompleted({ provider, model });
    return NextResponse.json({ scenario });
  } catch (err: unknown) {
    logger.error({ error: String(err) });
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : String(err) } },
      { status: 500 }
    );
  }
}
