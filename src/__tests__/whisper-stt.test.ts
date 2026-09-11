import { describe, it, expect } from "vitest";
import { createProvider } from "@/lib/ai";
import { WHISPER_MODELS, DEFAULT_WHISPER_MODEL } from "@/lib/stt/whisper-onnx";
import { CATALOG } from "@/lib/ai/models/catalog";

describe("Whisper ONNX Local STT", () => {
  it("defines Whisper ONNX models in WHISPER_MODELS", () => {
    expect(WHISPER_MODELS.length).toBeGreaterThanOrEqual(2);
    expect(WHISPER_MODELS.some((m) => m.id === DEFAULT_WHISPER_MODEL)).toBe(true);
  });

  it("registers whisper-local in AI model CATALOG", () => {
    const whisperInCatalog = CATALOG.filter((m) => m.providerId === "whisper-local");
    expect(whisperInCatalog.length).toBeGreaterThanOrEqual(2);
    expect(whisperInCatalog.some((m) => m.id === "whisper-tiny-en-onnx")).toBe(true);
    expect(whisperInCatalog.some((m) => m.id === "whisper-base-en-onnx")).toBe(true);
  });

  it("createProvider correctly creates WhisperONNXProvider", () => {
    const provider = createProvider("whisper-local");
    expect(provider).not.toBeNull();
    expect(provider?.id).toBe("whisper-local");
  });

  it("WhisperONNXProvider.getModels returns all available Whisper models", async () => {
    const provider = createProvider("whisper-local");
    const models = await provider!.getModels();
    expect(models.length).toBeGreaterThanOrEqual(2);
    expect(models[0].capabilities.speechToText).toBe(true);
    expect(models[0].capabilities.textGeneration).toBe(false);
  });

  it("WhisperONNXProvider.healthCheck returns configured: true", async () => {
    const provider = createProvider("whisper-local");
    const health = await provider!.healthCheck();
    expect(health.configured).toBe(true);
    expect(health.status).toBe("configured");
  });

  it("initializes audio enhancement settings with sensible defaults", async () => {
    const { useSettingsStore } = await import("@/stores/settings-store");
    const enhancement = useSettingsStore.getState().audioEnhancement;
    expect(enhancement.autoNormalize).toBe(true);
    expect(enhancement.micGain).toBe(1.5);
  });
});
