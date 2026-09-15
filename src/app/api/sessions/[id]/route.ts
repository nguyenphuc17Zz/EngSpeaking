import { NextResponse } from "next/server";
import { sessionRepo } from "@/lib/db/sqlite-db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = sessionRepo.get(id);
  const turns = sessionRepo.getTurns(id);
  return NextResponse.json({ session, turns });
}

