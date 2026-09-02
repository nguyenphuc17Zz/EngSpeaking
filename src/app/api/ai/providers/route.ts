import { NextResponse } from "next/server";
import { getAllProviderStatuses } from "@/lib/config/server";
import { CATALOG } from "@/lib/ai/models/catalog";

export async function GET() {
  const statuses = getAllProviderStatuses();
  // Include browser/mock as client-side always available
  const providers = [
    ...statuses.map((s) => ({
      id: s.providerId,
      displayName: s.providerId === "gemini" ? "Google Gemini" : "Groq",
      configured: s.configured,
      // Do NOT expose keys
    })),
    { id: "browser", displayName: "Browser (Web Speech / speechSynthesis)", configured: true },
    { id: "mock", displayName: "Mock (Dev/Test)", configured: process.env.MOCK_AI === "true" || process.env.NODE_ENV !== "production" },
  ];
  // Also expose model counts
  const modelsPerProvider = providers.map((p) => ({
    ...p,
    modelCount: CATALOG.filter((m) => m.providerId === p.id && m.active).length,
  }));
  return NextResponse.json({ providers: modelsPerProvider });
}
