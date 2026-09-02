// Extended capability helpers §7 — wraps catalog
import { CATALOG } from "@/lib/ai/models/catalog";
import type { AIModel } from "@/types/ai";

export type ExtendedCapability = "textGeneration" | "reasoning" | "structuredOutput" | "speechToText" | "textToSpeech" | "audioInput" | "audioOutput" | "streaming" | "toolCalling" | "longContext";

export function getModelCapabilities(model: AIModel): Record<string, boolean> {
  // Map base capabilities to extended
  const base = model.capabilities;
  return {
    textGeneration: base.textGeneration,
    reasoning: model.speedClass === "quality" || model.id.includes("pro"),
    structuredOutput: base.structuredOutput,
    speechToText: base.speechToText,
    textToSpeech: base.textToSpeech,
    audioInput: base.speechToText, // whisper = audioInput
    audioOutput: base.textToSpeech,
    streaming: base.streaming,
    toolCalling: false, // not yet
    longContext: (model.contextWindow || 0) > 100000,
  };
}

export function modelSupports(model: AIModel, capability: string): boolean {
  const caps = getModelCapabilities(model);
  return !!caps[capability];
}

export function filterByCapabilities(models: AIModel[], required: string[]): AIModel[] {
  return models.filter((m) => required.every((c) => modelSupports(m, c)));
}
