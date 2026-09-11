import { describe, it, expect } from "vitest";
import { EDGE_NEURAL_VOICES, DEFAULT_EDGE_VOICE } from "@/lib/tts/edge";
import { EdgeTTSProvider } from "@/lib/ai/providers/edge";
import { getCatalog } from "@/lib/ai/models/catalog";

describe("Microsoft Edge Neural TTS", () => {
  it("defines standard high-quality voices including Jenny and Guy", () => {
    expect(DEFAULT_EDGE_VOICE).toBe("en-US-JennyNeural");
    const voiceIds = EDGE_NEURAL_VOICES.map((v) => v.id);
    expect(voiceIds).toContain("en-US-JennyNeural");
    expect(voiceIds).toContain("en-US-GuyNeural");
    expect(voiceIds).toContain("en-GB-SoniaNeural");
    expect(EDGE_NEURAL_VOICES.length).toBeGreaterThanOrEqual(5);
  });

  it("EdgeTTSProvider implements AIProvider and exposes models with TTS capability", async () => {
    const provider = new EdgeTTSProvider();
    expect(provider.id).toBe("edge-tts");
    const models = await provider.getModels();
    expect(models.length).toBe(EDGE_NEURAL_VOICES.length);
    expect(models.every((m) => m.capabilities.textToSpeech && !m.capabilities.textGeneration)).toBe(true);

    const health = await provider.healthCheck();
    expect(health.status).toBe("configured");
  });

  it("CATALOG registers Edge Neural TTS models correctly", () => {
    const catalog = getCatalog();
    const edgeModels = catalog.filter((m) => m.providerId === "edge-tts");
    expect(edgeModels.length).toBeGreaterThanOrEqual(6);
    expect(edgeModels.some((m) => m.id === "en-US-JennyNeural")).toBe(true);
    expect(edgeModels.some((m) => m.id === "en-US-GuyNeural")).toBe(true);
    expect(edgeModels.some((m) => m.id === "en-GB-SoniaNeural")).toBe(true);
  });

  it("GET /api/ai/speak returns 400 when text is missing", async () => {
    const { GET } = await import("@/app/api/ai/speak/route");
    const req = new Request("http://localhost:3000/api/ai/speak");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/ai/speak returns 400 when text is missing", async () => {
    const { POST } = await import("@/app/api/ai/speak/route");
    const req = new Request("http://localhost:3000/api/ai/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST /api/ai/speak handles browser provider stub", async () => {
    const { POST } = await import("@/app/api/ai/speak/route");
    const req = new Request("http://localhost:3000/api/ai/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello", provider: "browser" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.provider).toBe("browser");
  });

  it("registers Kokoro-82M TTS offline models in CATALOG", async () => {
    const catalog = getCatalog();
    const kokoroModels = catalog.filter((m) => m.providerId === "kokoro-tts");
    expect(kokoroModels.length).toBeGreaterThanOrEqual(5);
    expect(kokoroModels.some((m) => m.id === "af_heart")).toBe(true);
    expect(kokoroModels.some((m) => m.id === "am_adam")).toBe(true);
  });
});
