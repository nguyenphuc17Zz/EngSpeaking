import { NextResponse } from "next/server";
import { progressRepo } from "@/lib/db/sqlite-db";
import { calculateTrend } from "@/lib/progress/services/trend-service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const metric = url.searchParams.get("metric") || "overall";
  const range = url.searchParams.get("range") || "30d";
  const since = rangeToSince(range);

  const data = progressRepo.getDimensionSnapshots("default_learner", since, 100);
  const values = (data || []).map((d) => metric === "overall" ? d.overall : (d.dimensions?.[metric] ?? d.overall));
  const trend = calculateTrend(values);
  return NextResponse.json({ trend, metric, count: values.length });
}

function rangeToSince(range: string): Date {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (range === "90d") return new Date(now.getTime() - 90 * 86400000);
  if (range === "all") return new Date(0);
  return new Date(now.getTime() - 30 * 86400000);
}

