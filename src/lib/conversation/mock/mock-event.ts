// Mock event helper
import type { DynamicEvent } from "@/types/conversation-world";
export function mockEvent(): DynamicEvent {
  const types = ["misunderstanding","new_information","change_of_plan","unexpected_question"] as const;
  const t = types[Math.floor(Math.random() * types.length)];
  return { id: `mock_ev_${Date.now()}`, type: t, effect: `Mock event: ${t} occurred`, probability: 0.3, priority: 2 };
}
