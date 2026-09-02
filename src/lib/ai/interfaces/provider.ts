// Provider-independent interfaces §6 — UI must never import concrete providers
import type {
  AIModel,
  SpeechSynthesisInput,
  SpeechSynthesisResult,
  TextGenerationInput,
  TextGenerationResult,
  TranscriptionInput,
  TranscriptionResult,
} from "@/types/ai";
import type { ProviderHealth } from "@/types/ai";

export interface AIProvider {
  id: string;
  displayName: string;
  getModels(): Promise<AIModel[]>;
  generateText(input: TextGenerationInput): Promise<TextGenerationResult>;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
  synthesizeSpeech(input: SpeechSynthesisInput): Promise<SpeechSynthesisResult>;
  healthCheck(): Promise<ProviderHealth>;
  // Optional streaming — streaming-friendly architecture §12
  streamText?(input: TextGenerationInput): AsyncIterable<string>;
}

export class ProviderCapabilityError extends Error {
  provider: string;
  capability: string;
  constructor(provider: string, capability: string) {
    super(`Provider "${provider}" does not support "${capability}"`);
    this.name = "ProviderCapabilityError";
    this.provider = provider;
    this.capability = capability;
  }
}
