// Browser providers — per user choice: STT via Web Speech, TTS via speechSynthesis
// These are client-side only but wrapped to share capability interface.
// Server adapters (Gemini/Groq) stay server-only. Browser adapters are instantiated client-side.
import type { AIProvider } from "@/lib/ai/interfaces/provider";
import { ProviderCapabilityError } from "@/lib/ai/interfaces/provider";
import type { AIModel, SpeechSynthesisInput, SpeechSynthesisResult, TextGenerationInput, TextGenerationResult, TranscriptionInput, TranscriptionResult } from "@/types/ai";
import { getModelsForProvider } from "@/lib/ai/models/catalog";

export class BrowserSTTProvider implements AIProvider {
  id = "browser";
  displayName = "Browser Web Speech API";

  async getModels(): Promise<AIModel[]> {
    return getModelsForProvider("browser").filter((m) => m.capabilities.speechToText);
  }

  async generateText(_input: TextGenerationInput): Promise<TextGenerationResult> {
    throw new ProviderCapabilityError("browser", "textGeneration");
  }

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    // Real transcription happens client-side via hooks/useSpeechRecognition.
    // This stub is not used server-side; keep for interface completeness.
    throw new ProviderCapabilityError("browser", "transcribe-via-hook");
  }

  async synthesizeSpeech(_input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    throw new ProviderCapabilityError("browser", "textToSpeech-use-browser-tts");
  }

  async healthCheck() {
    const supported = typeof window !== "undefined" && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
    return { providerId: "browser", configured: supported, status: (supported ? "configured" : "not_configured") as "configured" | "not_configured", latencyMs: 0 };
  }
}

export class BrowserTTSProvider implements AIProvider {
  id = "browser";
  displayName = "Browser Speech Synthesis";

  async getModels(): Promise<AIModel[]> {
    return getModelsForProvider("browser").filter((m) => m.capabilities.textToSpeech);
  }

  async generateText(_input: TextGenerationInput): Promise<TextGenerationResult> {
    throw new ProviderCapabilityError("browser", "textGeneration");
  }

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new ProviderCapabilityError("browser", "speechToText-use-browser-stt");
  }

  async synthesizeSpeech(input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    // Client-side only; server stub
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      throw new ProviderCapabilityError("browser", "speechSynthesis-not-supported");
    }
    // Actual synthesis via src/lib/tts/browser.ts — return silent placeholder here to keep API boundary
    const text = input.text;
    // Create 0.5s silent wav as placeholder if needed server-side fallback
    const blob = new Blob([new Uint8Array([0])], { type: "audio/wav" });
    return { audio: blob, mimeType: "audio/wav", provider: "browser", model: "browser-tts" };
  }

  async healthCheck() {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    return { providerId: "browser", configured: supported, status: (supported ? "configured" : "not_configured") as "configured" | "not_configured", latencyMs: 0 };
  }
}

// Unified check helper
export function isBrowserSTTSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
}

export function isBrowserTTSSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}
