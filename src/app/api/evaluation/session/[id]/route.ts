import { NextResponse } from "next/server";
import { evaluationRepo } from "@/lib/db/sqlite-db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = evaluationRepo.get(id);
  if (!data) return NextResponse.json({ evaluation: null });
  return NextResponse.json({ evaluation: data.evaluation, snapshot: data.snapshot, turns: [], issues: [] });
}

