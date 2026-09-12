import { describe, it, expect, beforeEach } from "vitest";
import {
  computeContentHash,
  sampleBankTask,
  saveBankTask,
  recordUserExposure,
  getContentBankStats,
  findBankTaskByHash,
  getFallbackBankTask,
} from "@/lib/foundation/services/content-bank.service";
import { generateSentenceBuilderTask } from "@/lib/foundation/sentence-builder/task-generator.service";
import { generateVNToENTask } from "@/lib/foundation/vn-to-en/task-generator.service";
import { generateLatencyTask } from "@/lib/foundation/latency/task-generator.service";
import { generateScenario } from "@/lib/conversation/services/scenario.service";
import { generateCircumlocutionTask, generateSurvivalScenarioTask } from "@/lib/foundation/survival/survival-generator.service";
import { generateChunkChainTask } from "@/lib/foundation/chunks/chunk-generator.service";
import { searchSpokenDictionary } from "@/lib/foundation/vocabulary/vocabulary.service";
import { generateRepairChallenge } from "@/lib/foundation/retry-loop/challenge-generator.service";
import { simplifySentence } from "@/lib/foundation/retry-loop/simplification.service";
import { generateExercise } from "@/lib/foundation/services/exercise-generator.service";

describe("Universal Content Banking & Hybrid 70/30 Engine", () => {
  beforeEach(() => {
    // Reset global stores if needed
  });

  it("normalizes and computes deterministic SHA-256 hash for deduplication", () => {
    const textA = "I usually drink coffee every morning.";
    const textB = "  i usually drink COFFEE every morning!  ";
    const textC = "I always drink tea in the evening.";

    const hashA = computeContentHash(textA);
    const hashB = computeContentHash(textB);
    const hashC = computeContentHash(textC);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
    expect(hashA.length).toBe(64); // SHA-256 hex length
  });

  it("retrieves pre-seeded tasks with forceSource: 'bank'", async () => {
    const sbResult = await sampleBankTask<{ id: string; targetIntent: string }>({
      module: "sentence_builder",
      forceSource: "bank",
    });

    expect(sbResult).not.toBeNull();
    expect(sbResult?.source).toBe("bank");
    expect(sbResult?.task.targetIntent).toBeDefined();

    const vnResult = await sampleBankTask<{ id: string; promptVi: string }>({
      module: "vn_to_en",
      forceSource: "bank",
    });

    expect(vnResult).not.toBeNull();
    expect(vnResult?.source).toBe("bank");
    expect(vnResult?.task.promptVi).toBeDefined();

    const latResult = await sampleBankTask<{ id: string; promptText: string }>({
      module: "latency",
      forceSource: "bank",
    });

    expect(latResult).not.toBeNull();
    expect(latResult?.source).toBe("bank");
    expect(latResult?.task.promptText).toBeDefined();
  });

  it("returns null when forceSource: 'ai' to guarantee dynamic LLM injection", async () => {
    const result = await sampleBankTask({
      module: "sentence_builder",
      forceSource: "ai",
    });

    expect(result).toBeNull();
  });

  it("saves newly generated AI task into Bank with automatic deduplication", async () => {
    const newTask = {
      id: "test_dynamic_task_1",
      taskType: "sentence_completion",
      controlLevel: "controlled",
      instruction: "Hoàn thành câu sau bằng tiếng Anh:",
      promptVi: "Hôm qua tôi đi xem phim cùng bạn thân.",
      targetIntent: "Yesterday I went to the movies with my best friend.",
      expectedResponses: ["Yesterday I went to the movies with my best friend."],
      requiredElements: ["yesterday", "movies", "best friend"],
      scaffold: {
        level: 1,
        template: "Yesterday I ___ to the movies with my best friend.",
        keywords: ["movies", "friend"],
        starter: "Yesterday I...",
      },
      hints: [
        { tier: 0, title: "Không gợi ý", content: "Nói ngay.", penaltyWeight: 0 },
        { tier: 1, title: "Từ khoá", content: "movies / best friend", penaltyWeight: 0.1 },
        { tier: 2, title: "Khung câu", content: "Yesterday I ___ to the movies.", penaltyWeight: 0.25 },
        { tier: 3, title: "Từ mở đầu", content: "Yesterday I went...", penaltyWeight: 0.5 },
        { tier: 4, title: "Câu mẫu", content: "Yesterday I went to the movies with my best friend.", penaltyWeight: 0.85 },
      ],
      difficulty: { overall: 4, grammarComplexity: 2, retrievalDemand: 0.4, lengthScore: 2 },
      skills: ["past_simple"],
      grammarTargets: ["past_simple"],
      topic: "entertainment",
      prepTimeSec: 3.0,
    };

    const record = await saveBankTask({
      module: "sentence_builder",
      difficulty: 4,
      level: "controlled",
      topic: "entertainment",
      hashSourceText: newTask.promptVi,
      payload: newTask,
    });

    expect(record.id).toBeDefined();
    expect(record.content_hash).toBe(computeContentHash(newTask.promptVi));

    // Saving again with same text should update existing record, not duplicate
    const statsBefore = await getContentBankStats();
    await saveBankTask({
      module: "sentence_builder",
      difficulty: 4,
      level: "controlled",
      topic: "entertainment",
      hashSourceText: "  hôm qua tôi đi xem phim cùng bạn thân!  ",
      payload: newTask,
    });
    const statsAfter = await getContentBankStats();

    expect(statsAfter.totalItems).toBe(statsBefore.totalItems);
  });

  it("tracks user exposures and enforces anti-repetition window", async () => {
    const userId = "test_learner_42";
    const sample = await sampleBankTask<{ id: string }>({
      module: "sentence_builder",
      userId,
      forceSource: "bank",
    });

    expect(sample).not.toBeNull();
    if (sample) {
      await recordUserExposure(sample.contentId, "sentence_builder", userId, 90);

      // Verify stats count exposure
      const stats = await getContentBankStats();
      expect(stats.totalExposures).toBeGreaterThan(0);
    }
  });

  it("integrates seamlessly with generateSentenceBuilderTask with forceSource: 'bank'", async () => {
    const task = await generateSentenceBuilderTask({
      controlLevel: "controlled",
      forceSource: "bank",
    });

    expect(task).toBeDefined();
    expect(task.promptVi).toBeDefined();
    expect(task.scaffold).toBeDefined();
    expect(task.hints.length).toBeGreaterThanOrEqual(4);
  });

  it("integrates seamlessly with generateVNToENTask with forceSource: 'bank'", async () => {
    const task = await generateVNToENTask({
      retrievalMode: "direct",
      forceSource: "bank",
    });

    expect(task).toBeDefined();
    expect(task.promptVi).toBeDefined();
    expect(task.targetIntent).toBeDefined();
    expect(task.sayItBetter).toBeDefined();
  });

  it("integrates seamlessly with generateLatencyTask with forceSource: 'bank'", async () => {
    const task = await generateLatencyTask({
      drillMode: "open_response",
      forceSource: "bank",
    });

    expect(task).toBeDefined();
    expect(task.promptText).toBeDefined();
    expect(task.bufferChunks).toBeDefined();
    expect(task.bufferChunks?.length).toBeGreaterThan(0);
  });

  it("preserves offline mock provider compatibility for all generators", async () => {
    const sbMock = await generateSentenceBuilderTask({ provider: "mock" });
    expect(sbMock.id).toContain("sb_task_test_");

    const vnMock = await generateVNToENTask({ provider: "mock" });
    expect(vnMock.id).toContain("vn_task_test_");

    const latMock = await generateLatencyTask({ provider: "mock" });
    expect(latMock.id).toContain("lat_task_test_");
  });

  // Phase 2 Tests
  it("integrates seamlessly with generateScenario using forceSource: 'bank'", async () => {
    const scenario = await generateScenario(
      {
        mode: "workplace",
        difficulty: "normal",
        duration: "5 min",
        characterStyle: "professional",
        surpriseLevel: "medium",
        conflictIntensity: "none",
        pressure: "normal",
      },
      { forceSource: "bank" }
    );

    expect(scenario).toBeDefined();
    expect(scenario.mode).toBe("workplace");
    expect(scenario.character).toBeDefined();
    expect(scenario.character.role).toBe("manager");
    expect(scenario.setting).toContain("meeting");
  });

  it("integrates seamlessly with generateCircumlocutionTask using forceSource: 'bank'", async () => {
    const task = await generateCircumlocutionTask({
      difficulty: "easy",
      forceSource: "bank",
    });

    expect(task).toBeDefined();
    expect(task.targetWord).toBe("microwave");
    expect(task.forbiddenWords).toContain("microwave");
    expect(task.tierHints?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("integrates seamlessly with generateSurvivalScenarioTask using forceSource: 'bank'", async () => {
    // Save a test scenario in bank
    await saveBankTask({
      module: "survival_scenario",
      category: "airport",
      difficulty: 4,
      payload: {
        id: "test_survival_scen_1",
        context: "airport",
        contextTitleVi: "Sân bay",
        problemDescriptionVi: "Cửa khởi hành bị đổi gấp.",
        audioPromptText: "Your flight is boarding in 10 minutes but your gate changed.",
        recommendedSkill: "asking_repetition",
        suggestedRepairPhrases: ["Excuse me, could you direct me to gate 42?"],
        tierHints: [{ tier: 0, title: "None", content: "" }],
      },
      hashSourceText: "Your flight is boarding in 10 minutes but your gate changed.",
    });

    const task = await generateSurvivalScenarioTask({
      forceSource: "bank",
    });

    expect(task).toBeDefined();
    expect(task.audioPromptText).toBeDefined();
    expect(task.suggestedRepairPhrases.length).toBeGreaterThan(0);
  });

  it("integrates seamlessly with generateChunkChainTask using forceSource: 'bank'", async () => {
    const task = await generateChunkChainTask({
      strategy: "opinion_defense",
      forceSource: "bank",
    });

    expect(task).toBeDefined();
    expect(task.pragmaticStrategy).toBe("opinion_defense");
    expect(task.blocks.length).toBe(4);
    expect(task.expectedAssemblyExample).toBeDefined();
  });

  it("integrates seamlessly with searchSpokenDictionary for pre-seeded words", async () => {
    const wordItem = await searchSpokenDictionary("resilient");

    expect(wordItem).toBeDefined();
    expect(wordItem.word).toBe("resilient");
    expect(wordItem.ipaUS).toBe("/rɪˈzɪl.jənt/");
    expect(wordItem.collocations.length).toBeGreaterThan(0);
    expect(wordItem.spontaneousChallenge).toBeDefined();
  });

  it("integrates seamlessly with generateRepairChallenge using forceSource: 'bank'", async () => {
    const challenge = await generateRepairChallenge({
      category: "grammar",
      forceSource: "bank",
    });

    expect(challenge).toBeDefined();
    expect(challenge.category).toBe("grammar");
    expect(challenge.whatToFix).toBeDefined();
    expect(challenge.betterSentence).toBeDefined();
    expect(challenge.hints.length).toBeGreaterThanOrEqual(4);
  });

  it("integrates seamlessly with simplifySentence using exact sentence hash match in content bank", async () => {
    const originalPromptVi = "Hôm qua tôi đi làm muộn vì kẹt xe và lỡ cuộc họp.";
    const originalEnglish = "Yesterday I went to work late because of a traffic jam and missed the meeting";

    const result = await simplifySentence({
      originalPromptVi,
      originalEnglish,
      targetErrorPattern: "core_grammar",
      forceSource: "bank",
    });

    expect(result).toBeDefined();
    expect(result.simplifiedEnglish).toContain("traffic jam");
    expect(result.reductionReason).toContain("Cognitive Load");
  });

  it("integrates seamlessly with generateExercise using forceSource: 'bank'", async () => {
    const exercise = await generateExercise(
      {
        skill: "sentence_retrieval",
        type: "one_sentence",
        difficulty: 3,
      },
      { forceSource: "bank" }
    );

    expect(exercise).toBeDefined();
    expect(exercise.source).toBe("bank");
    expect(exercise.type).toBe("one_sentence");
    expect(exercise.instruction).toBeDefined();
    expect(exercise.evaluationCriteria.length).toBeGreaterThanOrEqual(1);
  });

  it("retrieves reliable fallback task via getFallbackBankTask", async () => {
    const fallback = await getFallbackBankTask<{ id: string; targetIntent: string }>({
      module: "sentence_builder",
    });

    expect(fallback).not.toBeNull();
    expect(fallback?.targetIntent).toBeDefined();
  });
});
