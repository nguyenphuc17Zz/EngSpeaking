import { NextResponse } from "next/server";
import { healthRepo } from "@/lib/db/sqlite-db";

export async function DELETE() {
  try {
    healthRepo.resetUserData();
    return NextResponse.json({ ok: true, message: "Đã xóa toàn bộ dữ liệu SQLite cục bộ" });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Privacy center: use DELETE to remove data", retention: "Audio: memory only, xóa sau transcribe. Transcript & Analytics: lưu trữ cục bộ tại data/app.db." });
}

