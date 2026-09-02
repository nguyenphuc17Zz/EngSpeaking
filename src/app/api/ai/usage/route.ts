import { NextResponse } from "next/server";
import { getTelemetry, getUsageStats } from "@/lib/orchestrator/telemetry";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);
  const stats = getUsageStats();
  const recent = getTelemetry(limit);

  // Also try DB if configured
  let dbUsage: unknown[] = [];
  if (isSupabaseConfigured()) {
    const supabase = createServerClient();
    if (supabase) {
      const { data } = await supabase.from("ai_requests").select("*").order("created_at", { ascending: false }).limit(limit);
      dbUsage = data || [];
    }
  }

  return NextResponse.json({ stats, recent, dbUsage });
}
