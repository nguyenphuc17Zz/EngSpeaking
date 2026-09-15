import { NextResponse } from "next/server";
import { foundationRepo } from "@/lib/db/sqlite-db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const completed_at = new Date().toISOString();
  foundationRepo.completeSession(id, completed_at);
  const session = foundationRepo.getSession(id);
  return NextResponse.json({ session: session || { id, status: "completed", completed_at } });
}

