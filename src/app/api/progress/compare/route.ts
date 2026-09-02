import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { comparePeriods } from "@/lib/progress/services/comparison-service";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { periodA, periodB } = body as { periodA?: { start: string; end: string }; periodB?: { start: string; end: string } };
  if (!periodA || !periodB) return NextResponse.json({ error: { message: "Thiếu periodA/periodB" } }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ status: "not_comparable", evidence: "No data" });
  const supabase = createServerClient()!;
  const { data: aData } = await supabase.from("dimension_snapshots").select("*").gte("captured_at", periodA.start).lte("captured_at", periodA.end).limit(50);
  const { data: bData } = await supabase.from("dimension_snapshots").select("*").gte("captured_at", periodB.start).lte("captured_at", periodB.end).limit(50);
  const result = comparePeriods((aData || []).map((d) => ({ capturedAt: d.captured_at, overall: d.overall, dimensions: d.dimensions })), (bData || []).map((d) => ({ capturedAt: d.captured_at, overall: d.overall, dimensions: d.dimensions })));
  return NextResponse.json(result);
}
