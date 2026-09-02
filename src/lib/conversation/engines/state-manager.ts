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
  if (upd.moodChange) next.activeCharacter.mood = upd.moodChange > 0 ? "positive" : upd.moodChange < 0 ? "slightly impatient" : next.activeCharacter.mood;
  if (upd.trustChange) next.activeCharacter.trust = Math.max(0, Math.min(100, next.activeCharacter.trust + upd.trustChange));
  if (upd.patienceChange) next.activeCharacter.patience = Math.max(0, Math.min(100, next.activeCharacter.patience + upd.patienceChange));
  if (upd.engagementChange) next.activeCharacter.engagement = Math.max(0, Math.min(100, next.activeCharacter.engagement + upd.engagementChange));
  // Also apply trustChange as engagement for now
  return next;
}

export function addFact(state: ConversationWorldState, fact: string): ConversationWorldState {
  const f: ConversationFact = { id: `fact_${Date.now()}`, fact, createdAt: new Date().toISOString() };
  return { ...state, conversationFacts: [...state.conversationFacts, f].slice(-20) };
}
