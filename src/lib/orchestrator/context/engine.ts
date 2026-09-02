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
  let packed: Record<string, unknown> = {};
  if (strategy === "full") packed = sourceData;
  else if (strategy === "compact") {
    // Keep only priority keys that exist and are relevant
    for (const k of priorityKeys.slice(0, 5)) if (k in sourceData) packed[k] = sourceData[k];
    // Truncate olderHistory
    if ("recentTurns" in packed && Array.isArray(packed.recentTurns) && (packed.recentTurns as unknown[]).length > 15) {
      packed.recentTurns = (packed.recentTurns as unknown[]).slice(-15);
    }
  } else if (strategy === "recent") {
    packed.recentTurns = sourceData.recentTurns;
    packed.currentUserResponse = sourceData.currentUserResponse;
    packed.taskObjective = sourceData.taskObjective;
  } else if (strategy === "summary") {
    packed.summary = sourceData.summary || sourceData.conversationSummary;
    packed.activeFacts = sourceData.activeFacts;
    packed.activeThreads = sourceData.activeThreads;
    packed.currentScenarioState = sourceData.currentScenarioState;
  } else packed = sourceData;

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
