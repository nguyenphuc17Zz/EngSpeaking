// Mock provider §45 — for tests/dev without consuming quota
import type { AIProvider } from "@/lib/ai/interfaces/provider";
import type { AIModel, SpeechSynthesisInput, SpeechSynthesisResult, TextGenerationInput, TextGenerationResult, TranscriptionInput, TranscriptionResult } from "@/types/ai";
import { getModelsForProvider } from "@/lib/ai/models/catalog";

const MOCK_RESPONSES = [
  "That's interesting! Could you tell me more about that?",
  "I see. How does that make you feel?",
  "Great point! What do you usually do in that situation?",
  "Nice! Can you give me an example?",
  "Sounds good. What would you like to talk about next?",
];

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildWavSilentBlob(durationMs = 600): Blob {
  // Minimal WAV header + silence (8kHz mono 16-bit)
  const sampleRate = 8000;
  const samples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); writeStr(8, "WAVE"); writeStr(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); writeStr(36, "data"); view.setUint32(40, samples * 2, true);
  // silence already zero
  return new Blob([buffer], { type: "audio/wav" });
}

export class MockProvider implements AIProvider {
  id = "mock";
  displayName = "Mock Provider";
  private counter = 0;

  async getModels(): Promise<AIModel[]> {
    return getModelsForProvider("mock");
  }

  async generateText(input: TextGenerationInput): Promise<TextGenerationResult> {
    await delay(300 + Math.random() * 400);
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user")?.content || "";
    // Opening prompt detection
    if (lastUser.includes("Generate a warm, natural opening prompt")) {
      const openings = [
        "Hi there! I'm excited to chat with you. How's your day going so far?",
        "Hello! It's great to meet you. What do you enjoy doing in your free time?",
        "Hey! Thanks for joining me. What's something interesting you did recently?",
      ];
      const text = openings[this.counter++ % openings.length];
      return { text, provider: "mock", model: input.model || "mock-text", latencyMs: 350 };
    }
    const text = lastUser
      ? `Thanks for sharing: "${lastUser.slice(0, 60)}". ${MOCK_RESPONSES[this.counter++ % MOCK_RESPONSES.length]}`
      : MOCK_RESPONSES[this.counter++ % MOCK_RESPONSES.length];
    return { text, provider: "mock", model: input.model || "mock-text", latencyMs: 350 };
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    await delay(400);
    // Return deterministic mock transcription noting file size
    let size = 0;
    if (input.audio instanceof Blob) size = input.audio.size;
    else if (input.audio instanceof Uint8Array) size = input.audio.byteLength;
    else if (input.audio instanceof ArrayBuffer) size = input.audio.byteLength;
    return {
      text: size > 100 ? "Hello, this is a mock transcription of your English speech." : "Hi there!",
      language: "en-US",
      provider: "mock",
      model: input.model || "mock-stt",
    };
  }

  async synthesizeSpeech(input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    await delay(200);
    const blob = buildWavSilentBlob(Math.min(3000, Math.max(600, input.text.length * 60)));
    return { audio: blob, mimeType: "audio/wav", provider: "mock", model: input.model || "mock-tts" };
  }

  async healthCheck() {
    return { providerId: "mock", configured: true, status: "configured" as const, latencyMs: 5 };
  }
}
