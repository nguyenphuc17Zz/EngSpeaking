import { describe, it, expect } from "vitest";
import { CATALOG, getModelsForProvider, getModelById } from "@/lib/ai/models/catalog";
import { resolveAutoModel, getModelsForCapability } from "@/lib/ai/routing/auto-resolver";

describe("Model registry & capability filtering §7 §37", () => {
  it("catalog contains browser STT/TTS and gemini/groq models", () => {
    expect(CATALOG.length).toBeGreaterThan(8);
    expect(getModelsForProvider("browser").length).toBe(2);
    expect(getModelsForProvider("gemini").some((m) => m.capabilities.textGeneration)).toBe(true);
    expect(getModelsForProvider("groq").some((m) => m.capabilities.speechToText)).toBe(true);
  });

  it("filters by capability — STT selector only shows STT models", () => {
    const sttModels = getModelsForCapability("speechToText");
    expect(sttModels.every((m) => m.capabilities.speechToText)).toBe(true);
    expect(sttModels.some((m) => m.providerId === "browser")).toBe(true);
    const ttsModels = getModelsForCapability("textToSpeech");
    expect(ttsModels.every((m) => m.capabilities.textToSpeech)).toBe(true);
  });

  it("getModelById finds model", () => {
    expect(getModelById("gemini-3.7-flash")?.providerId).toBe("gemini");
    expect(getModelById("nonexistent")).toBeUndefined();
  });

  it("auto resolver picks gemini for conversation (preference)", () => {
    const res = resolveAutoModel("conversation", { configuredProviders: ["gemini", "groq", "browser"] });
    expect(res.providerId).toBe("gemini");
    expect(res.modelId).toBe("gemini-3.7-flash");
  });

  it("auto resolver picks browser for transcription when browser available", () => {
    // browser has speechToText true and is in preference but after gemini/groq — groq whisper comes before browser
    const res = resolveAutoModel("transcription", { configuredProviders: ["browser"] });
    expect(res.providerId).toBe("browser");
  });
});
