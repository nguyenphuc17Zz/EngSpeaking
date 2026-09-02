import { NextRequest, NextResponse } from "next/server";
import { getMasterErrorBank, getCompactErrorContextPack } from "@/lib/foundation/error-bank/error-bank.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const query = searchParams.get("query")?.toLowerCase();

    let records = getMasterErrorBank();

    if (category && category !== "all") {
      records = records.filter((r) => r.category === category);
    }

    if (status && status !== "all") {
      records = records.filter((r) => r.status === status);
    }

    if (query) {
      records = records.filter(
        (r) =>
          r.labelVi.toLowerCase().includes(query) ||
          r.canonicalName.toLowerCase().includes(query) ||
          r.patternKey.toLowerCase().includes(query)
      );
    }

    const contextPack = getCompactErrorContextPack();

    return NextResponse.json({
      success: true,
      records,
      totalCount: records.length,
      contextPack,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch error bank records",
      },
      { status: 500 }
    );
  }
}
