import { NextRequest, NextResponse } from "next/server";
import { generateTextWithRouting } from "@/lib/ai";
import { PROMPTS } from "@/lib/ai/prompts/shadowing-prompts";
import type { MultiDimensionalSpeechEvaluation, EvaluatedWord } from "@/types/shadowing";

function cleanWord(w: string): string {
  return w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "").trim();
}

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

function calculateDeterministicScores(
  targetText: string,
  userText: string,
  targetDurationSec: number,
  userDurationSec: number
): {
  overallScore: number;
  accuracyScore: number;
  pacingScore: number;
  connectedScore: number;
  intonationScore: number;
  pacingRatio: number;
  targetWpm: number;
  userWpm: number;
  durationGap: number;
  wordBreakdown: EvaluatedWord[];
} {
  const targetWords = targetText.split(/\s+/).filter(Boolean);
  const userWords = userText.split(/\s+/).filter(Boolean);

  let matchCount = 0;
  let userIdx = 0;
  const wordBreakdown: EvaluatedWord[] = [];

  for (let i = 0; i < targetWords.length; i++) {
    const tWord = targetWords[i];
    const cleanT = cleanWord(tWord);
    let matched = false;

    for (let j = userIdx; j < Math.min(userIdx + 3, userWords.length); j++) {
      if (cleanWord(userWords[j]) === cleanT) {
        matchCount++;
        matched = true;
        userIdx = j + 1;
        break;
      }
    }

    if (matched) {
      wordBreakdown.push({ word: tWord, status: "correct" });
    } else {
      wordBreakdown.push({
        word: tWord,
        status: "missing",
        tip: `Phát âm rõ âm tiết của "${tWord}".`,
      });
    }
  }

  const accuracyScore = Math.round((matchCount / (targetWords.length || 1)) * 100);

  // Pacing calculation
  const targetDur = Math.max(0.5, targetDurationSec);
  const userDur = Math.max(0.5, userDurationSec);
  const pacingRatio = Math.round((userDur / targetDur) * 100) / 100;
  const pacingDiff = Math.abs(pacingRatio - 1.0);
  const pacingScore = Math.max(0, Math.round(100 - Math.min(pacingDiff, 1.0) * 80));

  const targetWpm = Math.round((targetWords.length / targetDur) * 60);
  const userWpm = Math.round((userWords.length / userDur) * 60);
  const durationGap = Math.round((userDur - targetDur) * 10) / 10;

  const connectedScore = Math.min(100, Math.round(accuracyScore * 0.9 + pacingScore * 0.1));
  const intonationScore = Math.min(100, Math.round(accuracyScore * 0.85 + 15));

  const overallScore = Math.round(
    accuracyScore * 0.4 + pacingScore * 0.25 + connectedScore * 0.2 + intonationScore * 0.15
  );

  return {
    overallScore,
    accuracyScore,
    pacingScore,
    connectedScore,
    intonationScore,
    pacingRatio,
    targetWpm,
    userWpm,
    durationGap,
    wordBreakdown,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetSentence,
      targetIpa = "",
      targetDurationSec = 3.0,
      userTranscript = "",
      userDurationSec = 3.2,
      shadowingMode = "echo",
      playbackSpeed = 1.0,
      useAI = false,
      provider,
      model,
    } = body;

    if (!targetSentence) {
      return NextResponse.json({ error: "Thiếu targetSentence." }, { status: 400 });
    }

    // 1. Calculate deterministic baseline from actual user speech and timing
    const baseline = calculateDeterministicScores(
      targetSentence,
      userTranscript,
      targetDurationSec,
      userDurationSec
    );

    // 2. Call AI if requested
    if (useAI) {
      try {
        const prompt = PROMPTS.buildSpeechEvaluatorUserPrompt({
          targetSentence,
          targetIpa,
          targetDurationSec,
          userTranscript,
          userDurationSec,
          shadowingMode,
          playbackSpeed,
        });

        const aiRes = await generateTextWithRouting({
          provider: provider || "gemini",
          model: model || "auto",
          input: {
            messages: [{ role: "user", content: prompt }],
            systemInstruction: PROMPTS.SPEECH_EVALUATOR_SYSTEM,
            temperature: 0.2,
            maxOutputTokens: 1200,
          },
        });

        const parsed = cleanJson(aiRes.text) as MultiDimensionalSpeechEvaluation | null;
        if (parsed && typeof parsed.overall_score === "number") {
          return NextResponse.json({ success: true, provider: aiRes.provider, result: parsed });
        }
      } catch (aiErr) {
        return NextResponse.json(
          { error: "Lỗi đánh giá AI: " + (aiErr instanceof Error ? aiErr.message : String(aiErr)) },
          { status: 502 }
        );
      }
    }

    // 3. Return pure authentic algorithmic calculation
    const realResult: MultiDimensionalSpeechEvaluation = {
      overall_score: baseline.overallScore,
      accuracy_score: baseline.accuracyScore,
      pacing_score: baseline.pacingScore,
      connected_speech_score: baseline.connectedScore,
      intonation_score: baseline.intonationScore,
      metrics: {
        target_wpm: baseline.targetWpm,
        user_wpm: baseline.userWpm,
        duration_gap_sec: baseline.durationGap,
        pacing_ratio: baseline.pacingRatio,
        pacing_verdict:
          baseline.pacingRatio > 1.2
            ? "Tốc độ nói chậm hơn âm thanh mẫu."
            : baseline.pacingRatio < 0.8
            ? "Tốc độ nói nhanh hơn âm thanh mẫu."
            : "Tốc độ tương thích rất tốt với người bản xứ (~1.0x).",
      },
      word_breakdown: baseline.wordBreakdown,
      connected_speech_feedback: [],
      strengths: [
        baseline.accuracyScore >= 80 ? "Độ chính xác từ vựng tốt." : "Đã hoàn thành toàn bộ câu.",
        baseline.pacingScore >= 80 ? "Kiểm soát thời lượng câu nói đồng đều." : "Có nhịp điệu tương đối ổn định.",
      ],
      top_improvements:
        baseline.accuracyScore < 80
          ? [
              {
                area: "Độ chính xác từ vựng (Word Accuracy)",
                actionable_fix: "Luyện nghe lại câu mẫu ở tốc độ 0.85x và đọc theo từng từ trước khi tăng tốc độ.",
              },
            ]
          : [],
      mastery_level: baseline.overallScore >= 85 ? "mastered" : "practicing",
      practice_tip: "Thử lặp lại câu này theo chế độ Shadowing bám sát nhịp thở.",
    };

    return NextResponse.json({
      success: true,
      provider: "algorithmic-engine",
      result: realResult,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi chấm điểm: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
