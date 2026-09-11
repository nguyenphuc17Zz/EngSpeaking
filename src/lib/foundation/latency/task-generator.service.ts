// Task Generator Service for Response Latency Training (Function 4)
// Dynamic generation with Anti-Repetition and 3 Drill Modes + Baseline Test

import { generateTextWithRouting } from "@/lib/ai";
import { latencyTaskSchema } from "@/lib/validation/latency-schemas";
import { LATENCY_GENERATOR_SYSTEM, buildLatencyTaskUserPrompt } from "@/lib/ai/prompts/latency-prompts";
import type { LatencyTask, LatencyDrillMode } from "@/types/latency-training";

export interface GenerateLatencyTaskOptions {
  drillMode?: LatencyDrillMode;
  category?: string;
  targetDifficulty?: number;
  targetLatencyMs?: number;
  recentPrompts?: string[];
  provider?: string;
  model?: string;
}

// Minimal test fixture strictly for offline test runner when provider === "mock"
function getTestMockTask(options: GenerateLatencyTaskOptions): LatencyTask {
  const mode = options.drillMode || "open_response";
  const id = `lat_task_test_${Date.now()}`;
  return {
    id,
    drillMode: mode,
    promptText: "What do you usually do to relax after a long day at work?",
    promptLanguage: "en",
    targetIntent: "Talking about relaxation activities after work",
    expectedKeywords: ["usually", "relax", "music", "read"],
    sampleResponses: ["I usually listen to music or read a book to unwind."],
    targetLatencyMs: options.targetLatencyMs ?? 3000,
    difficulty: options.targetDifficulty ?? 3,
    category: "daily_conversation",
    bufferPhraseSuggestion: "That's a good question. I usually...",
    bufferChunks: [
      { phrase: "Well, to be honest...", meaningVi: "Thành thật mà nói...", category: "buying_time" },
      { phrase: "From my perspective...", meaningVi: "Theo góc nhìn của tôi...", category: "framing_opinion" },
      { phrase: "Off the top of my head...", meaningVi: "Nghĩ ngay lúc này thì...", category: "immediate_reaction" },
    ],
    staircaseTargetMs: options.targetLatencyMs ?? 3000,
    hints: [
      { tier: 0, title: "Không gợi ý", content: "Tự bật câu trả lời ngay lập tức." },
      { tier: 1, title: "Từ khoá cốt lõi", content: "usually / relax / music" },
      { tier: 2, title: "Cụm từ đệm mở đầu", content: "That's a good question. I usually..." },
      { tier: 3, title: "Khung câu", content: "That's a good question. I usually ______ to relax." },
      { tier: 4, title: "Câu mẫu hoàn chỉnh", content: "I usually listen to music or read a book to unwind." },
    ],
    isBaseline: mode === "baseline_test",
    suggestedVocabulary: [
      { term: "unwind", meaningVi: "thư giãn, xả hơi", partOfSpeech: "verb" },
    ],
  };
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

export async function generateLatencyTask(
  options: GenerateLatencyTaskOptions = {}
): Promise<LatencyTask> {
  const drillMode = options.drillMode || "open_response";
  const targetLatencyMs = options.targetLatencyMs || (drillMode === "rapid_retrieval" ? 1800 : drillMode === "timed_countdown" ? 2500 : 3000);
  const targetDifficulty = options.targetDifficulty || 3;
  const provider = options.provider || "gemini";
  const model = options.model || "auto";

  if (provider === "mock") {
    return getTestMockTask({ ...options, drillMode, targetLatencyMs, targetDifficulty });
  }

  let lastErrorMsg = "";

  const userPrompt = buildLatencyTaskUserPrompt({
    drillMode,
    category: options.category,
    targetDifficulty,
    targetLatencyMs,
    recentPrompts: options.recentPrompts,
  });

  const attemptGenerate = async (): Promise<LatencyTask | null> => {
    try {
      const res = await generateTextWithRouting({
        provider,
        model,
        input: {
          messages: [{ role: "user", content: userPrompt }],
          systemInstruction: LATENCY_GENERATOR_SYSTEM,
          temperature: 0.7,
          maxOutputTokens: 450, // Reduced to 450 for fast generation and safety against Groq TPM limits
        },
      });

      const parsed = cleanJson(res.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object") return null;

      if (!parsed.id) {
        parsed.id = `lat_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      }

      // Sanitize 4-Tier hints if missing
      if (!Array.isArray(parsed.hints) || parsed.hints.length === 0) {
        const kws = Array.isArray(parsed.expectedKeywords) ? (parsed.expectedKeywords as string[]).join(" / ") : "";
        const buffer = String(parsed.bufferPhraseSuggestion || "Well, to be honest...");
        const sample = Array.isArray(parsed.sampleResponses) && parsed.sampleResponses[0] ? String(parsed.sampleResponses[0]) : "Sample answer...";
        parsed.hints = [
          { tier: 0, title: "Không gợi ý", content: "Tự bật câu trả lời ngay." },
          { tier: 1, title: "Từ khoá cốt lõi", content: kws || "Trả lời trực tiếp vào ý chính" },
          { tier: 2, title: "Cụm từ đệm mở đầu", content: buffer },
          { tier: 3, title: "Khung câu", content: `${buffer} I ______ .` },
          { tier: 4, title: "Câu mẫu hoàn chỉnh", content: sample },
        ];
      }

      // Clean prefixes from hints
      if (Array.isArray(parsed.hints)) {
        parsed.hints = (parsed.hints as any[]).map((h) => ({
          ...h,
          content: String(h?.content || "")
            .replace(/^(câu mẫu hoàn chỉnh|câu trả lời mẫu|câu mẫu|sample response|model answer):\s*/i, "")
            .trim(),
        }));
      }

      if (Array.isArray(parsed.sampleResponses)) {
        parsed.sampleResponses = (parsed.sampleResponses as any[]).map((s) =>
          String(s || "")
            .replace(/^(câu mẫu hoàn chỉnh|câu trả lời mẫu|câu mẫu|sample response|model answer):\s*/i, "")
            .trim()
        );
      }

      if (!Array.isArray(parsed.suggestedVocabulary)) {
        parsed.suggestedVocabulary = [];
      }

      if (!Array.isArray(parsed.bufferChunks) || parsed.bufferChunks.length === 0) {
        parsed.bufferChunks = [
          { phrase: "Well, to be honest...", meaningVi: "Thành thật mà nói...", category: "buying_time" },
          { phrase: "From my perspective...", meaningVi: "Theo góc nhìn của tôi...", category: "framing_opinion" },
          { phrase: "Off the top of my head...", meaningVi: "Nghĩ ngay lúc này thì...", category: "immediate_reaction" },
        ];
      }

      if (typeof parsed.staircaseTargetMs !== "number") {
        parsed.staircaseTargetMs = Number(parsed.targetLatencyMs || targetLatencyMs);
      }

      const validated = latencyTaskSchema.safeParse(parsed);
      if (!validated.success) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[LatencyTaskGenerator] Schema error:", validated.error);
        }
        return null;
      }
      return validated.data as LatencyTask;
    } catch (err) {
      const errStr = err instanceof Error ? err.message : String(err);
      lastErrorMsg = errStr;
      if (errStr.includes("429") || errStr.includes("rate_limit") || errStr.includes("TPM")) {
        console.warn("[LatencyTaskGenerator] Groq rate limit (429 TPM) hit:", errStr);
      } else if (process.env.NODE_ENV !== "production") {
        console.warn("[LatencyTaskGenerator] API failed:", err);
      }
      return null;
    }
  };

  let task = await attemptGenerate();
  if (!task) task = await attemptGenerate();

  // Never fall back silently to mock data; throw error directly
  if (!task) {
    throw new Error(
      `Không thể tạo bài tập Response Latency từ AI: ${lastErrorMsg || "AI không phản hồi hoặc phản hồi không hợp lệ"}. Vui lòng thử lại hoặc đổi AI Model / Provider.`
    );
  }

  return task;
}
