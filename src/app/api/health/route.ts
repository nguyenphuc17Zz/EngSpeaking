import { NextResponse } from "next/server";
import { getAllProviderStatuses } from "@/lib/config/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET() {
  const providers = getAllProviderStatuses();
  let db = false;
  try {
    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { error } = await supabase.from("sessions").select("id").limit(1);
        db = !error;
      }
    } else {
      db = true; // fallback local considered healthy
    }
  } catch { db = false; }

  const gemini = providers.find((p) => p.providerId === "gemini")?.configured ?? false;
  const groq = providers.find((p) => p.providerId === "groq")?.configured ?? false;

  const healthy = db;
  return NextResponse.json({
    status: healthy ? "healthy" : "degraded",
    checks: {
      database: db ? "reachable" : "unreachable",
      gemini: gemini ? "configured" : "not_configured",
      groq: groq ? "configured" : "not_configured",
      storage: "ok",
    },
    timestamp: new Date().toISOString(),
  });
}
