// Context engine §15-19
import type { AITask } from "../task-registry";
import { getTaskPolicy } from "../task-policies";

export type ContextStrategy = "full" | "recent" | "summary" | "relevant" | "compact" | "structured";

export interface ContextPackerInput {
  task: AITask;
  sourceData: Record<string, unknown>;
  maxInputTokens?: number;
}

export function buildAIContext(task: AITask, sourceData: Record<string, unknown>, maxInputTokens?: number): Record<string, unknown> {
  const policy = getTaskPolicy(task);
  const strategy = policy.contextStrategy;
  // Priority: current task > user response > objective > recent turns > scenario state > learner constraints > facts > older history §17
  const priorityKeys = ["currentTask", "currentUserResponse", "taskObjective", "recentTurns", "activeScenarioState", "activeLearnerConstraints", "importantFacts", "olderHistory"];
  const allPrioritySet = new Set(priorityKeys);
  let packed: Record<string, unknown> = {};
  if (strategy === "full") {
    packed = { ...sourceData };
  } else if (strategy === "compact") {
    // Keep priority keys that exist and are relevant, plus preserve unrecognized task-specific keys
    for (const k of priorityKeys.slice(0, 5)) if (k in sourceData) packed[k] = sourceData[k];
    for (const [k, v] of Object.entries(sourceData)) {
      if (!allPrioritySet.has(k) && v !== undefined) {
        packed[k] = v;
      }
    }
    // Truncate recentTurns
    if ("recentTurns" in packed && Array.isArray(packed.recentTurns) && (packed.recentTurns as unknown[]).length > 15) {
      packed.recentTurns = (packed.recentTurns as unknown[]).slice(-15);
    }
  } else if (strategy === "recent") {
    if ("recentTurns" in sourceData && sourceData.recentTurns !== undefined) packed.recentTurns = sourceData.recentTurns;
    if ("currentUserResponse" in sourceData && sourceData.currentUserResponse !== undefined) packed.currentUserResponse = sourceData.currentUserResponse;
    if ("taskObjective" in sourceData && sourceData.taskObjective !== undefined) packed.taskObjective = sourceData.taskObjective;
    for (const [k, v] of Object.entries(sourceData)) {
      if (!allPrioritySet.has(k) && v !== undefined) {
        packed[k] = v;
      }
    }
  } else if (strategy === "summary") {
    const summaryKnownKeys = new Set([...priorityKeys, "summary", "conversationSummary", "activeFacts", "activeThreads", "currentScenarioState"]);
    if (sourceData.summary !== undefined || sourceData.conversationSummary !== undefined) {
      packed.summary = sourceData.summary || sourceData.conversationSummary;
    }
    if (sourceData.activeFacts !== undefined) packed.activeFacts = sourceData.activeFacts;
    if (sourceData.activeThreads !== undefined) packed.activeThreads = sourceData.activeThreads;
    if (sourceData.currentScenarioState !== undefined) packed.currentScenarioState = sourceData.currentScenarioState;
    for (const [k, v] of Object.entries(sourceData)) {
      if (!summaryKnownKeys.has(k) && v !== undefined) {
        packed[k] = v;
      }
    }
  } else {
    packed = { ...sourceData };
  }

  if (Object.keys(packed).length === 0 && Object.keys(sourceData).length > 0) {
    packed = { ...sourceData };
  }

  // Enforce token budget via simple truncation (estimate 1 token ~ 4 chars)
  if (maxInputTokens) {
    const estTokens = JSON.stringify(packed).length / 4;
    if (estTokens > maxInputTokens) {
      // compress: summarize older history
      if (Array.isArray(packed.recentTurns) && (packed.recentTurns as unknown[]).length > 8) {
        packed.recentTurns = (packed.recentTurns as unknown[]).slice(-8);
      }
    }
  }
  return packed;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
