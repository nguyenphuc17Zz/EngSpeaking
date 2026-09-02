import { NextResponse } from "next/server";
import { getTelemetry } from "@/lib/orchestrator/telemetry";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);
  const logs = getTelemetry(limit);
  return NextResponse.json({ logs });
}
