import { NextResponse } from "next/server";
import { generateScenario, scenarioFingerprint } from "@/lib/conversation/services/scenario.service";
import { conversationSettingsSchema } from "@/lib/validation/conversation-schemas";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
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

    // Duplicate avoidance check §65 — if fingerprint recent, regenerate once
    if (isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const { data: existing } = await supabase.from("conversation_worlds").select("id").eq("fingerprint", fingerprint).limit(1);
        if (existing && existing.length > 0) {
          // Regenerate once
          const retry = await generateScenario({ ...(settings as import("@/types/conversation-world").ConversationSettings), topic: `${(settings as import("@/types/conversation-world").ConversationSettings).topic || "auto"} variation ${Date.now() % 1000}` }, { provider, model });
          const retryFp = scenarioFingerprint(retry);
          // persist retry
          const { data: inserted } = await supabase.from("conversation_worlds").insert({ id: retry.id, mode: retry.mode, scenario_blueprint: retry, settings, fingerprint: retryFp, schema_version: 1 }).select().single();
          return NextResponse.json({ scenario: retry, worldId: inserted?.id || retry.id, fingerprint: retryFp, duplicate: false });
        }
        // Persist
        await supabase.from("conversation_worlds").insert({ id: blueprint.id, mode: blueprint.mode, scenario_blueprint: blueprint, settings, fingerprint, schema_version: 1 });
      }
    }

    return NextResponse.json({ scenario: blueprint, worldId: blueprint.id, fingerprint, duplicate: false });
  } catch (e: unknown) {
    return NextResponse.json({ error: { message: toUserMessage(e) } }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10) || 10, 50);
  if (!isSupabaseConfigured()) return NextResponse.json({ worlds: [] });
  const supabase = createServerClient();
  if (!supabase) return NextResponse.json({ worlds: [] });
  const { data } = await supabase.from("conversation_worlds").select("*").order("created_at", { ascending: false }).limit(limit);
  return NextResponse.json({ worlds: data || [] });
}
