import { NextResponse } from "next/server";
import { generateTurnResponse } from "@/lib/conversation/services/conversation.service";
import { applyStateUpdate } from "@/lib/conversation/engines/state-manager";
import { maybeGenerateEvent } from "@/lib/conversation/engines/event-engine";
import { getAppDb } from "@/lib/db/sqlite-db";
import type { ConversationWorldState } from "@/types/conversation-world";
import { toUserMessage } from "@/lib/errors/codes";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { message: "JSON invalid" } }, { status: 400 }); }
  const { worldId, worldState, transcript, recentTurns, summaryJson, provider = "gemini", model = "auto", durationMs, timeToFirstWordMs, speechDurationMs, hintTierUsed, attemptNumber, pedagogicalConstraint } = body as {
    worldId?: string;
    worldState?: ConversationWorldState;
    transcript?: string;
    recentTurns?: Array<{ role: string; text: string }>;
    summaryJson?: string;
    provider?: string;
    model?: string;
    durationMs?: number;
    timeToFirstWordMs?: number;
    speechDurationMs?: number;
    hintTierUsed?: number;
    attemptNumber?: number;
    pedagogicalConstraint?: string;
  };

  if (!transcript || !worldState || !recentTurns) return NextResponse.json({ error: { message: "Thiếu worldState/transcript/recentTurns" } }, { status: 400 });

  try {
    // Optionally trigger event before response (if surprise logic wants)
    const possibleEvent = await maybeGenerateEvent(worldState, recentTurns, { provider, model });
    const activeEventJson = possibleEvent ? JSON.stringify(possibleEvent) : undefined;

    const aiResponse = await generateTurnResponse(worldState, transcript, recentTurns, {
      provider,
      model,
      summaryJson,
      activeEventJson,
      speechDurationMs: speechDurationMs ?? durationMs,
      hintTierUsed,
      attemptNumber,
      pedagogicalConstraint,
    });

    // Ingest turn errors into Personal Error Bank (non-fatal, aligned SB/VN/Survival/Drill)
    try {
      const { ingestTurnErrorsToBank } = await import("@/lib/conversation/normalize-turn-errors");
      ingestTurnErrorsToBank({
        pedagogy: aiResponse.pedagogy as import("@/types/conversation").TurnPedagogy | null,
        userTranscript: transcript,
        contextSentence: worldState.currentTopic || worldState.scenario.topic,
        latencyMs: timeToFirstWordMs,
        retrySucceeded: (aiResponse.pedagogy?.turnScore ?? 75) >= 70,
      });
    } catch {}

    // Apply state update deterministically
    let nextState: ConversationWorldState = applyStateUpdate(worldState, aiResponse);
    // If event triggered but not in aiResponse, attach
    if (possibleEvent && !aiResponse.event) {
      aiResponse.event = possibleEvent;
      nextState = applyStateUpdate(nextState, { responseText: aiResponse.responseText, event: possibleEvent });
    }

    // Persist turns & events to SQLite
    if (worldId) {
      try {
        const db = getAppDb();
        const userTurnId = `ct_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`;
        const aiTurnId = `ct_${Date.now() + 1}_${Math.random().toString(36).slice(2, 4)}`;

        const insertTurnStmt = db.prepare(`
          INSERT INTO conversation_turns_world (id, world_id, role, text, timestamp, duration_ms, time_to_first_word_ms, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const nowIso = new Date().toISOString();
        insertTurnStmt.run(userTurnId, worldId, "user", transcript, nowIso, durationMs ?? null, timeToFirstWordMs ?? null, nowIso);
        insertTurnStmt.run(aiTurnId, worldId, "assistant", aiResponse.responseText, nowIso, null, null, nowIso);

        db.prepare("UPDATE conversation_worlds SET scenario_blueprint = ? WHERE id = ?").run(
          JSON.stringify(nextState.scenario),
          worldId
        );
      } catch {}
    }

    return NextResponse.json({ response: aiResponse, nextWorldState: nextState });
  } catch (e: unknown) {
    return NextResponse.json({ error: { message: toUserMessage(e) } }, { status: 500 });
  }
}
