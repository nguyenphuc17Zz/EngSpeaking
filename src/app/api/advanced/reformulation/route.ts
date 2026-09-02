import { NextResponse } from "next/server";
import { generateTextWithRouting } from "@/lib/ai";
import { REFORMULATION_SYSTEM } from "@/lib/advanced/prompts/reformulation";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { text, provider = "gemini", model = "auto" } = body as { text?: string; provider?: string; model?: string };
  if (!text || !text.trim()) return NextResponse.json({ error: { message: "Thiếu text" } }, { status: 400 });
  if (provider === "mock") {
    return NextResponse.json({ alternative: text.trim() + " (more natural: really like this)", explanation: "Use really instead of very with like" });
  }
  try {
    const res = await generateTextWithRouting({
      provider, model,
      input: {
        messages: [{ role: "user", content: `Sentence: "${text}"` }],
        systemInstruction: REFORMULATION_SYSTEM,
        temperature: 0.5, maxOutputTokens: 300,
      },
    });
    const txt = res.text.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"");
    let json: { alternative?: string; explanation?: string } | null = null;
    try { json = JSON.parse(txt); } catch { const m = txt.match(/\{[\s\S]*\}/); if (m) try { json = JSON.parse(m[0]); } catch {} if (!json) json = { alternative: txt.slice(0,200), explanation: "" }; }
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ alternative: text, explanation: "" });
  }
}
