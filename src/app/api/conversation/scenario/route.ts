import { NextResponse } from "next/server";
import { generateScenario, scenarioFingerprint } from "@/lib/conversation/services/scenario.service";
import { conversationSettingsSchema } from "@/lib/validation/conversation-schemas";
import { getAppDb } from "@/lib/db/sqlite-db";
import { toUserMessage } from "@/lib/errors/codes";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const settingsParsed = conversationSettingsSchema.safeParse((body as Record<string, unknown>).settings || body);
  // Allow raw settings or {settings, provider, model}
  const raw = body as { settings?: unknown; provider?: string; model?: string };
  const settings = settingsParsed.success ? settingsParsed.data : (raw.settings as import("@/types/conversation-world").ConversationSettings);
  if (!settings || !settingsParsed.success) {
    return NextResponse.json({ error: { message: "Invalid settings", details: settingsParsed.success ? undefined : settingsParsed.error.flatten() } }, { status: 400 });
  }
  const provider = raw.provider || "gemini";
  const model = raw.model || "auto";

  try {
    const blueprint = await generateScenario(settings as import("@/types/conversation-world").ConversationSettings, { provider, model });
    const fingerprint = scenarioFingerprint(blueprint);

    // Duplicate avoidance check & persist via SQLite
    try {
      const db = getAppDb();
      const existing = db.prepare("SELECT id FROM conversation_worlds WHERE fingerprint = ? LIMIT 1").get(fingerprint);
      if (existing) {
        const retry = await generateScenario({ ...(settings as import("@/types/conversation-world").ConversationSettings), topic: `${(settings as import("@/types/conversation-world").ConversationSettings).topic || "auto"} variation ${Date.now() % 1000}` }, { provider, model });
        const retryFp = scenarioFingerprint(retry);
        db.prepare(`
          INSERT INTO conversation_worlds (id, mode, scenario_blueprint, settings, fingerprint, schema_version, created_at)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `).run(retry.id, retry.mode, JSON.stringify(retry), JSON.stringify(settings), retryFp, new Date().toISOString());
        return NextResponse.json({ scenario: retry, worldId: retry.id, fingerprint: retryFp, duplicate: false });
      }

      db.prepare(`
        INSERT INTO conversation_worlds (id, mode, scenario_blueprint, settings, fingerprint, schema_version, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(blueprint.id, blueprint.mode, JSON.stringify(blueprint), JSON.stringify(settings), fingerprint, new Date().toISOString());
    } catch {}

    return NextResponse.json({ scenario: blueprint, worldId: blueprint.id, fingerprint, duplicate: false });
  } catch (e: unknown) {
    return NextResponse.json({ error: { message: toUserMessage(e) } }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
  const db = getAppDb();
  const worlds = db.prepare("SELECT * FROM conversation_worlds ORDER BY created_at DESC LIMIT ?").all(limit);
  return NextResponse.json({ worlds: worlds || [] });
}

