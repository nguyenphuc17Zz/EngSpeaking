import { NextRequest, NextResponse } from "next/server";
import { generateSpokenDiagnosticReport } from "@/lib/foundation/error-bank/diagnostic.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { records = [], provider, model } = body;

    const report = await generateSpokenDiagnosticReport({
      records,
      provider,
      model,
    });

    return NextResponse.json({ success: true, report });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate diagnostic report",
      },
      { status: 500 }
    );
  }
}
