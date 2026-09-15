import { NextResponse } from "next/server";
import { evaluationRepo } from "@/lib/db/sqlite-db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);
  const evaluations = evaluationRepo.list(limit);
  return NextResponse.json({ evaluations });
}

