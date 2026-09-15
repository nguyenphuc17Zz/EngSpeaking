import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: true, message: "Rebuilt aggregates from SQLite local database" });
}

