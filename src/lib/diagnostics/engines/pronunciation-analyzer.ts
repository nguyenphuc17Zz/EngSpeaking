// Pronunciation analyzer §20-21 — capability aware, never fake phoneme
export type PronunciationStatus = "high" | "medium" | "low" | "not_available";

export interface PronunciationResult {
  score: number; // -1 for not_available, else 0-100
  status: PronunciationStatus;
  evidence: string[];
  confidence: number;
}

export function analyzePronunciation(
  turns: Array<{ transcript: string; confidence?: number; durationMs?: number }>,
  hasAudio: boolean
): PronunciationResult {
  if (!hasAudio || turns.length === 0) {
    return { score: -1, status: "not_available", evidence: ["Audio/confidence data unavailable — cannot evaluate pronunciation"], confidence: 0 };
  }
  // If we have STT confidence
  const confidences = turns.map((t) => t.confidence).filter((v): v is number => typeof v === "number");
  const avgConf = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : undefined;
  const evidence: string[] = [];
  let score: number;
  let status: PronunciationStatus;
  let confidence = 0.5;

  if (avgConf != null) {
    if (avgConf > 0.85) { score = 82; status = "high"; evidence.push(`High STT confidence avg ${(avgConf * 100).toFixed(0)}% — clear pronunciation`); confidence = 0.7; }
    else if (avgConf > 0.65) { score = 65; status = "medium"; evidence.push(`Medium STT confidence ${(avgConf * 100).toFixed(0)}%`); confidence = 0.5; }
    else { score = 45; status = "low"; evidence.push(`Low STT confidence ${(avgConf * 100).toFixed(0)}% — potential pronunciation mismatch`); confidence = 0.4; }
  } else {
    // Fallback heuristic: check for misrecognized words proxy (very short / repeated?)
    const short = turns.filter((t) => t.transcript.trim().split(/\s+/).length <= 2).length;
    if (short > turns.length * 0.5) {
      score = 50; status = "low"; evidence.push("Many very short transcripts — possible misrecognition");
      confidence = 0.3;
    } else {
      score = 60; status = "medium"; evidence.push("Limited audio data — estimate only");
      confidence = 0.35;
    }
  }
  return { score, status, evidence, confidence };
}
