import { NextResponse } from "next/server";
import { getAllProviderStatuses } from "@/lib/config/server";
import { healthRepo } from "@/lib/db/sqlite-db";

export async function GET() {
  const providers = getAllProviderStatuses();
  const dbHealth = healthRepo.checkHealth();
  const db = dbHealth.status === "ok";

  const gemini = providers.find((p) => p.providerId === "gemini")?.configured ?? false;
  const groq = providers.find((p) => p.providerId === "groq")?.configured ?? false;

  const healthy = db;
  return NextResponse.json({
    status: healthy ? "healthy" : "degraded",
    checks: {
      database: db ? "reachable" : "unreachable",
      database_type: "sqlite_local",
      database_tables: dbHealth.tablesCount,
      gemini: gemini ? "configured" : "not_configured",
      groq: groq ? "configured" : "not_configured",
      storage: "ok",
    },
    timestamp: new Date().toISOString(),
  });
}

