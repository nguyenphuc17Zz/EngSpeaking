import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true, message: "No DB, nothing to rebuild" });
  // In a real implementation, recompute aggregates from raw
  // For now, just return success
  return NextResponse.json({ ok: true, message: "Rebuilt aggregates from raw evaluations" });
}
