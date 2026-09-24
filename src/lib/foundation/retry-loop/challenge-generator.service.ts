import { generateTextWithRouting } from "@/lib/ai";
import { repairChallengeSchema } from "@/lib/validation/retry-loop-schemas";
import {
  REPAIR_CHALLENGE_GENERATOR_SYSTEM,
  buildRepairChallengeUserPrompt,
} from "@/lib/ai/prompts/retry-loop-prompts";
import {
  sampleBankTask,
  saveBankTask,
  getFallbackBankTask,
} from "@/lib/foundation/services/content-bank.service";
import { resolveTopicForPrompt } from "@/lib/foundation/sentence-builder/topics";
import { z } from "zod";

export type RepairChallenge = z.infer<typeof repairChallengeSchema>;

export interface GenerateRepairChallengeParams {
  category?: string;
  topic?: string;
  provider?: string;
  model?: string;
  recentPatterns?: string[];
  userId?: string;
  forceSource?: "bank" | "ai" | "auto";
  bankRatio?: number;
}

function cleanJson(raw: string): unknown {
  if (!raw) return null;
  const withoutReasoning = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .trim();
  const withoutFence = withoutReasoning
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    const firstBrace = withoutFence.indexOf("{");
    const lastBrace = withoutFence.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = withoutFence.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        const withoutTrailingCommas = candidate.replace(/,\s*([}\]])/g, "$1");
        try {
          return JSON.parse(withoutTrailingCommas);
        } catch {}
      }
    }
    return null;
  }
}

export function getDeterministicChallenge(): RepairChallenge {
  return {
    id: `repair_mock_${Date.now()}`,
    category: "grammar",
    topic: "workplace",
    situationVi: "Bạn đang chia sẻ về lịch trình ngày hôm qua với đồng nghiệp",
    targetIntent: "Nói rằng: 'Hôm qua tôi đã đi làm muộn vì bị kẹt xe.'",
    erroneousSentence: "Yesterday I go to work late because traffic jam.",
    userErroneousText: "go to work late because traffic jam",
    whatToFix: "Thì Quá khứ đơn & Cụm giới từ 'because of'",
    explanationVi: "Động từ 'go' cần chuyển sang quá khứ 'went', và dùng 'because of' trước cụm danh từ kẹt xe.",
    betterSentence: "Yesterday, I went to work late because of a traffic jam.",
    skeletonHint: "Yesterday, I ______ to work late because of a traffic jam.",
    simplifiedSentence: "Yesterday, I went to work late.",
    conversationalTrap: {
      partnerUtterance: "Wait, did you say you go yesterday or you went to work?",
      reactionPromptVi: "Đồng nghiệp đang hỏi lại xem bạn đi làm hôm qua hay hôm nay. Hãy đính chính lại bằng tiếng Anh!",
      suggestedStarter: "Oh sorry, I meant I went...",
    },
    hints: [
      { tier: 0, title: "Không gợi ý", content: "Tự phát hiện và sửa lại ngay." },
      { tier: 1, title: "Chỉ điểm lỗi", content: "Từ 'go' chưa chia quá khứ cho 'Yesterday', và thiếu 'of' sau 'because'." },
      { tier: 2, title: "Gợi ý cấu trúc", content: "Quá khứ: S + V2 (go -> went). Nguyên nhân: because of + Noun phrase." },
      { tier: 3, title: "Khung câu", content: "Yesterday, I ______ to work late because of a traffic jam." },
      { tier: 4, title: "Câu mẫu hoàn chỉnh", content: "Yesterday, I went to work late because of a traffic jam." },
    ],
    suggestedVocabulary: [
      { term: "went to work", meaningVi: "đã đi làm", partOfSpeech: "phrase" },
      { term: "because of a traffic jam", meaningVi: "vì bị kẹt xe", partOfSpeech: "phrase" },
    ],
    source: "bank",
  };
}

export async function generateRepairChallenge(
  params: GenerateRepairChallengeParams = {}
): Promise<RepairChallenge> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  if (provider === "mock") {
    return getDeterministicChallenge();
  }

  // Resolve dynamic topic
  const effectiveTopic = resolveTopicForPrompt(params.topic);

  // 1. Content Bank: Only sampled if explicitly requested via forceSource === "bank"
  if (params.forceSource === "bank") {
    try {
      const cached = await sampleBankTask<RepairChallenge>({
        module: "retry_loop_repair",
        category: params.category || "grammar",
        userId: params.userId,
        forceSource: params.forceSource,
        bankRatio: params.bankRatio,
      });
      if (cached) {
        return { ...cached.task, source: "bank" as const };
      }
    } catch (bankErr) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[RepairChallengeGenerator] Bank lookup warning:", bankErr);
      }
    }
  }

  // 2. Real-time LLM Generation
  try {
    const userPrompt = buildRepairChallengeUserPrompt({
      ...params,
      topic: effectiveTopic,
    });

    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: REPAIR_CHALLENGE_GENERATOR_SYSTEM,
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const parsed = cleanJson(res.text);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Could not parse JSON response from AI Challenge Generator.");
    }

    const obj = parsed as Record<string, unknown>;

    // Ensure ID exists
    if (!obj.id) obj.id = `repair_${Date.now()}`;
    if (!obj.topic) obj.topic = effectiveTopic;
    obj.source = "ai";

    // Sanitize Hints
    if (!Array.isArray(obj.hints) || obj.hints.length === 0) {
      const errText = String(obj.userErroneousText || "lỗi khẩu ngữ");
      const fixText = String(obj.whatToFix || "Sửa lỗi");
      const better = String(obj.betterSentence || "");
      const skeleton = String(obj.skeletonHint || better.replace(errText, "______"));
      obj.hints = [
        { tier: 0, title: "Không gợi ý", content: "Tự phát hiện và sửa lại ngay." },
        { tier: 1, title: "Chỉ điểm lỗi", content: `Lỗi: ${errText}. Cần sửa: ${fixText}.` },
        { tier: 2, title: "Gợi ý cấu trúc", content: String(obj.explanationVi || "Sửa lỗi để câu tự nhiên hơn.") },
        { tier: 3, title: "Khung câu", content: skeleton },
        { tier: 4, title: "Câu mẫu hoàn chỉnh", content: better },
      ];
    }

    // Sanitize suggestedVocabulary
    if (!Array.isArray(obj.suggestedVocabulary)) {
      obj.suggestedVocabulary = [];
    }

    // Sanitize conversationalTrap
    if (obj.conversationalTrap && typeof obj.conversationalTrap === "object") {
      const ct = obj.conversationalTrap as Record<string, unknown>;
      obj.conversationalTrap = {
        partnerUtterance: String(ct.partnerUtterance || `Wait, did you mean "${obj.betterSentence}"?`),
        reactionPromptVi: String(ct.reactionPromptVi || "Người đối thoại đang thắc mắc ý của bạn. Hãy nói lại cho chuẩn xác!"),
        suggestedStarter: ct.suggestedStarter ? String(ct.suggestedStarter) : undefined,
      };
    } else {
      obj.conversationalTrap = {
        partnerUtterance: `Wait, did you say "${obj.erroneousSentence}"? Could you say that again?`,
        reactionPromptVi: "Người đối thoại đang hỏi lại để làm rõ ý. Hãy nói lại câu chuẩn xác!",
        suggestedStarter: "Sorry, I meant...",
      };
    }

    const validated = repairChallengeSchema.safeParse(obj);
    if (!validated.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[RepairChallengeGenerator] Schema validation error:", validated.error);
      }
      throw new Error(`AI generated invalid challenge format: ${validated.error.issues.map((i) => i.message).join(", ")}`);
    }

    const challenge = validated.data;

    // 3. Asynchronously save to Content Bank for future reuse
    saveBankTask({
      module: "retry_loop_repair",
      category: challenge.category,
      hashSourceText: challenge.targetIntent || challenge.erroneousSentence,
      payload: challenge,
      qualityScore: 9,
    }).catch((saveErr) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[RepairChallengeGenerator] Failed to save to content bank:", saveErr);
      }
    });

    return challenge;
  } catch (genErr) {
    if (params.forceSource === "ai") {
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      throw new Error(`Không thể tạo bài tập sửa lỗi từ AI: ${msg}. Vui lòng thử lại hoặc đổi AI Model / Provider.`);
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[RepairChallengeGenerator] AI generation failed, checking bank fallback:", genErr);
    }
    // 4. Emergency Fallback: Pool -> Mock
    try {
      const fallback = await getFallbackBankTask<RepairChallenge>({
        module: "retry_loop_repair",
        category: params.category || "grammar",
      });
      if (fallback) return { ...fallback, source: "bank" as const };
    } catch {}

    return getDeterministicChallenge();
  }
}
