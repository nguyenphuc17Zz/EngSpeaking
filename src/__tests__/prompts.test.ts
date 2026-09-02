import { describe, it, expect } from "vitest";
import { CONVERSATION_SYSTEM_PROMPT_V1, truncateHistory, OPENING_PROMPT_INSTRUCTION } from "@/lib/ai/prompts/conversation";

describe("Prompt management §18 §19 §34", () => {
  it("system prompt is concise and asks one question", () => {
    expect(CONVERSATION_SYSTEM_PROMPT_V1).toContain("1-4 sentences");
    expect(CONVERSATION_SYSTEM_PROMPT_V1).toContain("one question");
  });

  it("opening prompt instruction present", () => {
    expect(OPENING_PROMPT_INSTRUCTION.length).toBeGreaterThan(10);
  });

  it("truncate keeps system + last N", () => {
    const turns = [
      { role: "system" as const, content: "sys" },
      ...Array.from({ length: 20 }, (_, i) => ({ role: "user" as const, content: `msg ${i}` })),
    ];
    const truncated = truncateHistory(turns, 12);
    expect(truncated.length).toBe(12);
    expect(truncated[0].role).toBe("system");
    expect(truncated[truncated.length - 1].content).toBe("msg 19");
  });
});
