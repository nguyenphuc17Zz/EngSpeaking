import { NextResponse } from "next/server";
import { getAppDb } from "@/lib/db/sqlite-db";

// Aggregates foundation_attempts for history
export async function GET(req: Request) {
  const url = new URL(req.url);
  const skill = url.searchParams.get("skill");
  const db = getAppDb();

  let attempts: any[] = [];
  if (skill) {
    attempts = db.prepare(`
      SELECT fa.* FROM foundation_attempts fa
      JOIN foundation_sessions fs ON fa.session_id = fs.id
      WHERE fs.skill = ?
      ORDER BY fa.created_at DESC LIMIT 50
    `).all(skill) as any[];
  } else {
    attempts = db.prepare(`
      SELECT * FROM foundation_attempts
      ORDER BY created_at DESC LIMIT 50
    `).all() as any[];
  }

  return NextResponse.json({ history: attempts });
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { skill, overall, translationDependency } = body as { skill?: string; overall?: number; translationDependency?: number };
  return NextResponse.json({ ok: true, skill, overall, translationDependency });
}

