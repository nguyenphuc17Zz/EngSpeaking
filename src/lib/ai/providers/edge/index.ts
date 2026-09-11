import type { AIProvider } from "@/lib/ai/interfaces/provider";
import { ProviderCapabilityError } from "@/lib/ai/interfaces/provider";
import type {
  AIModel,
  ProviderHealth,
  SpeechSynthesisInput,
  SpeechSynthesisResult,
  TextGenerationInput,
  TextGenerationResult,
  TranscriptionInput,
  TranscriptionResult,
} from "@/types/ai";
import { synthesizeEdgeTTS, EDGE_NEURAL_VOICES, DEFAULT_EDGE_VOICE } from "@/lib/tts/edge";

export class EdgeTTSProvider implements AIProvider {
  id = "edge-tts";
  displayName = "Microsoft Edge Neural TTS";

  async getModels(): Promise<AIModel[]> {
    return EDGE_NEURAL_VOICES.map((v) => ({
      id: v.id,
      providerId: "edge-tts",
      displayName: `${v.name} - ${v.accent} (${v.description})`,
      capabilities: {
        textGeneration: false,
        speechToText: false,
        textToSpeech: true,
        streaming: false,
        structuredOutput: false,
      },
      speedClass: "fast",
      costClass: "free",
      active: true,
    }));
  }

  async generateText(_input: TextGenerationInput): Promise<TextGenerationResult> {
    throw new ProviderCapabilityError("edge-tts", "textGeneration");
  }

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new ProviderCapabilityError("edge-tts", "speechToText");
  }

  async synthesizeSpeech(input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    const voice = input.voice || input.model || DEFAULT_EDGE_VOICE;
    const start = Date.now();
    const { audioBuffer, mimeType } = await synthesizeEdgeTTS({
      text: input.text,
      voice,
      speed: input.speed,
    });
    const durationMs = Date.now() - start;

    return {
      audio: new Blob([new Uint8Array(audioBuffer)], { type: mimeType }),
      mimeType,
      durationMs,
      provider: "edge-tts",
      model: voice,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: "edge-tts",
      configured: true,
      status: "configured",
      latencyMs: 10,
    };
  }
}
