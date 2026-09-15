import { NextResponse } from "next/server";
import { progressRepo } from "@/lib/db/sqlite-db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);
  const history = progressRepo.getDimensionSnapshots("default_learner", undefined, limit);
  return NextResponse.json({ history });
}

