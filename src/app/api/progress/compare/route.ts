import { NextResponse } from "next/server";
import { getAppDb } from "@/lib/db/sqlite-db";
import { comparePeriods } from "@/lib/progress/services/comparison-service";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { periodA, periodB } = body as { periodA?: { start: string; end: string }; periodB?: { start: string; end: string } };
  if (!periodA || !periodB) return NextResponse.json({ error: { message: "Thiếu periodA/periodB" } }, { status: 400 });

  const db = getAppDb();
  const aData = db.prepare("SELECT * FROM dimension_snapshots WHERE captured_at >= ? AND captured_at <= ? LIMIT 50").all(periodA.start, periodA.end) as any[];
  const bData = db.prepare("SELECT * FROM dimension_snapshots WHERE captured_at >= ? AND captured_at <= ? LIMIT 50").all(periodB.start, periodB.end) as any[];

  const result = comparePeriods(
    (aData || []).map((d) => ({ capturedAt: d.captured_at, overall: d.overall, dimensions: typeof d.dimensions === "string" ? JSON.parse(d.dimensions) : d.dimensions })),
    (bData || []).map((d) => ({ capturedAt: d.captured_at, overall: d.overall, dimensions: typeof d.dimensions === "string" ? JSON.parse(d.dimensions) : d.dimensions }))
  );
  return NextResponse.json(result);
}

