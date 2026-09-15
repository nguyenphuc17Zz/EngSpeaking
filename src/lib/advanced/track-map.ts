// Mapping from 25 legacy modules → 3 tracks × 3 levels + track metadata

import type { AdvancedLevel, AdvancedTrack, AdvancedTrainingType } from "@/types/advanced";

export const TRACK_META: Record<
  AdvancedTrack,
  { labelVi: string; labelEn: string; descVi: string; skillTags: AdvancedTrainingType[] }
> = {
  reflex: {
    labelVi: "Phản xạ dưới áp lực",
    labelEn: "Reflex under Pressure",
    descVi: "Bật câu trong 3–6s, chuyển chủ đề không đơ, trả lời câu hỏi bất ngờ.",
    skillTags: [
      "rapidResponse",
      "spontaneous",
      "topicSwitching",
      "unexpectedQuestion",
      "pressureConversation",
      "highPressure",
      "qaChallenge",
    ],
  },
  argument: {
    labelVi: "Lập luận & Đối kháng",
    labelEn: "Argument & Debate",
    descVi: "Claim → Data → Warrant → Rebuttal, phản biện lịch sự, đàm phán có điều kiện.",
    skillTags: [
      "opinion",
      "debate",
      "persuasion",
      "negotiation",
      "devilsAdvocate",
      "professional",
      "escalation",
      "ambiguity",
      "clarification",
    ],
  },
  extended: {
    labelVi: "Diễn thuyết mạch dài",
    labelEn: "Extended Discourse",
    descVi: "Nói liên tục 1–3 phút: kể chuyện, thuyết trình, phỏng vấn, đào sâu What→Why→Example.",
    skillTags: [
      "storytelling",
      "longForm",
      "presentation",
      "deepFollowup",
      "abstract",
      "interview",
      "resilience",
      "reformulation",
      "roleReversal",
    ],
  },
};

export const LEVEL_META: Record<AdvancedLevel, { labelVi: string; descVi: string }> = {
  L1: { labelVi: "L1 · Có khung", descVi: "Template + starter + vocab, prep 3s, blitz 10s, chỉ cần Claim+Data." },
  L2: { labelVi: "L2 · Bán tự do", descVi: "Keywords + constraints, prep 2s, blitz 6s, thêm Warrant." },
  L3: { labelVi: "L3 · Tự do", descVi: "Minimal cue, prep 1.5s, blitz 3–4s, full Toulmin + fallacy + bridging." },
};

export function trackOfSkillTag(skillTag: string): AdvancedTrack {
  for (const [track, meta] of Object.entries(TRACK_META) as Array<[AdvancedTrack, (typeof TRACK_META)[AdvancedTrack]]>) {
    if (meta.skillTags.includes(skillTag as AdvancedTrainingType)) return track;
  }
  return "reflex";
}

export function defaultSkillTagForTrack(track: AdvancedTrack): AdvancedTrainingType {
  return TRACK_META[track].skillTags[1] ?? TRACK_META[track].skillTags[0];
}

export function legacyModuleToTrackLevel(legacyId: string): { track: AdvancedTrack; level: AdvancedLevel } {
  const track = trackOfSkillTag(legacyId);
  // Heuristic: heavy-pressure / abstract modules default to L3, warm-up ones to L1
  if (["highPressure", "devilsAdvocate", "abstract", "negotiation", "debate"].includes(legacyId)) {
    return { track, level: "L3" };
  }
  if (["spontaneous", "opinion", "resilience", "clarification", "reformulation"].includes(legacyId)) {
    return { track, level: "L1" };
  }
  return { track, level: "L2" };
}
