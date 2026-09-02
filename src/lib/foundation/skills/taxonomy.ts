import type { FoundationSkill, FoundationExerciseType, FoundationLevel } from "@/types/foundation";

export interface SkillMeta {
  skill: FoundationSkill;
  labelVi: string;
  labelEn: string;
  description: string;
  levelRange: [FoundationLevel, FoundationLevel];
  defaultTypes: FoundationExerciseType[];
}

export const SKILL_TAXONOMY: SkillMeta[] = [
  { skill: "sentence_retrieval", labelVi: "Truy xuất câu", labelEn: "Sentence Retrieval", description: "Lấy câu tiếng Anh ra khỏi trí nhớ và nói ngay", levelRange: [2, 6], defaultTypes: ["one_sentence", "substitution", "rapid_response"] },
  { skill: "chunk_retrieval", labelVi: "Cụm từ", labelEn: "Chunk Retrieval", description: "Dùng cụm từ cố định tự nhiên", levelRange: [1, 5], defaultTypes: ["chunk_practice", "pattern_practice"] },
  { skill: "sentence_construction", labelVi: "Xây câu", labelEn: "Sentence Construction", description: "Xây câu đúng ngữ pháp khi nói", levelRange: [2, 7], defaultTypes: ["pattern_practice", "substitution", "controlled_speaking"] },
  { skill: "sentence_expansion", labelVi: "Mở rộng câu", labelEn: "Sentence Expansion", description: "Thêm chi tiết where/when/why vào câu", levelRange: [4, 8], defaultTypes: ["answer_expansion", "controlled_speaking"] },
  { skill: "substitution", labelVi: "Thay thế", labelEn: "Substitution", description: "Đổi 1-3 yếu tố trong câu", levelRange: [2, 7], defaultTypes: ["substitution", "pattern_practice"] },
  { skill: "speaking_repetition", labelVi: "Nhại & Lặp", labelEn: "Repetition", description: "Nghe → lặp lại chính xác", levelRange: [0, 3], defaultTypes: ["repeat", "shadow"] },
  { skill: "shadowing", labelVi: "Shadowing", labelEn: "Shadowing", description: "Nhại theo nhịp, tốc độ 0.75-1.25x", levelRange: [1, 4], defaultTypes: ["shadow"] },
  { skill: "controlled_speaking", labelVi: "Nói có kiểm soát", labelEn: "Controlled Speaking", description: "Nói trong ràng buộc (tense, reason, example)", levelRange: [5, 8], defaultTypes: ["controlled_speaking", "stimulus_speaking"] },
  { skill: "response_speed", labelVi: "Phản xạ nhanh", labelEn: "Response Speed", description: "Bắt đầu nói trong 3s", levelRange: [4, 9], defaultTypes: ["rapid_response", "timed_speaking"] },
  { skill: "active_vocabulary", labelVi: "Từ vựng chủ động", labelEn: "Active Vocabulary", description: "Biến từ thụ động thành nói được", levelRange: [3, 7], defaultTypes: ["vocabulary_activation", "translation_bridge"] },
  { skill: "grammar_in_speech", labelVi: "Ngữ pháp khi nói", labelEn: "Grammar in Speech", description: "Dùng thì, điều kiện, so sánh khi nói", levelRange: [3, 8], defaultTypes: ["grammar_speaking", "pattern_practice"] },
  { skill: "conversation_followup", labelVi: "Nối tiếp hội thoại", labelEn: "Follow-up", description: "Tiếp tục sau câu trả lời", levelRange: [5, 9], defaultTypes: ["follow_up", "rapid_response"] },
  { skill: "micro_monologue", labelVi: "Độc thoại ngắn", labelEn: "Micro Monologue", description: "Nói liên tục 30-60s", levelRange: [7, 10], defaultTypes: ["micro_monologue", "timed_speaking"] },
  { skill: "recovery", labelVi: "Phục hồi", labelEn: "Recovery", description: "Tiếp tục khi bí, dùng hint", levelRange: [4, 9], defaultTypes: ["recovery", "confidence"] },
  { skill: "self_correction", labelVi: "Tự sửa", labelEn: "Self Correction", description: "Tự phát hiện và sửa lỗi", levelRange: [4, 8], defaultTypes: ["self_correction", "repeat_until_better"] },
  { skill: "confidence", labelVi: "Tự tin", labelEn: "Confidence", description: "Nói trọn vẹn không ngắt", levelRange: [0, 10], defaultTypes: ["confidence", "timed_speaking"] },
];

export function getSkillMeta(skill: FoundationSkill): SkillMeta | undefined {
  return SKILL_TAXONOMY.find((s) => s.skill === skill);
}

export function getTypesForSkill(skill: FoundationSkill): FoundationExerciseType[] {
  return getSkillMeta(skill)?.defaultTypes || ["one_sentence"];
}

export function getLevelForSkill(skill: FoundationSkill, difficulty: number): FoundationLevel {
  const meta = getSkillMeta(skill);
  if (!meta) return 4;
  const [min, max] = meta.levelRange;
  const t = (difficulty - 1) / 9;
  return Math.round(min + t * (max - min)) as FoundationLevel;
}
