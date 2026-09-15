import { NextResponse } from "next/server";
import { sessionRepo } from "@/lib/db/sqlite-db";
import { logger } from "@/lib/logger";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ended_at = new Date().toISOString();
  sessionRepo.updateStatus(id, "completed", ended_at);
  const session = sessionRepo.get(id);
  logger.sessionEnded({ id });
  return NextResponse.json({ session: session || { id, ended_at, status: "completed" } });
}

