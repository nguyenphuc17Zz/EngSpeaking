import { NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, message: "Đã xóa local data (không có DB)" });
  }
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });
  try {
    // Delete in order due to FK cascade, but we do explicit deletes for clarity
    await supabase.from("conversation_turns").delete().neq("id", "");
    await supabase.from("sessions").delete().neq("id", "");
    await supabase.from("speaking_evaluations").delete().neq("id", "");
    await supabase.from("dimension_snapshots").delete().neq("id", "");
    await supabase.from("skill_history").delete().neq("id", "");
    await supabase.from("learning_milestones").delete().neq("id", "");
    return NextResponse.json({ ok: true, message: "Đã xóa tất cả dữ liệu" });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Privacy center: use DELETE to remove data", retention: "Audio: memory only, xóa sau transcribe. Transcript: 90 ngày. Analytics: tổng hợp." });
}
