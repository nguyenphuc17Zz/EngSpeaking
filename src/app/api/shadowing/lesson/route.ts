import { NextRequest, NextResponse } from "next/server";
import { generateTextWithRouting } from "@/lib/ai";
import { PROMPTS } from "@/lib/ai/prompts/shadowing-prompts";
import type { DynamicShadowingLesson, YouTubeTranscriptSegment } from "@/types/shadowing";

import { cleanAiJson } from "@/lib/foundation/shared/json-parser";

function cleanJson(text: string): unknown {
  const cleaned = cleanAiJson(text);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

const DEFAULT_STAGES = [
  { stage_number: 1, stage_name: "Warm-up (Khởi động phát âm)", description: "Luyện các câu ngắn, rõ ràng để làm nóng cơ miệng.", recommended_speed: 0.85, recommended_mode: "echo" as const, focus_goal: "Đọc tròn vành rõ chữ từng âm tiết." },
  { stage_number: 2, stage_name: "Rhythm & Linking (Nối âm & Nhịp điệu)", description: "Luyện nối âm phụ âm sang nguyên âm và nhịp thở Thought Groups.", recommended_speed: 1.0, recommended_mode: "echo" as const, focus_goal: "Bắt kịp hiện tượng nối âm lướt nhẹ." },
  { stage_number: 3, stage_name: "Vocabulary in Action (Từ vựng & Phrasal Verbs)", description: "Áp dụng từ vựng trọng tâm vào câu ngữ cảnh.", recommended_speed: 1.0, recommended_mode: "shadow" as const, focus_goal: "Nhấn đúng trọng âm từ mới." },
  { stage_number: 4, stage_name: "Speed Challenge (Thử thách tốc độ)", description: "Đẩy tốc độ lên 1.25x để kích hoạt phản xạ cơ miệng nhanh.", recommended_speed: 1.25, recommended_mode: "shadow" as const, focus_goal: "Bám sát tốc độ người bản xứ." },
  { stage_number: 5, stage_name: "Final Mastery (Chinh phục thuần thục)", description: "Blind Shadowing không nhìn chữ và chấm điểm toàn diện.", recommended_speed: 1.0, recommended_mode: "blind" as const, focus_goal: "Đạt trên 85% điểm tổng thể 4 chiều." },
];

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
        maxOutputTokens: 700,
      },
    });

    const parsed = cleanJson(aiRes.text) as DynamicShadowingLesson | null;
    if (!parsed || !parsed.stages || !Array.isArray(parsed.stages)) {
      return NextResponse.json(
        { error: "AI không thể sinh kế hoạch bài học hợp lệ cho video này. Vui lòng thử lại." },
        { status: 502 }
      );
    }

    const fallbackIds = segList.slice(0, 3).map((s) => s.segment_id);
    parsed.lesson_title = parsed.lesson_title || `5-Chặng Luyện Shadowing: ${videoTitle}`;
    parsed.total_duration_minutes = parsed.total_duration_minutes || 12;
    parsed.stages = DEFAULT_STAGES.map((def, idx) => {
      const s = parsed.stages[idx] || ({} as any);
      return {
        stage_number: idx + 1,
        stage_name: s.stage_name || def.stage_name,
        description: s.description || def.description,
        recommended_speed: typeof s.recommended_speed === "number" ? s.recommended_speed : def.recommended_speed,
        recommended_mode: s.recommended_mode || def.recommended_mode,
        target_segment_ids: Array.isArray(s.target_segment_ids) && s.target_segment_ids.length > 0 ? s.target_segment_ids : fallbackIds,
        focus_goal: s.focus_goal || def.focus_goal,
      };
    });

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
