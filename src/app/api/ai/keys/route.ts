import { NextResponse } from "next/server";
import {
  getAllProviderStatuses,
  setProviderApiKey,
  removeProviderApiKey,
} from "@/lib/config/server";
import { getModelsForProvider } from "@/lib/ai/models/catalog";
import type { AIModel } from "@/types/ai";

export async function GET() {
  const statuses = getAllProviderStatuses();
  return NextResponse.json({ providers: statuses });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, apiKey } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json(
        { error: "Provider không hợp lệ (hỗ trợ 'gemini' hoặc 'groq')" },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== "string" || !apiKey.replace(/[\r\n]/g, "").trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập API Key hợp lệ" },
        { status: 400 }
      );
    }

    const lower = provider.toLowerCase();
    const cleanKey = apiKey.replace(/[\r\n]/g, "").trim();

    // Verify key against actual provider API and parse models in a single request
    let models: AIModel[] = [];
    if (lower === "gemini") {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        let probeRes: Response;
        try {
          probeRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
            headers: { "x-goog-api-key": cleanKey },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        if (!probeRes.ok) {
          const errData = await probeRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Lỗi kết nối Gemini API (Mã: ${probeRes.status})`;
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }
        const data = (await probeRes.json().catch(() => ({}))) as {
          models?: Array<{
            name: string;
            displayName?: string;
            inputTokenLimit?: number;
            supportedGenerationMethods?: string[];
          }>;
        };
        for (const m of data.models || []) {
          if (!m.supportedGenerationMethods?.includes("generateContent")) continue;
          const mid = (m.name || "").replace(/^models\//, "").trim();
          if (!mid || mid.includes("embedding") || mid.includes("aqa") || mid.includes("imagen")) continue;
          models.push({
            id: mid,
            providerId: "gemini",
            displayName: m.displayName ? `${m.displayName} (${mid})` : mid,
            capabilities: {
              textGeneration: true,
              speechToText: false,
              textToSpeech: false,
              streaming: true,
              structuredOutput: true,
            },
            contextWindow: m.inputTokenLimit || 1_000_000,
            active: true,
          });
        }
        if (models.length === 0) {
          models = getModelsForProvider("gemini");
        }
      } catch (e: unknown) {
        return NextResponse.json(
          { error: `Không thể kết nối đến Google Gemini: ${e instanceof Error ? e.message : String(e)}` },
          { status: 500 }
        );
      }
    } else if (lower === "groq") {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        let probeRes: Response;
        try {
          probeRes = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { Authorization: `Bearer ${cleanKey}` },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        if (!probeRes.ok) {
          const errData = await probeRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Lỗi kết nối Groq API (Mã: ${probeRes.status})`;
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }
        const data = (await probeRes.json().catch(() => ({}))) as {
          data?: Array<{ id: string; active?: boolean; context_window?: number }>;
        };
        for (const m of data.data || []) {
          if (m.active === false) continue;
          const mid = (m.id || "").trim();
          if (!mid) continue;
          const isWhisper = mid.toLowerCase().includes("whisper");
          models.push({
            id: mid,
            providerId: "groq",
            displayName: mid,
            capabilities: isWhisper
              ? { textGeneration: false, speechToText: true, textToSpeech: false, streaming: false, structuredOutput: false }
              : { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: true },
            contextWindow: m.context_window || 128_000,
            active: true,
          });
        }
        if (models.length === 0) {
          models = getModelsForProvider("groq");
        }
      } catch (e: unknown) {
        return NextResponse.json(
          { error: `Không thể kết nối đến Groq API: ${e instanceof Error ? e.message : String(e)}` },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: `Provider '${provider}' chưa được hỗ trợ lưu key` },
        { status: 400 }
      );
    }

    // Save key to runtime and persist to data/api-keys.json (does not trigger Next.js .env reload)
    setProviderApiKey(lower, cleanKey);

    return NextResponse.json({
      success: true,
      message: `Đã kết nối và lưu API Key ${provider.toUpperCase()} thành công!`,
      provider: lower,
      modelsCount: models.length,
      models,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `Lỗi xử lý: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider");

    if (!provider) {
      return NextResponse.json({ error: "Thiếu tham số provider" }, { status: 400 });
    }

    const lower = provider.toLowerCase();
    removeProviderApiKey(lower);

    return NextResponse.json({
      success: true,
      message: `Đã gỡ bỏ API Key cho ${provider.toUpperCase()}`,
      provider: lower,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `Lỗi gỡ bỏ: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
