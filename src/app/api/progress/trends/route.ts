import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { calculateTrend } from "@/lib/progress/services/trend-service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const metric = url.searchParams.get("metric") || "overall";
  const range = url.searchParams.get("range") || "30d";
  if (!isSupabaseConfigured()) return NextResponse.json({ trend: { trend: "insufficient_data", confidence: "low", raw: [], smoothed: [] } });
  const supabase = createServerClient()!;
  const since = rangeToSince(range);
  const { data } = await supabase.from("dimension_snapshots").select("overall, dimensions, captured_at").gte("captured_at", since.toISOString()).order("captured_at", { ascending: true }).limit(100);
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
