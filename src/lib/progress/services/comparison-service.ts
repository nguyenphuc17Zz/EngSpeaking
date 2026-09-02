import type { DimensionHistoryPoint } from "@/types/progress";

export function comparePeriods(a: DimensionHistoryPoint[], b: DimensionHistoryPoint[]) {
  if (!a.length || !b.length) return { status: "not_comparable" as const, evidence: "Insufficient data" };
  const avg = (pts: DimensionHistoryPoint[], key: string) => pts.reduce((s, p) => s + (p.dimensions[key] || p.overall), 0) / pts.length;
  const keys = ["fluency", "grammar", "vocabulary", "naturalness", "responseSpeed", "overall"];
  const deltas: Record<string, number> = {};
  for (const k of keys) deltas[k] = avg(b, k) - avg(a, k);
  const improved = Object.entries(deltas).filter(([, v]) => v >= 7).map(([k]) => k);
  const declined = Object.entries(deltas).filter(([, v]) => v <= -7).map(([k]) => k);
  let status: "improved" | "declined" | "stable" | "not_comparable" = "stable";
  if (improved.length > declined.length) status = "improved";
  else if (declined.length > improved.length) status = "declined";
  return { status, deltas, improved, declined, evidence: `Compared ${a.length} vs ${b.length} snapshots` };
}
