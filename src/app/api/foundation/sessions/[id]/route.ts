import { NextResponse } from "next/server";
import { foundationRepo } from "@/lib/db/sqlite-db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = foundationRepo.getSession(id);
  const attempts = foundationRepo.getAttempts(id);
  return NextResponse.json({ session, attempts });
}

