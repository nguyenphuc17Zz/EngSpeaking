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
import {
  transcribeWithWhisperONNX,
  WHISPER_MODELS,
  DEFAULT_WHISPER_MODEL,
} from "@/lib/stt/whisper-onnx";

export class WhisperONNXProvider implements AIProvider {
  id = "whisper-local";
  displayName = "Whisper ONNX (Offline trong models/)";

  async getModels(): Promise<AIModel[]> {
    return WHISPER_MODELS.map((m) => ({
      id: m.id,
      providerId: "whisper-local",
      displayName: `${m.name} (${m.description})`,
      capabilities: {
        textGeneration: false,
        speechToText: true,
        textToSpeech: false,
        streaming: false,
        structuredOutput: false,
      },
      speedClass: "fast",
      costClass: "free",
      active: true,
    }));
  }

  async generateText(_input: TextGenerationInput): Promise<TextGenerationResult> {
    throw new ProviderCapabilityError("whisper-local", "textGeneration");
  }

  async synthesizeSpeech(_input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    throw new ProviderCapabilityError("whisper-local", "textToSpeech");
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const start = Date.now();
    let audioBuffer: Buffer;

    if (input.audio instanceof Blob) {
      const arrayBuffer = await input.audio.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    } else if (input.audio instanceof ArrayBuffer) {
      audioBuffer = Buffer.from(input.audio);
    } else {
      audioBuffer = Buffer.from(input.audio.buffer, input.audio.byteOffset, input.audio.byteLength);
    }

    const model = input.model && input.model !== "auto" ? input.model : DEFAULT_WHISPER_MODEL;

    const result = await transcribeWithWhisperONNX({
      audioBuffer,
      mimeType: input.mimeType,
      model,
      language: input.language,
    });

    const durationMs = Date.now() - start;

    return {
      text: result.text,
      durationMs,
      provider: "whisper-local",
      model: result.model,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: "whisper-local",
      configured: true,
      status: "configured",
      latencyMs: 15,
    };
  }
}
