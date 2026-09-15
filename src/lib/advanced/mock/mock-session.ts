// Mock session generator — deterministic, no AI
import type { AdvancedTrainingContext, AdvancedTrainingSession, AdvancedTrainingBlock, AdvancedChallenge, AdvancedTrainingType, ToulminElement } from "@/types/advanced";

const INSTRUCTIONS: Record<string, string> = {
  rapidResponse: "Trả lời ngay lập tức — không chuẩn bị dài. 3s rồi nói.",
  pressureConversation: "Tiếp tục nói khi AI tăng áp lực (follow-up nhanh, đổi yêu cầu).",
  topicSwitching: "AI sẽ đổi chủ đề — thích ứng không đứng hình.",
  unexpectedQuestion: "Câu hỏi bất ngờ — trả lời tự phát, không chuẩn bị.",
  deepFollowup: "AI sẽ hỏi sâu dần: What→Why→Example→Opposite→Change?",
  opinion: "Đưa ý kiến → lý do → ví dụ → phản biện → kết luận.",
  debate: "Tranh biện — AI sẽ phản biện, bạn bảo vệ lập trường.",
  persuasion: "Thuyết phục nhân vật với mục tiêu và ràng buộc cho trước.",
  negotiation: "Đàm phán — AI không tự đồng ý, có trade-offs.",
  storytelling: "Kể chuyện: setup→sequence→problem→resolution, AI sẽ ngắt 'What happened next?'",
  longForm: "Nói liên tục — giữ mạch, không ngắt.",
  presentation: "Thuyết trình → Q&A khán giả.",
  qaChallenge: "Khán giả hỏi khó — trả lời tự phát.",
  interview: "Phỏng vấn — follow-up phụ thuộc câu trả lời.",
  professional: "Giao tiếp công việc: update, clarify, feedback, disagree lịch sự.",
  clarification: "AI tạo tình huống mơ hồ — bạn phải hỏi làm rõ.",
  resilience: "Tiếp tục sau hiểu lầm/câu hỏi khó/từ lạ.",
  ambiguity: "Thông tin mơ hồ — hỏi 'What do you mean?'",
  escalation: "Tình huống leo thang: request → rejected → alternative → time pressure.",
  reformulation: "Nói → nhận bản tự nhiên hơn → lặp lại → biến đổi → tái dùng.",
  spontaneous: "Chủ đề xuất hiện → 3s → nói ngay.",
  abstract: "Thảo luận trừu tượng (technology/society) — điều chỉnh theo skill.",
  roleReversal: "Đổi vai: bạn là người hỏi, AI là ứng viên.",
  devilsAdvocate: "AI phản biện quan điểm của bạn bằng phản biện hợp lý.",
  highPressure: "Áp lực cao: unfamiliar topic + high pressure + rapid + disagreement + limited support.",
};

export function generateMockSession(type: AdvancedTrainingType, context: AdvancedTrainingContext): AdvancedTrainingSession {
  const id = `adv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const duration = context.durationMinutes;
  const pressure = context.pressureLevel || "normal";
  const track = (context as unknown as Record<string, unknown>).track as string | undefined;
  const level = (context as unknown as Record<string, unknown>).level as string | undefined;
  const blitzFor = (t: string): number => {
    if (t === "rapidResponse") return 3;
    if (t === "longForm" || t === "presentation" || t === "storytelling") return 10;
    if (t === "debate" || t === "persuasion" || t === "negotiation") return 6;
    return level === "L1" ? 10 : level === "L3" ? 4 : 6;
  };
  const toulminFor = (t: string): ToulminElement[] => {
    if (level === "L1") return ["claim", "data"];
    if (level === "L3") return ["claim", "data", "warrant", "rebuttal"];
    if (["debate", "persuasion", "negotiation", "opinion", "devilsAdvocate"].includes(t)) return ["claim", "data", "warrant"];
    return ["claim", "data"];
  };
  const blocks: AdvancedTrainingBlock[] = [];

  // Composition dynamic by duration — enriched with blitz + Toulmin per L1/L2/L3
  if (duration <= 5) {
    blocks.push({
      id: `${id}_b1`, type, objective: INSTRUCTIONS[type] || `Practice ${type}`, skillTargets: context.targetSkills.length ? context.targetSkills : [type],
      difficulty: context.difficulty || { responsePressure: 5, topicNovelty: 5, supportLevel: 5 },
      estimatedDurationMinutes: duration, instructions: INSTRUCTIONS[type] || `Practice ${type}`, constraints: context.communicationObjective ? [context.communicationObjective] : [],
      timeLimitSec: blitzFor(type), requiredToulminElements: toulminFor(type),
    });
  } else if (duration <= 10) {
    blocks.push(
      { id: `${id}_b1`, type: "spontaneous" as AdvancedTrainingType, objective: "Warm-up spontaneous", skillTargets: ["spontaneous"], difficulty: { supportLevel: 7 }, estimatedDurationMinutes: 2, instructions: "Warm-up: trả lời nhanh chủ đề quen thuộc", timeLimitSec: blitzFor("spontaneous"), requiredToulminElements: toulminFor("spontaneous") },
      { id: `${id}_b2`, type, objective: INSTRUCTIONS[type] || `Practice ${type}`, skillTargets: context.targetSkills.length ? context.targetSkills : [type], difficulty: context.difficulty || { responsePressure: 6 }, estimatedDurationMinutes: Math.max(3, duration - 4), instructions: INSTRUCTIONS[type] || `Practice ${type}`, constraints: [], timeLimitSec: blitzFor(type), requiredToulminElements: toulminFor(type) },
      { id: `${id}_b3`, type: "resilience" as AdvancedTrainingType, objective: "Cooldown reflection", skillTargets: ["resilience"], difficulty: { supportLevel: 8 }, estimatedDurationMinutes: 2, instructions: "What was difficult? What would you do differently?", timeLimitSec: 10, requiredToulminElements: ["claim", "data"] },
    );
  } else {
    blocks.push(
      { id: `${id}_b1`, type: "spontaneous" as AdvancedTrainingType, objective: "Warm-up", skillTargets: ["spontaneous"], difficulty: { supportLevel: 8 }, estimatedDurationMinutes: 2, instructions: "Warm-up", timeLimitSec: blitzFor("spontaneous"), requiredToulminElements: toulminFor("spontaneous") },
      { id: `${id}_b2`, type, objective: INSTRUCTIONS[type] || `Practice ${type}`, skillTargets: context.targetSkills.length ? context.targetSkills : [type], difficulty: context.difficulty || { responsePressure: 6 }, estimatedDurationMinutes: Math.floor((duration - 4) / 2), instructions: INSTRUCTIONS[type] || `Practice ${type}`, timeLimitSec: blitzFor(type), requiredToulminElements: toulminFor(type) },
      { id: `${id}_b3`, type: "topicSwitching" as AdvancedTrainingType, objective: "Topic switch without freezing", skillTargets: ["topicSwitching"], difficulty: { topicNovelty: 7 }, estimatedDurationMinutes: Math.floor((duration - 4) / 2), instructions: INSTRUCTIONS.topicSwitching, timeLimitSec: blitzFor("topicSwitching"), requiredToulminElements: toulminFor("topicSwitching") },
      { id: `${id}_b4`, type: "resilience" as AdvancedTrainingType, objective: "Reflection", skillTargets: ["resilience"], difficulty: { supportLevel: 7 }, estimatedDurationMinutes: 2, instructions: "Reflection speaking", timeLimitSec: 10, requiredToulminElements: ["claim", "data"] },
    );
  }

  const challenges: AdvancedChallenge[] = [];
  if (pressure === "high" || pressure === "extreme" || type === "highPressure") {
    challenges.push({ id: `${id}_c1`, type: "timePressure", trigger: "turn count", purpose: "Increase pressure", effect: "Shorter preparation window" });
    challenges.push({ id: `${id}_c2`, type: "unexpectedQuestion", trigger: "mid-session", purpose: "Test spontaneity", effect: "Abstract hypothetical question" });
  } else if (type === "debate" || type === "devilsAdvocate") {
    challenges.push({ id: `${id}_c1`, type: "counterargument", trigger: "user statement", purpose: "Argumentation", effect: "AI presents counter-evidence" });
  }

  const total = blocks.reduce((s, b) => s + b.estimatedDurationMinutes, 0);
  return {
    id, modules: track ? [`${track}_${level || "L2"}`, type] : [type], blocks, challenges, context, createdAt: new Date().toISOString(), estimatedDurationMinutes: total, rationale: `Mock session for ${type}${track ? ` (${track} ${level || "L2"})` : ""} — pressure ${pressure}, duration ${duration}m`,
  };
}
