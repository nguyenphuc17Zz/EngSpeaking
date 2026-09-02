import { NextRequest, NextResponse } from "next/server";
import { generateTextWithRouting } from "@/lib/ai";
import { PROMPTS } from "@/lib/ai/prompts/shadowing-prompts";
import type { AudioVideoProfile, NuancedTranslation, YouTubeTranscriptSegment } from "@/types/shadowing";

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
      title = "English Speaking Practice",
      speaker = "Native Speaker",
      segments = [],
      targetSentence,
      context,
      type = "profile",
      provider,
      model,
    } = body;

    // 1. Translation Mode (PROMPT 3)
    if (type === "translate") {
      if (!targetSentence) {
        return NextResponse.json({ error: "Thiếu câu cần dịch (targetSentence)." }, { status: 400 });
      }

      const prompt = PROMPTS.buildTranslatorUserPrompt(targetSentence, context);
      const aiRes = await generateTextWithRouting({
        provider: provider || "gemini",
        model: model || "auto",
        input: {
          messages: [{ role: "user", content: prompt }],
          systemInstruction: PROMPTS.TRANSLATOR_SYSTEM,
          temperature: 0.2,
          maxOutputTokens: 600,
        },
      });

      const parsed = cleanJson(aiRes.text) as NuancedTranslation | null;
      if (!parsed || !parsed.translated_text) {
        return NextResponse.json({ error: "AI không thể hoàn tất bản dịch ngữ cảnh lúc này." }, { status: 502 });
      }

      return NextResponse.json({ success: true, provider: aiRes.provider, result: parsed });
    }

    // 2. Video Profiler Mode (PROMPT 2)
    const segList = segments as YouTubeTranscriptSegment[];
    if (segList.length === 0) {
      return NextResponse.json({ error: "Cần transcript để phân tích profile video." }, { status: 400 });
    }

    const totalWords = segList.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0);
    const totalDurationSec = segList.reduce((acc, s) => Math.max(acc, s.end_time), 0) || 60;
    const avgWpm = Math.round((totalWords / totalDurationSec) * 60) || 140;
    const sampleText = segList.slice(0, 4).map((s) => `[${s.start_time}s - ${s.end_time}s]: "${s.text}"`).join("\n");

    const prompt = PROMPTS.buildProfilerUserPrompt(title, speaker, avgWpm, sampleText);

    const aiRes = await generateTextWithRouting({
      provider: provider || "gemini",
      model: model || "auto",
      input: {
        messages: [{ role: "user", content: prompt }],
        systemInstruction: PROMPTS.PROFILER_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 1000,
      },
    });

    const parsed = cleanJson(aiRes.text) as AudioVideoProfile | null;
    if (!parsed || !parsed.speaking_style) {
      return NextResponse.json({ error: "AI không thể trích xuất profile video hợp lệ." }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      provider: aiRes.provider,
      result: parsed,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi profile AI: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
