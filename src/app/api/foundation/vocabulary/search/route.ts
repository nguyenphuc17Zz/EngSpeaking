import { NextRequest, NextResponse } from "next/server";
import {
  searchSpokenDictionary,
  generateDynamicRandomWord,
} from "@/lib/foundation/vocabulary/vocabulary.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const isRandom = searchParams.get("random") === "true";
  const cefr = searchParams.get("cefr") || undefined;

  try {
    if (isRandom || !q) {
      const wordItem = await generateDynamicRandomWord({ cefrLevel: cefr });
      return NextResponse.json({ success: true, wordItem });
    }

    const wordItem = await searchSpokenDictionary(q);
    return NextResponse.json({ success: true, wordItem });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { word, isRandom, cefrLevel, forceAI, bypassCache, provider, model, currentWordId } = body;

    if (isRandom) {
      const wordItem = await generateDynamicRandomWord({ cefrLevel, forceAI, provider, model, currentWordId });
      return NextResponse.json({ success: true, wordItem });
    }

    if (!word) {
      return NextResponse.json({ success: false, error: "Missing word" }, { status: 400 });
    }

    const wordItem = await searchSpokenDictionary(word, { forceAI, bypassCache, provider, model });
    return NextResponse.json({ success: true, wordItem });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
