import { NextResponse } from "next/server";
import { evaluationRepo } from "@/lib/db/sqlite-db";

export async function GET() {
  const data = evaluationRepo.getLatest();
  if (!data) return NextResponse.json({ evaluation: null });
  return NextResponse.json({ evaluation: data.evaluation, snapshot: data.snapshot });
}

