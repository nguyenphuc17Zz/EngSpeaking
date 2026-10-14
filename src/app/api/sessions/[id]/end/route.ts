import { NextResponse } from "next/server";
import { sessionRepo } from "@/lib/db/sqlite-db";
import { logger } from "@/lib/logger";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = sessionRepo.get(id);
  if (!existing) {
    return NextResponse.json(
      { error: { code: "SESSION_NOT_FOUND", message: "Không tìm thấy phiên hội thoại" } },
      { status: 404 }
    );
  }
  const ended_at = new Date().toISOString();
  sessionRepo.updateStatus(id, "completed", ended_at);
  const session = sessionRepo.get(id);
  logger.sessionEnded({ id });
  return NextResponse.json({ session: session || { ...existing, ended_at, status: "completed" } });
}

