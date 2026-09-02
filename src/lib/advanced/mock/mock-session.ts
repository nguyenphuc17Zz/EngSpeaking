// Mock session generator — deterministic, no AI
import type { AdvancedTrainingContext, AdvancedTrainingSession, AdvancedTrainingBlock, AdvancedChallenge, AdvancedTrainingType } from "@/types/advanced";

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
  const blocks: AdvancedTrainingBlock[] = [];

  // Composition dynamic by duration
  if (duration <= 5) {
    blocks.push({
      id: `${id}_b1`, type, objective: INSTRUCTIONS[type] || `Practice ${type}`, skillTargets: context.targetSkills.length ? context.targetSkills : [type],
      difficulty: context.difficulty || { responsePressure: 5, topicNovelty: 5, supportLevel: 5 },
      estimatedDurationMinutes: duration, instructions: INSTRUCTIONS[type] || `Practice ${type}`, constraints: context.communicationObjective ? [context.communicationObjective] : [],
    });
  } else if (duration <= 10) {
    blocks.push(
      { id: `${id}_b1`, type: "spontaneous" as AdvancedTrainingType, objective: "Warm-up spontaneous", skillTargets: ["spontaneous"], difficulty: { supportLevel: 7 }, estimatedDurationMinutes: 2, instructions: "Warm-up: trả lời nhanh chủ đề quen thuộc" },
      { id: `${id}_b2`, type, objective: INSTRUCTIONS[type] || `Practice ${type}`, skillTargets: context.targetSkills.length ? context.targetSkills : [type], difficulty: context.difficulty || { responsePressure: 6 }, estimatedDurationMinutes: Math.max(3, duration - 4), instructions: INSTRUCTIONS[type] || `Practice ${type}`, constraints: [] },
      { id: `${id}_b3`, type: "resilience" as AdvancedTrainingType, objective: "Cooldown reflection", skillTargets: ["resilience"], difficulty: { supportLevel: 8 }, estimatedDurationMinutes: 2, instructions: "What was difficult? What would you do differently?" },
    );
  } else {
    blocks.push(
      { id: `${id}_b1`, type: "spontaneous" as AdvancedTrainingType, objective: "Warm-up", skillTargets: ["spontaneous"], difficulty: { supportLevel: 8 }, estimatedDurationMinutes: 2, instructions: "Warm-up" },
      { id: `${id}_b2`, type, objective: INSTRUCTIONS[type] || `Practice ${type}`, skillTargets: context.targetSkills.length ? context.targetSkills : [type], difficulty: context.difficulty || { responsePressure: 6 }, estimatedDurationMinutes: Math.floor((duration - 4) / 2), instructions: INSTRUCTIONS[type] || `Practice ${type}` },
      { id: `${id}_b3`, type: "topicSwitching" as AdvancedTrainingType, objective: "Topic switch without freezing", skillTargets: ["topicSwitching"], difficulty: { topicNovelty: 7 }, estimatedDurationMinutes: Math.floor((duration - 4) / 2), instructions: INSTRUCTIONS.topicSwitching },
      { id: `${id}_b4`, type: "resilience" as AdvancedTrainingType, objective: "Reflection", skillTargets: ["resilience"], difficulty: { supportLevel: 7 }, estimatedDurationMinutes: 2, instructions: "Reflection speaking" },
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
    id, modules: [type], blocks, challenges, context, createdAt: new Date().toISOString(), estimatedDurationMinutes: total, rationale: `Mock session for ${type} — pressure ${pressure}, duration ${duration}m`,
  };
}
