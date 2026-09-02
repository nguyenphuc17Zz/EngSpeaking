import type { GrammarIssue } from "@/types/diagnostics";

// Heuristic grammar detection — deterministic, no AI needed for basic
const PATTERNS: Array<{ key: string; re: RegExp; category: string; severity: "minor" | "moderate" | "major"; explanation: string; correction?: string }> = [
  { key: "past_tense_verb_form", re: /\b(go|come|see|eat|do) yesterday\b/i, category: "tense", severity: "moderate", explanation: "Past tense needed with 'yesterday'", correction: "went/ came / saw yesterday" },
  { key: "article_omission", re: /\b(go to|in|at) (school|office|hospital|store)\b/i, category: "article", severity: "minor", explanation: "Article may be missing before noun", correction: "go to the school/office" },
  { key: "subject_verb", re: /\b(he|she|it) (go|have|do|are)\b/i, category: "subject-verb", severity: "moderate", explanation: "Subject-verb agreement", correction: "he goes / she has" },
  { key: "very_like", re: /\bvery like\b/i, category: "naturalness", severity: "moderate", explanation: "'very like' → 'really like'", correction: "really like" },
  { key: "i_is", re: /\bi is\b/i, category: "subject-verb", severity: "major", explanation: "'I is' → 'I am'", correction: "I am" },
];

export function analyzeGrammar(turns: Array<{ turnId: string; transcript: string }>): { issues: GrammarIssue[]; score: number; confidence: number } {
  const issues: GrammarIssue[] = [];
  for (const t of turns) {
    for (const p of PATTERNS) {
      const m = t.transcript.match(p.re);
      if (m) {
        issues.push({
          id: `gi_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
          span: m[0],
          category: p.category,
          severity: p.severity,
          explanation: p.explanation,
          correction: p.correction,
          recurrenceKey: p.key,
          evidenceConfidence: 0.85,
        });
      }
    }
  }
  // Simple score: 100 - issues weighted
  const penalty = issues.reduce((s, i) => s + (i.severity === "major" ? 18 : i.severity === "moderate" ? 10 : 4), 0);
  const score = Math.max(15, Math.min(95, 100 - penalty - (turns.length === 0 ? 30 : 0)));
  const confidence = issues.length ? 0.7 : 0.6;
  return { issues, score, confidence };
}
