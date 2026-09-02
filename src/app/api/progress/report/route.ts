import { NextResponse } from "next/server";
import { generateReport } from "@/lib/progress/services/report-service";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  const { period = "30d", learnerId = "default" } = body as { period?: "7d" | "30d" | "90d"; learnerId?: string };
  const report = await generateReport(period, learnerId);
  return NextResponse.json({ report });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") as "7d" | "30d" | "90d") || "30d";
  const learnerId = url.searchParams.get("learnerId") || "default";
  const report = await generateReport(period, learnerId);
  return NextResponse.json({ report });
}
