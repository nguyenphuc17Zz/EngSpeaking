import { NextResponse } from "next/server";
import { healthRepo, getAppDb } from "@/lib/db/sqlite-db";

export async function DELETE() {
  try {
    const db = getAppDb();
    db.prepare("DELETE FROM conversation_turns").run();
    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM foundation_attempts").run();
    db.prepare("DELETE FROM foundation_sessions").run();
    healthRepo.resetUserData("default_learner");
    return NextResponse.json({ ok: true, message: "Đã xóa toàn bộ dữ liệu SQLite cục bộ" });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Privacy center: use DELETE to remove data", retention: "Audio: memory only, xóa sau transcribe. Transcript & Analytics: lưu trữ cục bộ tại data/app.db." });
}

