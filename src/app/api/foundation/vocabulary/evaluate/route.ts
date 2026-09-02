import { NextRequest, NextResponse } from "next/server";
import {
  evaluateWordPronunciation,
  evaluateSentenceContext,
} from "@/lib/foundation/vocabulary/vocabulary-evaluator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      step = 1, // 1: word pronunciation, 2: sentence context
      wordItem,
      sentenceItem,
      userTranscript = "",
      provider,
      model,
    } = body;

    if (!wordItem) {
      return NextResponse.json({ success: false, error: "Missing wordItem" }, { status: 400 });
    }

    if (step === 1) {
      const evaluation = await evaluateWordPronunciation({
        wordItem,
        userTranscript,
        provider,
        model,
      });
      return NextResponse.json({ success: true, step: 1, evaluation });
    } else {
      if (!sentenceItem) {
        return NextResponse.json({ success: false, error: "Missing sentenceItem" }, { status: 400 });
      }
      const evaluation = await evaluateSentenceContext({
        wordItem,
        sentenceItem,
        userTranscript,
        provider,
        model,
      });
      return NextResponse.json({ success: true, step: 2, evaluation });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to evaluate vocabulary attempt",
      },
      { status: 500 }
    );
  }
}
