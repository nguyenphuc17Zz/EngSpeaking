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
import { synthesizeKokoroTTS, KOKORO_VOICES, DEFAULT_KOKORO_VOICE } from "@/lib/tts/kokoro";

export class KokoroTTSProvider implements AIProvider {
  id = "kokoro-tts";
  displayName = "Kokoro-82M TTS (Offline trong models/)";

  async getModels(): Promise<AIModel[]> {
    return KOKORO_VOICES.map((v) => ({
      id: v.id,
      providerId: "kokoro-tts",
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
    throw new ProviderCapabilityError("kokoro-tts", "textGeneration");
  }

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new ProviderCapabilityError("kokoro-tts", "speechToText");
  }

  async synthesizeSpeech(input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    const voice = input.voice || input.model || DEFAULT_KOKORO_VOICE;
    const start = Date.now();
    const { audioBuffer, mimeType } = await synthesizeKokoroTTS({
      text: input.text,
      voice,
      speed: input.speed,
    });
    const durationMs = Date.now() - start;

    return {
      audio: new Blob([new Uint8Array(audioBuffer)], { type: mimeType }),
      mimeType,
      durationMs,
      provider: "kokoro-tts",
      model: voice,
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: "kokoro-tts",
      configured: true,
      status: "configured",
      latencyMs: 50,
    };
  }
}
