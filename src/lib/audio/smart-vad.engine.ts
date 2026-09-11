// Smart VAD & Conversational Discourse Engine
// Implements Adaptive Endpointing VAD, Barge-in detection, Speech Metrics (WPM, TTR),
// and Discourse Stage & Conversational Twist state transitions.

import type { DiscourseStage, ConversationalTwist } from "@/types/conversation";

export interface SpeechMetrics {
  wordsPerMinute: number;
  typeTokenRatio: number; // 0 - 100%
  fillerWordCount: number;
  fillersDetected: string[];
  totalWordCount: number;
  uniqueWordCount: number;
}

const COMMON_FILLERS = new Set(["um", "uh", "er", "ah", "like", "well", "you know", "hmm"]);

/**
 * Calculates Words Per Minute (WPM) based on recognized words and speaking duration
 */
export function calculateSpeechRateWpm(text: string, durationMs: number): number {
  if (!text.trim() || durationMs < 500) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  const minutes = durationMs / 60000;
  const rawWpm = Math.round(words.length / minutes);
  return Math.min(300, Math.max(0, rawWpm));
}

/**
 * Calculates Type-Token Ratio (TTR) as a measure of lexical diversity (0 - 100%)
 */
export function calculateTypeTokenRatio(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 0;
  const uniqueWords = new Set(words);
  return Math.round((uniqueWords.size / words.length) * 100);
}

/**
 * Detects hesitations and filler words in user transcript
 */
export function detectHesitations(text: string): {
  fillerWordCount: number;
  fillersDetected: string[];
} {
  const words = text.toLowerCase().split(/\s+/);
  const detected: string[] = [];

  for (const w of words) {
    const clean = w.replace(/[^\w]/g, "");
    if (COMMON_FILLERS.has(clean)) {
      detected.push(clean);
    }
  }

  // Also check two-word filler "you know"
  const textLower = text.toLowerCase();
  const matchesYouKnow = textLower.match(/\byou know\b/g);
  if (matchesYouKnow) {
    for (let i = 0; i < matchesYouKnow.length; i++) {
      detected.push("you know");
    }
  }

  return {
    fillerWordCount: detected.length,
    fillersDetected: Array.from(new Set(detected)),
  };
}

/**
 * Maps current turn index to Discourse Stage in a 5-step conversational arch
 */
export function getDiscourseStage(turnIndex: number, totalTurns: number = 6): DiscourseStage {
  const ratio = turnIndex / Math.max(1, totalTurns);
  if (turnIndex <= 1 || ratio <= 0.2) return "rapport";
  if (ratio <= 0.45) return "discovery";
  if (ratio <= 0.7) return "twist_conflict";
  if (ratio <= 0.9) return "negotiation";
  return "resolution";
}

// Curated Conversational Twists repository per domain
const SCENARIO_TWISTS: Record<string, ConversationalTwist[]> = {
  tech_interview: [
    {
      id: "twist_system_outage",
      titleVi: "Biến cố: Sự cố nghẽn mạng cao điểm",
      descriptionEn: "The interviewer reveals: 'What if your proposed microservice fails right during Black Friday peak traffic?'",
      severity: "high",
      injectedAtTurn: 3,
      isResolved: false,
    },
    {
      id: "twist_budget_constraint",
      titleVi: "Biến cố: Cắt giảm chi phí hạ tầng",
      descriptionEn: "The hiring manager pushes back: 'Leadership wants us to cut cloud costs by 40%. How would you adapt your architecture?'",
      severity: "high",
      injectedAtTurn: 4,
      isResolved: false,
    },
  ],
  salary_negotiation: [
    {
      id: "twist_hiring_freeze",
      titleVi: "Biến cố: Hạn ngạch ngân sách quý",
      descriptionEn: "The HR director states: 'Company-wide base salaries are locked this quarter, but we might offer equity or performance bonuses.'",
      severity: "high",
      injectedAtTurn: 3,
      isResolved: false,
    },
  ],
  project_deadline: [
    {
      id: "twist_scope_creep",
      titleVi: "Biến cố: Khách hàng thêm tính năng gấp",
      descriptionEn: "The stakeholder interrupts: 'The client just insisted on adding SSO authentication before Friday's demo.'",
      severity: "high",
      injectedAtTurn: 3,
      isResolved: false,
    },
  ],
  default: [
    {
      id: "twist_unexpected_constraint",
      titleVi: "Biến cố: Tình huống phát sinh đột xuất",
      descriptionEn: "An unexpected complication arises: 'We need an alternative solution because our original vendor backed out.'",
      severity: "mild",
      injectedAtTurn: 3,
      isResolved: false,
    },
  ],
};

/**
 * Retrieves a contextual conversational twist for a given scenario and turn index
 */
export function getScenarioTwist(scenarioId: string, turnIndex: number): ConversationalTwist | null {
  const pool = SCENARIO_TWISTS[scenarioId] || SCENARIO_TWISTS.default;
  const match = pool.find((t) => t.injectedAtTurn === turnIndex);
  return match || null;
}

/**
 * Evaluates whether the user's response adequately addressed the active twist
 */
export function evaluateTwistResolution(
  twist: ConversationalTwist,
  userTranscript: string
): { isResolved: boolean; feedbackVi: string } {
  const clean = userTranscript.trim().toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length < 6) {
    return {
      isResolved: false,
      feedbackVi: "Câu trả lời còn quá ngắn, chưa đưa ra giải pháp cụ thể cho biến cố phát sinh.",
    };
  }

  // Check for problem-solving keywords
  const resolutionKeywords = [
    "instead", "alternative", "compromise", "prioritize", "handle", "mitigate",
    "backup", "plan", "solution", "adjust", "focus on", "we can", "i would",
    "recommend", "suggest", "propose"
  ];

  const hasResolutionWord = resolutionKeywords.some((k) => clean.includes(k));
  const isResolved = hasResolutionWord || words.length >= 12;

  return {
    isResolved,
    feedbackVi: isResolved
      ? "Bạn đã ứng biến giải quyết biến cố rất linh hoạt và chuyên nghiệp!"
      : "Hãy thử đề xuất giải pháp thay thế (alternative solution) hoặc thỏa hiệp cụ thể hơn.",
  };
}

/**
 * Smart VAD State Controller
 * Manages adaptive endpointing silence timers and barge-in triggers
 */
export class SmartVadStateController {
  private silenceTimer: NodeJS.Timeout | null = null;
  private isSpeechActive = false;
  private silenceThresholdMs: number;
  private onSilenceEndpoint: () => void;
  private onBargeIn?: () => void;

  constructor(options: {
    silenceThresholdMs?: number;
    onSilenceEndpoint: () => void;
    onBargeIn?: () => void;
  }) {
    this.silenceThresholdMs = options.silenceThresholdMs || 1100;
    this.onSilenceEndpoint = options.onSilenceEndpoint;
    this.onBargeIn = options.onBargeIn;
  }

  public notifySpeechChunk(isAiSpeaking: boolean) {
    // If AI is currently speaking and user produces speech -> trigger Barge-in!
    if (isAiSpeaking && this.onBargeIn) {
      this.onBargeIn();
      return;
    }

    this.isSpeechActive = true;
    this.resetSilenceTimer();
  }

  public notifyInterimTranscript(transcript: string, isAiSpeaking: boolean) {
    if (!transcript.trim()) return;

    if (isAiSpeaking && this.onBargeIn) {
      this.onBargeIn();
      return;
    }

    this.isSpeechActive = true;
    this.resetSilenceTimer();
  }

  public notifySpeechStopped() {
    this.clearSilenceTimer();
    this.isSpeechActive = false;
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      if (this.isSpeechActive) {
        this.isSpeechActive = false;
        this.onSilenceEndpoint();
      }
    }, this.silenceThresholdMs);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  public destroy() {
    this.clearSilenceTimer();
    this.isSpeechActive = false;
  }
}
