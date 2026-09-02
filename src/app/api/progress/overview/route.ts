import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "30d";
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ overview: { totalSessions: 0, avgScore: 0, dimensions: {}, recentMilestones: [], completeness: "insufficient_data" }, range });
  }
  const supabase = createServerClient()!;
  const since = rangeToSince(range);
  const { data: evals } = await supabase.from("speaking_evaluations").select("overall_practice_score, dimensions, generated_at").gte("generated_at", since.toISOString()).order("generated_at", { ascending: true }).limit(100);
  const { data: milestones } = await supabase.from("learning_milestones").select("*").gte("achieved_at", since.toISOString()).order("achieved_at", { ascending: false }).limit(5);
  const avgScore = evals?.length ? Math.round(evals.reduce((s, e) => s + (e.overall_practice_score || 0), 0) / evals.length) : 0;
  return NextResponse.json({ overview: { totalSessions: evals?.length || 0, avgScore, dimensions: evals?.[evals.length - 1]?.dimensions || {}, recentMilestones: milestones || [] }, range });
}

function rangeToSince(range: string): Date {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (range === "90d") return new Date(now.getTime() - 90 * 86400000);
  if (range === "all") return new Date(0);
  return new Date(now.getTime() - 30 * 86400000);
}
