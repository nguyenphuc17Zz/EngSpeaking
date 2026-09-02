// Deterministic metrics §54, §9-12, §26-27 — code, not AI
export interface TurnMetrics {
  turnId: string;
  transcript: string;
  durationMs?: number;
  timeToFirstWordMs?: number;
  wordCount: number;
  wordsPerMinute?: number;
  fillerCount: number;
  fillerRate: number;
  uniqueWordCount: number;
  lexicalDiversity: number;
  repetitionRate: number;
  genericWordCount: number;
  isShortAnswer: boolean;
}

export interface SessionMetrics {
  totalTurns: number;
  totalWords: number;
  avgWordsPerTurn: number;
  ttfw: { avg?: number; median?: number; p90?: number; max?: number };
  durationStats: { avgDurationMs?: number };
  fillerTotal: number;
  uniqueWords: number;
  lexicalDiversity: number;
  shortAnswerRate: number;
  completeness: "too_short" | "partial" | "sufficient" | "rich";
}

const FILLERS = ["um", "uh", "well", "actually", "you know", "like", "so", "hmm"];
const GENERIC_WORDS = ["thing", "things", "stuff", "very", "good", "bad", "nice", "big", "small", "do", "make", "get", "go"];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
}

export function computeTurnMetrics(turn: { turnId: string; transcript: string; durationMs?: number; timeToFirstWordMs?: number; expectedMinWords?: number }): TurnMetrics {
  const tokens = tokenize(turn.transcript);
  const wordCount = tokens.length;
  const durationMin = turn.durationMs ? turn.durationMs / 60000 : undefined;
  const wpm = durationMin && durationMin > 0 ? Math.round(wordCount / durationMin) : undefined;
  const fillerCount = FILLERS.reduce((acc, f) => {
    const re = new RegExp(`\\b${f.replace(" ", "\\s+")}\\b`, "gi");
    const m = turn.transcript.match(re);
    return acc + (m ? m.length : 0);
  }, 0);
  const unique = new Set(tokens).size;
  const lexicalDiversity = wordCount ? unique / wordCount : 0;
  // repetition: duplicated tokens beyond first occurrence
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  let repeated = 0;
  for (const [, c] of freq) if (c > 1) repeated += c - 1;
  const repetitionRate = wordCount ? repeated / wordCount : 0;
  const genericWordCount = tokens.filter((t) => GENERIC_WORDS.includes(t)).length;
  const isShortAnswer = wordCount <= 3 && turn.transcript.trim().length > 0;
  return {
    turnId: turn.turnId,
    transcript: turn.transcript,
    durationMs: turn.durationMs,
    timeToFirstWordMs: turn.timeToFirstWordMs,
    wordCount,
    wordsPerMinute: wpm,
    fillerCount,
    fillerRate: wordCount ? fillerCount / wordCount : 0,
    uniqueWordCount: unique,
    lexicalDiversity,
    repetitionRate,
    genericWordCount,
    isShortAnswer,
  };
}

export function computeSessionMetrics(turns: Array<{ transcript: string; durationMs?: number; timeToFirstWordMs?: number }>): SessionMetrics {
  const totalTurns = turns.length;
  const tms = turns.map((t) => computeTurnMetrics({ turnId: "", transcript: t.transcript, durationMs: t.durationMs, timeToFirstWordMs: t.timeToFirstWordMs }));
  const totalWords = tms.reduce((s, m) => s + m.wordCount, 0);
  const avgWordsPerTurn = totalTurns ? totalWords / totalTurns : 0;
  const ttfws = tms.map((m) => m.timeToFirstWordMs).filter((v): v is number => typeof v === "number" && v >= 0).sort((a, b) => a - b);
  const avg = ttfws.length ? ttfws.reduce((s, v) => s + v, 0) / ttfws.length : undefined;
  const median = ttfws.length ? ttfws[Math.floor(ttfws.length / 2)] : undefined;
  const p90 = ttfws.length ? ttfws[Math.floor(ttfws.length * 0.9)] : undefined;
  const max = ttfws.length ? ttfws[ttfws.length - 1] : undefined;
  const durations = tms.map((m) => m.durationMs).filter((v): v is number => typeof v === "number");
  const avgDurationMs = durations.length ? durations.reduce((s, v) => s + v, 0) / durations.length : undefined;
  const fillerTotal = tms.reduce((s, m) => s + m.fillerCount, 0);
  const allTokens = turns.flatMap((t) => tokenize(t.transcript));
  const uniqueWords = new Set(allTokens).size;
  const lexicalDiversity = allTokens.length ? uniqueWords / allTokens.length : 0;
  const shortAnswerRate = totalTurns ? tms.filter((m) => m.isShortAnswer).length / totalTurns : 0;
  let completeness: SessionMetrics["completeness"] = "too_short";
  if (totalTurns >= 8 || totalWords >= 100) completeness = "rich";
  else if (totalTurns >= 5 || totalWords >= 50) completeness = "sufficient";
  else if (totalTurns >= 3 || totalWords >= 20) completeness = "partial";
  return { totalTurns, totalWords, avgWordsPerTurn, ttfw: { avg, median, p90, max }, durationStats: { avgDurationMs }, fillerTotal, uniqueWords, lexicalDiversity, shortAnswerRate, completeness };
}

export function detectResponseSpeedPattern(metrics: SessionMetrics, turnsByContext?: { familiar?: number[]; unfamiliar?: number[]; pressure?: number[] }): string[] {
  const patterns: string[] = [];
  if (metrics.ttfw.avg != null && metrics.ttfw.avg > 3000) patterns.push("slow_response_overall");
  if (metrics.ttfw.p90 != null && metrics.ttfw.p90 > 5000) patterns.push("slow_p90");
  if (turnsByContext?.pressure && turnsByContext.pressure.length > 2) {
    const avgPressure = turnsByContext.pressure.reduce((a, b) => a + b, 0) / turnsByContext.pressure.length;
    if (avgPressure > (metrics.ttfw.avg || 2000) + 800) patterns.push("pressure_sensitivity");
  }
  return patterns;
}
