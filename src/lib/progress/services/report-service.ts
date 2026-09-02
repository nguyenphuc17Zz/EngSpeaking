import { generateTextWithRouting } from "@/lib/ai";
import { WEEKLY_REPORT_SYSTEM, buildWeeklyPrompt } from "../prompts/weekly-report";
import type { ProgressReport } from "@/types/progress";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

const CACHE = new Map<string, { report: ProgressReport; at: number }>();

export async function generateReport(period: "7d" | "30d" | "90d", learnerId = "default", opts?: { provider?: string; model?: string }): Promise<ProgressReport> {
  const key = `${learnerId}:${period}`;
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.at < 1000 * 60 * 30) return cached.report;

  // Try DB cache
  if (isSupabaseConfigured()) {
    const supabase = createServerClient()!;
    const since = period === "7d" ? new Date(Date.now() - 7 * 86400000) : period === "90d" ? new Date(Date.now() - 90 * 86400000) : new Date(Date.now() - 30 * 86400000);
    const { data } = await supabase.from("progress_reports").select("report").eq("learner_state_id", learnerId).gte("period_start", since.toISOString()).order("created_at", { ascending: false }).limit(1).single();
    if (data?.report) {
      const r = data.report as ProgressReport;
      CACHE.set(key, { report: r, at: Date.now() });
      return r;
    }
  }

  // Build summary from existing data (deterministic fallback if no AI)
  const provider = opts?.provider || "gemini";
  const model = opts?.model || "auto";
  const summary = { period, learnerId, note: "Synthetic summary — replace with real aggregation" };

  if (provider === "mock") {
    const report: ProgressReport = {
      period: { start: new Date(Date.now() - (period === "7d" ? 7 : period === "90d" ? 90 : 30) * 86400000).toISOString(), end: new Date().toISOString() },
      headline: `Progress over last ${period}: Response speed improved, grammar stable.`,
      majorImprovements: [{ metric: "responseSpeed", change: "+18%", evidenceCount: 5, confidence: "high" }],
      persistentChallenges: [{ metric: "spontaneous", description: "Unfamiliar topics still challenging" }],
      milestones: [],
      strongestSkill: "grammar",
      weakestSkill: "responseSpeed",
      mostImportantChange: "Response speed +18%",
      nextFocus: "spontaneous speaking under pressure",
      confidence: 0.7,
      generatedAt: new Date().toISOString(),
      reportVersion: "1.0.0",
    };
    CACHE.set(key, { report, at: Date.now() });
    return report;
  }

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: buildWeeklyPrompt(JSON.stringify(summary)) }],
        systemInstruction: WEEKLY_REPORT_SYSTEM,
        temperature: 0.4,
        maxOutputTokens: 800,
      },
    });
    const txt = res.text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    const json = JSON.parse(txt.match(/\{[\s\S]*\}/)?.[0] || txt) as ProgressReport;
    json.generatedAt = new Date().toISOString();
    json.reportVersion = "1.0.0";
    CACHE.set(key, { report: json, at: Date.now() });
    // Persist
    if (isSupabaseConfigured()) {
      const supabase = createServerClient()!;
      await supabase.from("progress_reports").insert({
        id: `rep_${Date.now()}`,
        learner_state_id: learnerId,
        period_start: json.period.start,
        period_end: json.period.end,
        report: json,
        learner_state_version: 1,
        report_version: "1.0.0",
        prompt_version: "1.0.0",
      });
    }
    return json;
  } catch {
    const fallback: ProgressReport = {
      period: { start: new Date(Date.now() - 30 * 86400000).toISOString(), end: new Date().toISOString() },
      headline: "Progress: Evidence-based summary unavailable — showing activity.",
      majorImprovements: [],
      persistentChallenges: [],
      milestones: [],
      confidence: 0.4,
      generatedAt: new Date().toISOString(),
      reportVersion: "1.0.0",
    };
    return fallback;
  }
}
