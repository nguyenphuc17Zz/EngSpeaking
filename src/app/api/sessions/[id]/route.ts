import { NextResponse } from "next/server";
import { sessionRepo } from "@/lib/db/sqlite-db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = sessionRepo.get(id);
  if (!session) {
    return NextResponse.json(
      { error: { code: "SESSION_NOT_FOUND", message: "Không tìm thấy phiên hội thoại" } },
      { status: 404 }
    );
  }
  const turns = sessionRepo.getTurns(id);
  return NextResponse.json({ session, turns });
}

