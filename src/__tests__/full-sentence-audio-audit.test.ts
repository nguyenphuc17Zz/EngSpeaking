import { describe, it, expect } from "vitest";
import { generateLatencyTask } from "@/lib/foundation/latency/task-generator.service";
import { generateSingleChunkTask, generateChunkChainTask } from "@/lib/foundation/chunks/chunk-generator.service";

describe("Full Sentence Model Audio Audit — Regression Tests", () => {
  it("Latency tasks generated should have clean Tier 4 complete sentences without prefixes", async () => {
    const task = await generateLatencyTask({
      drillMode: "open_response",
      provider: "mock",
    });

    expect(task).toBeDefined();
    expect(task.sampleResponses?.length).toBeGreaterThan(0);

    // Tier 4 hint should be a complete sentence and not contain 'Câu mẫu' prefix
    const tier4 = task.hints?.find((h) => h.tier === 4);
    expect(tier4).toBeDefined();
    expect(tier4?.content).not.toMatch(/^(câu mẫu hoàn chỉnh|câu trả lời mẫu|câu mẫu):\s*/i);
    expect(tier4?.content).not.toContain("______");
    expect(tier4?.content.split(/\s+/).length).toBeGreaterThanOrEqual(3);

    // Tier 3 hint is the scaffold with blanks, but Tier 4 is completed
    const tier3 = task.hints?.find((h) => h.tier === 3);
    expect(tier3).toBeDefined();
    expect(tier3?.content).toContain("______");
  });

  it("Chunk automaticity tasks should provide complete sentences without raw prefixes", async () => {
    const chunkMock = {
      familyKey: "test_chunk",
      canonicalChunk: "at the end of the day",
      meaningVi: "suy cho cùng",
      category: "discourse_markers" as const,
      frequencyRank: 1,
      variants: [{ expression: "when all is said and done", formalityLevel: "informal" as const, nuanceVi: "khi tất cả đã xong" }],
      exampleSentences: ["At the end of the day, health is what matters most."],
    };

    const task = await generateSingleChunkTask({
      chunk: chunkMock as any,
      stage: "contextual_use",
      provider: "mock",
    });
    expect(task).toBeDefined();
    expect(task.chunk.canonicalChunk).toBe("at the end of the day");

    const tier4 = task.hints?.find((h) => h.tier === 4);
    expect(tier4).toBeDefined();
    expect(tier4?.content).not.toMatch(/^(câu mẫu hoàn chỉnh|câu mẫu):\s*/i);
    expect(tier4?.content).not.toContain("______");
    expect(tier4?.content.split(/\s+/).length).toBeGreaterThanOrEqual(4);
  });

  it("Chunk chain task should provide full combined speech example without prefixes", async () => {
    const chainTask = await generateChunkChainTask({ provider: "mock" });
    expect(chainTask).toBeDefined();
    expect(chainTask.expectedAssemblyExample).toBeDefined();
    expect(chainTask.expectedAssemblyExample.split(/\s+/).length).toBeGreaterThanOrEqual(6);
    expect(chainTask.expectedAssemblyExample).not.toContain("______");

    const tier4 = chainTask.hints?.find((h) => h.tier === 4);
    expect(tier4?.content).not.toMatch(/^(chuỗi câu mẫu hoàn chỉnh|câu mẫu hoàn chỉnh):\s*/i);
    expect(tier4?.content).not.toContain("______");
  });
});
