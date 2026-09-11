// Affective State Machine & Pragmatic Speech Act Classifier
// Implements character psychology tracking (Trust, Patience, Defensiveness, Emotional Valence),
// Pragmatic Speech Act intent classification, and Game-Theoretic negotiation dynamics.

import type {
  PragmaticSpeechAct,
  CharacterState,
  ConversationWorldState,
  SpeakingObjective,
  ConversationFact,
} from "@/types/conversation-world";

export interface SpeechActClassification {
  act: PragmaticSpeechAct;
  confidence: number; // 0.0 - 1.0
  labelVi: string;
  icon: string;
  feedbackVi: string;
}

export interface AffectiveDeltaResult {
  deltaTrust: number;
  deltaPatience: number;
  deltaDefensiveness: number;
  deltaValence: number;
  newMoodVi: string;
  pragmaticSummaryVi: string;
}

const PRAGMATIC_ACT_META: Record<
  PragmaticSpeechAct,
  { labelVi: string; icon: string; feedbackVi: string }
> = {
  empathy_rapport: {
    labelVi: "Đồng Cảm & Xây Dựng Quan Hệ",
    icon: "🤝",
    feedbackVi: "Tạo được thiện cảm và không khí hợp tác tích cực với đối phương.",
  },
  concession_compromise: {
    labelVi: "Đề Xuất Thỏa Hiệp (Win-Win)",
    icon: "⚖️",
    feedbackVi: "Thể hiện tư duy đàm phán linh hoạt, tìm giải pháp hài hòa đôi bên.",
  },
  assertive_evidence: {
    labelVi: "Khẳng Định Kèm Dẫn Chứng",
    icon: "📊",
    feedbackVi: "Lập luận sắc bén, thuyết phục bằng dữ liệu và bằng chứng cụ thể.",
  },
  clarification_inquiry: {
    labelVi: "Thăm Dò & Đặt Câu Hỏi Chiến Lược",
    icon: "🔍",
    feedbackVi: "Biết lắng nghe, khai thác thêm thông tin trước khi đưa ra quyết định.",
  },
  counter_challenge: {
    labelVi: "Phản Biện & Tranh Luận Sắc Bén",
    icon: "⚡",
    feedbackVi: "Dám bảo vệ quan điểm riêng nhưng cần khéo léo tránh tạo đối đầu gắt gao.",
  },
  hedging_hesitant: {
    labelVi: "Rụt Rè & Chưa Quyết Đoán",
    icon: "⏳",
    feedbackVi: "Câu trả lời hơi mơ hồ hoặc thiếu tự tin, hãy cố gắng đưa ra luận điểm rõ ràng hơn.",
  },
};

/**
 * Classifies the learner's utterance into a Pragmatic Speech Act
 */
export function classifyPragmaticSpeechAct(userTranscript: string): SpeechActClassification {
  const clean = userTranscript.trim().toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length <= 3) {
    return {
      act: "hedging_hesitant",
      confidence: 0.85,
      ...PRAGMATIC_ACT_META.hedging_hesitant,
    };
  }

  // Empathy & Rapport building markers
  const empathyPatterns = [
    "i understand",
    "i see your point",
    "totally agree",
    "appreciate your",
    "thank you for",
    "great idea",
    "respect your",
    "makes a lot of sense",
    "hear what you're saying",
    "glad to hear",
  ];
  if (empathyPatterns.some((p) => clean.includes(p))) {
    return {
      act: "empathy_rapport",
      confidence: 0.9,
      ...PRAGMATIC_ACT_META.empathy_rapport,
    };
  }

  // Concession & Compromise patterns
  const compromisePatterns = [
    "how about",
    "what if we",
    "compromise",
    "middle ground",
    "meet halfway",
    "alternative",
    "on the other hand",
    "we could try",
    "if you can",
    "instead of",
    "flexible with",
  ];
  if (compromisePatterns.some((p) => clean.includes(p))) {
    return {
      act: "concession_compromise",
      confidence: 0.88,
      ...PRAGMATIC_ACT_META.concession_compromise,
    };
  }

  // Assertive with evidence patterns
  const assertivePatterns = [
    "based on",
    "specifically",
    "for example",
    "for instance",
    "data shows",
    "track record",
    "proven",
    "increased by",
    "decreased by",
    "percent",
    "resulted in",
    "deliver",
    "responsible for",
  ];
  const hasNumbers = /\b\d+(\.\d+)?%?\b/.test(clean);
  if (assertivePatterns.some((p) => clean.includes(p)) || (hasNumbers && words.length >= 8)) {
    return {
      act: "assertive_evidence",
      confidence: 0.85,
      ...PRAGMATIC_ACT_META.assertive_evidence,
    };
  }

  // Strategic Inquiry & Clarification patterns
  const inquiryPatterns = [
    "could you clarify",
    "what do you mean by",
    "how do you see",
    "what are the expectations",
    "could you elaborate",
    "what is the timeline",
    "is it possible to",
    "may i ask",
  ];
  const isQuestion = clean.endsWith("?") || clean.startsWith("what") || clean.startsWith("how") || clean.startsWith("could");
  if (inquiryPatterns.some((p) => clean.includes(p)) || (isQuestion && words.length >= 5)) {
    return {
      act: "clarification_inquiry",
      confidence: 0.82,
      ...PRAGMATIC_ACT_META.clarification_inquiry,
    };
  }

  // Counter challenge patterns
  const challengePatterns = [
    "i disagree",
    "i don't agree",
    "however",
    "on the contrary",
    "that might not work",
    "the problem is",
    "not necessarily",
    "that's not true",
    "unrealistic",
    "difficult to accept",
  ];
  if (challengePatterns.some((p) => clean.includes(p))) {
    return {
      act: "counter_challenge",
      confidence: 0.84,
      ...PRAGMATIC_ACT_META.counter_challenge,
    };
  }

  // Fallback based on length and certainty
  const hesitantWords = ["maybe", "i guess", "not sure", "probably", "i don't know", "um", "uh"];
  if (hesitantWords.some((h) => clean.includes(h))) {
    return {
      act: "hedging_hesitant",
      confidence: 0.75,
      ...PRAGMATIC_ACT_META.hedging_hesitant,
    };
  }

  // Default to assertive if well formulated
  return {
    act: "assertive_evidence",
    confidence: 0.65,
    ...PRAGMATIC_ACT_META.assertive_evidence,
  };
}

/**
 * Calculates psychological delta updates for the character based on the user's speech act
 */
export function computeAffectiveDeltas(
  act: PragmaticSpeechAct,
  currentState: CharacterState
): AffectiveDeltaResult {
  const currentDefensiveness = currentState.defensiveness ?? 40;
  let deltaTrust = 0;
  let deltaPatience = 0;
  let deltaDefensiveness = 0;
  let deltaValence = 0;

  switch (act) {
    case "empathy_rapport":
      deltaTrust = 4;
      deltaPatience = 5;
      deltaDefensiveness = -8;
      deltaValence = 0.15;
      break;

    case "concession_compromise":
      deltaTrust = 5;
      deltaPatience = 4;
      deltaDefensiveness = -10;
      deltaValence = 0.2;
      break;

    case "assertive_evidence":
      deltaTrust = 4;
      deltaPatience = 2;
      deltaDefensiveness = -3;
      deltaValence = 0.1;
      break;

    case "clarification_inquiry":
      deltaTrust = 2;
      deltaPatience = 3;
      deltaDefensiveness = -4;
      deltaValence = 0.05;
      break;

    case "counter_challenge":
      // If character was already defensive, tension rises
      if (currentDefensiveness > 50) {
        deltaTrust = -2;
        deltaPatience = -5;
        deltaDefensiveness = 8;
        deltaValence = -0.15;
      } else {
        deltaTrust = 1;
        deltaPatience = -2;
        deltaDefensiveness = 4;
        deltaValence = -0.05;
      }
      break;

    case "hedging_hesitant":
      deltaTrust = -2;
      deltaPatience = -6;
      deltaDefensiveness = 3;
      deltaValence = -0.1;
      break;
  }

  const projectedTrust = Math.max(0, Math.min(100, currentState.trust + deltaTrust));
  const projectedDefensiveness = Math.max(0, Math.min(100, currentDefensiveness + deltaDefensiveness));

  let newMoodVi = "Lắng nghe tích cực";
  if (projectedTrust >= 80 && projectedDefensiveness <= 30) {
    newMoodVi = "Rất tin cậy & Sẵn sàng hợp tác";
  } else if (projectedDefensiveness >= 70) {
    newMoodVi = "Đề phòng & Thận trọng";
  } else if (currentState.patience + deltaPatience <= 30) {
    newMoodVi = "Sốt ruột & Muốn câu trả lời trọng tâm";
  } else if (projectedTrust >= 60) {
    newMoodVi = "Cởi mở & Thảo luận xây dựng";
  }

  const actMeta = PRAGMATIC_ACT_META[act];

  return {
    deltaTrust,
    deltaPatience,
    deltaDefensiveness,
    deltaValence,
    newMoodVi,
    pragmaticSummaryVi: `${actMeta.icon} ${actMeta.labelVi}`,
  };
}

/**
 * Checks if any hidden objective is unlocked by the user's progress or pragmatic stance
 */
export function checkHiddenObjectiveUnlock(
  worldState: ConversationWorldState,
  act: PragmaticSpeechAct
): SpeakingObjective | null {
  const objectives = worldState.scenario.speakingObjectives || [];
  const hiddenObj = objectives.find((obj) => obj.hidden && !obj.isUnlocked);
  if (!hiddenObj) return null;

  const currentTrust = worldState.activeCharacter.trust;
  const currentDefensiveness = worldState.activeCharacter.defensiveness ?? 40;

  // Unlocking conditions:
  // 1. High trust milestone (>= 75)
  // 2. Collaborative move when defensiveness is low
  // 3. Meaningful concession in later turns (turn >= 3)
  const isHighTrust = currentTrust >= 75;
  const isCollaborativeBreakthrough =
    (act === "empathy_rapport" || act === "concession_compromise") &&
    currentDefensiveness <= 35 &&
    worldState.turnCount >= 2;
  const isNegotiationCompromise = act === "concession_compromise" && worldState.turnCount >= 3;

  if (isHighTrust || isCollaborativeBreakthrough || isNegotiationCompromise) {
    return {
      ...hiddenObj,
      isUnlocked: true,
      unlockedAtTurn: worldState.turnCount + 1,
    };
  }

  return null;
}

/**
 * Detects obvious quantitative or timeline contradictions in the user's ongoing speech
 */
export function detectFactContradictions(
  newUtterance: string,
  knownFacts: ConversationFact[]
): string | null {
  if (knownFacts.length === 0) return null;
  const clean = newUtterance.toLowerCase();

  // Simple heuristic for numbers or dates mentioned against prior recorded facts
  for (const fact of knownFacts) {
    const factLower = fact.fact.toLowerCase();

    // Check budget contradiction
    const factBudgetMatch = factLower.match(/(\$?\d+([,\.]\d+)?\s*(k|m|million|thousand|usd)?)/i);
    const newBudgetMatch = clean.match(/(\$?\d+([,\.]\d+)?\s*(k|m|million|thousand|usd)?)/i);

    if (
      factBudgetMatch &&
      newBudgetMatch &&
      factLower.includes("budget") &&
      clean.includes("budget") &&
      factBudgetMatch[0] !== newBudgetMatch[0]
    ) {
      return `Mâu thuẫn số liệu ngân sách: trước đó nêu "${fact.fact}", hiện tại nêu "${newBudgetMatch[0]}"`;
    }
  }

  return null;
}
