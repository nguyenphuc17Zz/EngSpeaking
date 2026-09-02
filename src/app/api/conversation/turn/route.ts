import { NextResponse } from "next/server";
import { generateTurnResponse } from "@/lib/conversation/services/conversation.service";
import { applyStateUpdate } from "@/lib/conversation/engines/state-manager";
import { maybeGenerateEvent } from "@/lib/conversation/engines/event-engine";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ConversationWorldState } from "@/types/conversation-world";
import { toUserMessage } from "@/lib/errors/codes";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { worldId, worldState, transcript, recentTurns, summaryJson, provider = "gemini", model = "auto", durationMs, timeToFirstWordMs } = body as {
    worldId?: string;
    worldState?: ConversationWorldState;
    transcript?: string;
    recentTurns?: Array<{ role: string; text: string }>;
    summaryJson?: string;
    provider?: string;
    model?: string;
    durationMs?: number;
    timeToFirstWordMs?: number;
  };

  if (!transcript || !worldState || !recentTurns) return NextResponse.json({ error: { message: "Thiếu worldState/transcript/recentTurns" } }, { status: 400 });

  try {
    // Optionally trigger event before response (if surprise logic wants)
    const possibleEvent = await maybeGenerateEvent(worldState, recentTurns, { provider, model });
    const activeEventJson = possibleEvent ? JSON.stringify(possibleEvent) : undefined;

    const aiResponse = await generateTurnResponse(worldState, transcript, recentTurns, { provider, model, summaryJson, activeEventJson });

    // Apply state update deterministically
    let nextState: ConversationWorldState = applyStateUpdate(worldState, aiResponse);
    // If event triggered but not in aiResponse, attach
    if (possibleEvent && !aiResponse.event) {
      aiResponse.event = possibleEvent;
      nextState = applyStateUpdate(nextState, { responseText: aiResponse.responseText, event: possibleEvent });
    }

    // Persist turns & events if Supabase
    if (worldId && isSupabaseConfigured()) {
      const supabase = createServerClient();
      if (supabase) {
        const userTurnId = `ct_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`;
        const aiTurnId = `ct_${Date.now() + 1}_${Math.random().toString(36).slice(2, 4)}`;
        try {
          await supabase.from("conversation_turns_world").insert([
            { id: userTurnId, world_id: worldId, role: "user", text: transcript, duration_ms: durationMs ?? null, time_to_first_word_ms: timeToFirstWordMs ?? null },
            { id: aiTurnId, world_id: worldId, role: "assistant", text: aiResponse.responseText },
          ]);
          if (aiResponse.stateUpdate?.newFacts?.length) {
            await supabase.from("conversation_facts").insert(aiResponse.stateUpdate.newFacts.map((f) => ({ id: f.id, world_id: worldId, fact: f.fact })));
          }
          if (aiResponse.event) {
            await supabase.from("conversation_events").insert({ id: aiResponse.event.id, world_id: worldId, type: aiResponse.event.type, effect: aiResponse.event.effect, turn_index: nextState.turnCount });
          }
          await supabase.from("conversation_worlds").update({ scenario_blueprint: nextState.scenario }).eq("id", worldId);
        } catch {}
      }
    }

    return NextResponse.json({ response: aiResponse, nextWorldState: nextState });
  } catch (e: unknown) {
    return NextResponse.json({ error: { message: toUserMessage(e) } }, { status: 500 });
  }
}
