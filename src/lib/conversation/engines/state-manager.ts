import type { ConversationWorldState, ConversationFact, DynamicEvent, ConversationAIResponse } from "@/types/conversation-world";

export function applyStateUpdate(
  state: ConversationWorldState,
  aiResponse: ConversationAIResponse
): ConversationWorldState {
  let next = { ...state, turnCount: state.turnCount + 1, activeEvents: [...state.activeEvents] };
  const upd = aiResponse.stateUpdate;
  if (!upd) {
    if (aiResponse.event) next.activeEvents = [...next.activeEvents, aiResponse.event].slice(-5);
    return next;
  }
  if (upd.currentTopic) next.currentTopic = upd.currentTopic;
  if (upd.newFacts?.length) {
    const newFacts: ConversationFact[] = upd.newFacts.map((f) => ({ id: f.id || `fact_${Date.now()}`, fact: f.fact, createdAt: f.createdAt || new Date().toISOString() }));
    // Deduplicate by fact text
    const existing = new Set(next.conversationFacts.map((f) => f.fact.toLowerCase()));
    for (const f of newFacts) if (!existing.has(f.fact.toLowerCase())) next.conversationFacts.push(f);
    if (next.conversationFacts.length > 20) next.conversationFacts = next.conversationFacts.slice(-20);
  }
  if (upd.newThreads?.length) {
    const set = new Set(next.unresolvedThreads);
    for (const t of upd.newThreads) if (!set.has(t)) next.unresolvedThreads.push(t);
  }
  if (upd.resolvedThreads?.length) {
    const toResolve = new Set(upd.resolvedThreads);
    next.unresolvedThreads = next.unresolvedThreads.filter((t) => !toResolve.has(t));
    next.resolvedThreads = [...(next.resolvedThreads || []), ...upd.resolvedThreads].slice(-20);
  }
  if (aiResponse.event) next.activeEvents.push(aiResponse.event);
  // Character state deltas
  next.activeCharacter = { ...next.activeCharacter };
  if (aiResponse.pragmaticAct) {
    next.activeCharacter.dominantAct = aiResponse.pragmaticAct;
  }
  if (upd.moodChange) {
    next.activeCharacter.mood =
      upd.moodChange > 0 ? "positive" : upd.moodChange < 0 ? "slightly impatient" : next.activeCharacter.mood;
  }
  if (upd.trustChange !== undefined) {
    next.activeCharacter.trust = Math.max(0, Math.min(100, next.activeCharacter.trust + upd.trustChange));
  }
  if (upd.patienceChange !== undefined) {
    next.activeCharacter.patience = Math.max(0, Math.min(100, next.activeCharacter.patience + upd.patienceChange));
  }
  if (upd.engagementChange !== undefined) {
    next.activeCharacter.engagement = Math.max(
      0,
      Math.min(100, next.activeCharacter.engagement + upd.engagementChange)
    );
  }
  if (upd.defensivenessChange !== undefined) {
    const prevDef = next.activeCharacter.defensiveness ?? 40;
    next.activeCharacter.defensiveness = Math.max(0, Math.min(100, prevDef + upd.defensivenessChange));
  }
  if (upd.emotionalValenceChange !== undefined) {
    const prevVal = next.activeCharacter.emotionalValence ?? 0.0;
    next.activeCharacter.emotionalValence = Math.max(
      -1.0,
      Math.min(1.0, Math.round((prevVal + upd.emotionalValenceChange) * 100) / 100)
    );
  }

  // Handle unlocked objective
  const unlocked = upd.unlockedObjective || aiResponse.unlockedObjective;
  if (unlocked && next.scenario.speakingObjectives) {
    next.scenario = {
      ...next.scenario,
      speakingObjectives: next.scenario.speakingObjectives.map((obj) =>
        obj.type === unlocked.type || obj.description === unlocked.description
          ? { ...obj, isUnlocked: true, unlockedAtTurn: next.turnCount }
          : obj
      ),
    };
  }

  return next;
}

export function addFact(state: ConversationWorldState, fact: string): ConversationWorldState {
  const f: ConversationFact = { id: `fact_${Date.now()}`, fact, createdAt: new Date().toISOString() };
  return { ...state, conversationFacts: [...state.conversationFacts, f].slice(-20) };
}
