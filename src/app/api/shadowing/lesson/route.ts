import { NextRequest, NextResponse } from "next/server";
import { generateTextWithRouting } from "@/lib/ai";
import { PROMPTS } from "@/lib/ai/prompts/shadowing-prompts";
import type { DynamicShadowingLesson, YouTubeTranscriptSegment } from "@/types/shadowing";

function cleanJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    const m = withoutFence.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      videoTitle = "English Shadowing",
      segments = [],
      learnerCefr = "B2",
      provider,
      model,
    } = body;

    const segList = segments as YouTubeTranscriptSegment[];
    if (segList.length === 0) {
      return NextResponse.json(
        { error: "Cần ít nhất một đoạn transcript để tạo giáo trình luyện tập." },
        { status: 400 }
      );
    }

    const prompt = PROMPTS.buildLessonGeneratorUserPrompt(videoTitle, segList, learnerCefr);

    const aiRes = await generateTextWithRouting({
      provider: provider || "gemini",
      model: model || "auto",
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: PROMPTS.LESSON_GENERATOR_SYSTEM,
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    });

    const parsed = cleanJson(aiRes.text) as DynamicShadowingLesson | null;
    if (!parsed || !parsed.stages || !Array.isArray(parsed.stages)) {
      return NextResponse.json(
        { error: "AI không thể sinh kế hoạch bài học hợp lệ cho video này. Vui lòng thử lại." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: aiRes.provider,
      model: aiRes.model,
      result: parsed,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi tạo bài học: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
