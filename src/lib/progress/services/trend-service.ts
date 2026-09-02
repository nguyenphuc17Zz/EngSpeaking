import type { TrendResult } from "@/types/progress";

export function movingAverage(values: number[], window = 3): number[] {
  if (values.length < window) return values;
  const res: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    res.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return res;
}

export function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
}

export function calculateSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - xMean) * (values[i] - yMean); den += (i - xMean) ** 2; }
  return den === 0 ? 0 : num / den;
}

export function calculateTrend(values: number[], timestamps?: string[]): TrendResult {
  const raw = values;
  const smoothed = movingAverage(raw, 3);
  const variance = calculateVariance(raw);
  const slope = calculateSlope(smoothed.length ? smoothed : raw);
  let trend: TrendResult["trend"] = "insufficient_data";
  let confidence: TrendResult["confidence"] = "low";

  if (raw.length < 2) { trend = "insufficient_data"; confidence = "low"; }
  else if (raw.length < 3) {
    trend = slope > 0.5 ? "improving" : slope < -0.5 ? "declining" : "stable";
    confidence = "low";
  } else {
    if (slope > 1.5) trend = "strongly_improving";
    else if (slope > 0.5) trend = "improving";
    else if (slope < -1.5) trend = "declining";
    else if (slope < -0.5) trend = "declining";
    else {
      // check plateau: variance low and slope near 0
      if (variance < 4 && Math.abs(slope) < 0.3) trend = "plateau";
      else if (variance > 40) trend = "volatile";
      else trend = "stable";
    }
    confidence = raw.length >= 6 ? "high" : raw.length >= 4 ? "medium" : "low";
  }

  return { trend, confidence, slope, variance, smoothed, raw };
}

export function detectPlateau(values: number[]): boolean {
  return calculateTrend(values).trend === "plateau";
}
export function detectBreakthrough(values: number[]): boolean {
  if (values.length < 4) return false;
  const last = values[values.length - 1];
  const prevAvg = values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1);
  return last - prevAvg > 15;
}
export function detectDecline(values: number[]): boolean {
  return calculateTrend(values).trend === "declining";
}
