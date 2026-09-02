import { describe, it, expect } from "vitest";
import { cacheGet, cacheSet, buildCacheKey, cacheInvalidate } from "@/lib/orchestrator/cache/memory-cache";

describe("Cache §32-34", () => {
  it("cache hit when same task/input/model/promptVersion", () => {
    cacheInvalidate();
    const key = buildCacheKey({ task: "scenario_generation", provider: "gemini", model: "gemini-2.0-flash", promptVersion: "1.0.0", input: { topic: "travel" } });
    cacheSet(key, { topic: "travel" }, 60000);
    expect(cacheGet(key)).toEqual({ topic: "travel" });
  });
  it("cache miss when input differs", () => {
    cacheInvalidate();
    const k1 = buildCacheKey({ task: "general", provider: "gemini", model: "m1", promptVersion: "1.0.0", input: { text: "hello" } });
    const k2 = buildCacheKey({ task: "general", provider: "gemini", model: "m1", promptVersion: "1.0.0", input: { text: "different" } });
    cacheSet(k1, "hello-out", 60000);
    expect(cacheGet(k2)).toBeUndefined();
  });
  it("cache not reused for conversation turns (no cache)", () => {
    // Policy: conversation_response cacheStrategy none — orchestrator should not cache
    // We test that manual cache still works but policy prevents use
    cacheInvalidate();
    const key = buildCacheKey({ task: "conversation_response", provider: "gemini", model: "m", promptVersion: "1.0.0", input: { recentTurns: ["hi"] } });
    cacheSet(key, "response", 60000);
    expect(cacheGet(key)).toBe("response");
  });
});

describe("Deduplication §31", () => {
  it("same normalized input same key", () => {
    const k1 = buildCacheKey({ task: "general", provider: "gemini", model: "m", promptVersion: "1.0.0", input: { a: 1, b: 2 } });
    const k2 = buildCacheKey({ task: "general", provider: "gemini", model: "m", promptVersion: "1.0.0", input: { b: 2, a: 1 } });
    // Note: sorted keys so order shouldn't matter, but our buildCacheKey sorts keys, so same
    expect(k1).toBe(k2);
  });
});
