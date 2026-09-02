// Preserve raw vs normalized §71-72
export interface PreprocessedTurn {
  turnId: string;
  raw: string;
  normalized: string;
  timestamp?: string;
  durationMs?: number;
  timeToFirstWordMs?: number;
}

export function preprocessTranscript(turns: Array<{ turnId: string; text: string; rawText?: string; timestamp?: string; durationMs?: number; timeToFirstWordMs?: number }>): PreprocessedTurn[] {
  return turns.map((t) => ({
    turnId: t.turnId,
    raw: t.rawText ?? t.text,
    normalized: (t.text || "").trim(),
    timestamp: t.timestamp,
    durationMs: t.durationMs,
    timeToFirstWordMs: t.timeToFirstWordMs,
  }));
}

export function extractSpans(transcript: string, span: string): { start: number; end: number } | null {
  const idx = transcript.toLowerCase().indexOf(span.toLowerCase());
  if (idx === -1) return null;
  return { start: idx, end: idx + span.length };
}
