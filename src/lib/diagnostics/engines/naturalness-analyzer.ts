export function analyzeNaturalness(turns: Array<{ transcript: string }>): { score: number; issues: Array<{ phrase: string; better: string; reason: string }>; confidence: number } {
  const issues: Array<{ phrase: string; better: string; reason: string }> = [];
  const checks: Array<{ re: RegExp; better: string; reason: string }> = [
    { re: /\bI very like\b/i, better: "I really like", reason: "Very does not collocate with like — use really" },
    { re: /\bI would like to make a reservation for the restaurant\b/i, better: "I'd like to make a restaurant reservation", reason: "More natural compact phrasing" },
    { re: /\bMy name is.*I am from\b/i, better: "I'm ... from ...", reason: "Can be more concise" },
  ];
  for (const t of turns) {
    for (const c of checks) if (c.re.test(t.transcript)) issues.push({ phrase: (t.transcript.match(c.re)?.[0] || ""), better: c.better, reason: c.reason });
  }
  // If conversational, naturalness penalty for overly formal long sentences >25 words repeatedly
  const longSentences = turns.filter((t) => t.transcript.split(/\s+/).length > 25).length;
  let score = 70;
  score -= issues.length * 12;
  score -= longSentences * 5;
  if (turns.some((t) => t.transcript.includes("you know") || t.transcript.includes("I think"))) score += 5;
  score = Math.max(20, Math.min(90, score));
  return { score, issues, confidence: issues.length ? 0.6 : 0.55 };
}
