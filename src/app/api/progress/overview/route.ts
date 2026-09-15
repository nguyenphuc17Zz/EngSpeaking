import { NextResponse } from "next/server";
import { progressRepo, evaluationRepo } from "@/lib/db/sqlite-db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "30d";
  const since = rangeToSince(range);

  const evals = evaluationRepo.listSince(since, 100);
  const milestones = progressRepo.getMilestones("default_learner", 5);
  const avgScore = evals.length ? Math.round(evals.reduce((s, e) => s + (e.overall_practice_score || 0), 0) / evals.length) : 0;

  return NextResponse.json({
    overview: {
      totalSessions: evals.length,
      avgScore,
      dimensions: evals[evals.length - 1]?.dimensions || {},
      recentMilestones: milestones,
      completeness: evals.length >= 3 ? "sufficient" : "insufficient_data",
    },
    range,
  });
}

function rangeToSince(range: string): Date {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (range === "90d") return new Date(now.getTime() - 90 * 86400000);
  if (range === "all") return new Date(0);
  return new Date(now.getTime() - 30 * 86400000);
}

