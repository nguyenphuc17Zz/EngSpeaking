import { NextResponse } from "next/server";
import { evaluationRepo } from "@/lib/db/sqlite-db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: { message: "Thiếu sessionId" } }, { status: 400 });
  const data = evaluationRepo.getBySession(sessionId);
  return NextResponse.json({ snapshot: data?.snapshot || null });
}

// For Phase 5 contract
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { sessionId } = body as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: { message: "Thiếu sessionId" } }, { status: 400 });
  const data = evaluationRepo.getBySession(sessionId);
  return NextResponse.json({ snapshot: data?.snapshot || null });
}

