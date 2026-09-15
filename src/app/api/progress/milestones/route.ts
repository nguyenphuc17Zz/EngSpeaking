import { NextResponse } from "next/server";
import { progressRepo } from "@/lib/db/sqlite-db";

export async function GET() {
  const milestones = progressRepo.getMilestones("default_learner", 100);
  return NextResponse.json({ milestones });
}

