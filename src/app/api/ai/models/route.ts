import { NextResponse } from "next/server";
import { CATALOG } from "@/lib/ai/models/catalog";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { GroqProvider } from "@/lib/ai/providers/groq";
import { getProviderApiKey } from "@/lib/config/server";
import type { AIModel } from "@/types/ai";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const capability = url.searchParams.get("capability") as
    | "textGeneration"
    | "speechToText"
    | "textToSpeech"
    | null;
  const customApiKey = url.searchParams.get("apiKey");

  const geminiKey = (provider === "gemini" && customApiKey) || getProviderApiKey("gemini") || "";
  const groqKey = (provider === "groq" && customApiKey) || getProviderApiKey("groq") || "";

  let liveModels: AIModel[] = [];

  // Fetch live Gemini models
  if (!provider || provider === "all" || provider === "gemini" || provider === "auto") {
    if (geminiKey) {
      try {
        const gemini = new GeminiProvider(geminiKey);
        const gModels = await gemini.getModels();
        if (gModels.length) liveModels.push(...gModels);
      } catch {}
    } else if (provider === "gemini") {
      liveModels.push(...CATALOG.filter((m) => m.providerId === "gemini"));
    }
  }

  // Fetch live Groq models
  if (!provider || provider === "all" || provider === "groq" || provider === "auto") {
    if (groqKey) {
      try {
        const groq = new GroqProvider(groqKey);
        const grModels = await groq.getModels();
        if (grModels.length) liveModels.push(...grModels);
      } catch {}
    } else if (provider === "groq") {
      liveModels.push(...CATALOG.filter((m) => m.providerId === "groq"));
    }
  }

  // Include edge-tts, kokoro-tts, whisper-local, browser and mock models if asking for all/auto/etc.
  if (!provider || provider === "all" || provider === "auto" || provider === "edge-tts" || provider === "kokoro-tts" || provider === "whisper-local" || provider === "browser" || provider === "mock") {
    const staticAux = CATALOG.filter((m) => m.providerId === "edge-tts" || m.providerId === "kokoro-tts" || m.providerId === "whisper-local" || m.providerId === "browser" || m.providerId === "mock");
    liveModels.push(...staticAux);
  }

  // If live calls returned nothing (e.g. offline or no keys), fallback to full catalog
  if (liveModels.length === 0) {
    liveModels = CATALOG.filter((m) => m.active);
    if (provider && provider !== "all" && provider !== "auto") {
      liveModels = liveModels.filter((m) => m.providerId === provider.toLowerCase());
    }
  }

  // Deduplicate models by id + providerId
  const seen = new Set<string>();
  let resultModels = liveModels.filter((m) => {
    const key = `${m.providerId}:${m.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter by capability if specified
  if (capability) {
    resultModels = resultModels.filter(
      (m) => (m.capabilities as unknown as Record<string, boolean>)[capability]
    );
  }

  return NextResponse.json({
    models: resultModels,
    total: resultModels.length,
    hasLiveKeys: !!geminiKey || !!groqKey,
  });
}
