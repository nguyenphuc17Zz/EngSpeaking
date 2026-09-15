import { NextResponse } from "next/server";
import { getTelemetry, getUsageStats } from "@/lib/orchestrator/telemetry";
import { telemetryRepo } from "@/lib/db/sqlite-db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);
  const stats = getUsageStats();
  const recent = getTelemetry(limit);
  const dbUsage = telemetryRepo.getAiUsageStats(limit);

  return NextResponse.json({ stats, recent, dbUsage });
}

