import { NextResponse } from "next/server";
import { generateInfiniteScenario } from "@/lib/ai";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      provider = "gemini",
      model = "auto",
      topic,
      category,
      level,
    } = body as {
      provider?: string;
      model?: string;
      topic?: string;
      category?: string;
      level?: string;
    };

    const scenario = await generateInfiniteScenario({
      provider,
      model,
      topic,
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
