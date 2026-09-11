import { describe, it, expect } from "vitest";
import {
  generateChunkChainTask,
  generateSingleChunkTask,
  SEED_CHUNK_LIBRARY,
} from "@/lib/foundation/chunks/chunk-generator.service";
import {
  evaluateSingleChunkAttempt,
  evaluateChunkChainAttempt,
} from "@/lib/foundation/chunks/chunk-evaluator.service";
import type { ChunkTrainingTask, ChunkChainTask } from "@/types/chunk-automaticity";

describe("Function 6 — Chunk Automaticity & Chain Building Engine", () => {
  it("generates 4-block Speech Chain Builder tasks (buffer -> stance -> reason -> example)", async () => {
    const chainTask = await generateChunkChainTask({ provider: "mock" });

    expect(chainTask.blocks.length).toBe(4);
    expect(chainTask.blocks[0].blockType).toBe("buffer");
    expect(chainTask.blocks[1].blockType).toBe("stance");
    expect(chainTask.blocks[2].blockType).toBe("reason");
    expect(chainTask.blocks[3].blockType).toBe("example");
    expect(chainTask.expectedAssemblyExample).toBeDefined();
    expect(chainTask.hints?.length).toBeGreaterThanOrEqual(4);
    expect(chainTask.suggestedVocabulary?.length).toBeGreaterThanOrEqual(1);
  });

  it("generates single chunk tasks across progressive stages", async () => {
    const singleTask = await generateSingleChunkTask({
      chunk: SEED_CHUNK_LIBRARY[0],
      stage: "contextual_use",
      provider: "mock",
    });

    expect(singleTask.chunk.canonicalChunk).toBe("It depends on...");
    expect(singleTask.stage).toBe("contextual_use");
    expect(singleTask.expectedChunkUsage).toBe("It depends on...");
    expect(singleTask.hints?.length).toBeGreaterThanOrEqual(4);
    expect(singleTask.suggestedVocabulary?.length).toBeGreaterThanOrEqual(1);
  });

  it("evaluates single chunk attempt, detects usage and variant flexibility", async () => {
    const task: ChunkTrainingTask = {
      id: "t_chunk_1",
      chunk: SEED_CHUNK_LIBRARY[0],
      stage: "contextual_use",
      situationVi: "Decision depends on time",
      contextDomain: "daily_life",
      promptText: "Are you coming?",
      expectedChunkUsage: "It depends on...",
      targetLatencyMs: 2500,
    };

    const res = await evaluateSingleChunkAttempt({
      task,
      userTranscript: "Well, that really depends on the weather tomorrow.",
      responseLatencyMs: 1400,
      provider: "mock",
    });

    expect(res.isSuccessful).toBe(true);
    expect(res.chunkDetected).toBe(true);
    expect(res.alternativeVariants.length).toBeGreaterThan(0);
    expect(res.retrievalLatencyMs).toBe(1400);
  });

  it("evaluates multi-block speech chain assembly and scoring", async () => {
    const chainTask: ChunkChainTask = {
      id: "chain_test",
      topic: "Remote work",
      situationVi: "Explain remote work benefits",
      targetQuestion: "Why remote work?",
      blocks: [
        { blockType: "buffer", labelVi: "Buffer", suggestedChunk: "Well, to be honest...", alternativeChunks: [] },
        { blockType: "stance", labelVi: "Stance", suggestedChunk: "I personally feel that...", alternativeChunks: [] },
        { blockType: "reason", labelVi: "Reason", suggestedChunk: "The main reason is that...", alternativeChunks: [] },
        { blockType: "example", labelVi: "Example", suggestedChunk: "For example, I can...", alternativeChunks: [] },
      ],
      expectedAssemblyExample: "Well, to be honest, I personally feel that it's great.",
      targetLatencyMs: 3500,
    };

    const res = await evaluateChunkChainAttempt({
      task: chainTask,
      userTranscript:
        "Well, to be honest, I personally feel that remote work is great because the main reason is that it saves commute time, for example I can sleep more.",
      responseLatencyMs: 2100,
      provider: "mock",
    });

    expect(res.isSuccessful).toBe(true);
    expect(res.blocksUsedCount).toBeGreaterThanOrEqual(2);
    expect(res.overallScore).toBeGreaterThanOrEqual(80);
  });

  it("supports Pragmatic Flow DAG strategies with rhetorical roles and transition connectors", async () => {
    const chainTask = await generateChunkChainTask({
      provider: "mock",
      strategy: "concession_counter",
    });

    expect(chainTask.pragmaticStrategy).toBe("concession_counter");
    expect(chainTask.strategyTitleVi).toContain("Nhượng bộ & Phản biện");
    expect(chainTask.persona).toBeDefined();
    expect(chainTask.blocks.length).toBe(4);
    expect(chainTask.blocks[0].rhetoricalRole).toBeDefined();
    expect(chainTask.blocks[0].transitionConnector).toBeDefined();
    expect(chainTask.blocks[1].rhetoricalRole).toBeDefined();
    expect(chainTask.blocks[2].rhetoricalRole).toBeDefined();
    expect(chainTask.blocks[3].rhetoricalRole).toBeDefined();
  });
});
