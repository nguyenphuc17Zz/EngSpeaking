import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  getAllProviderStatuses,
  setProviderApiKey,
  removeProviderApiKey,
} from "@/lib/config/server";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { GroqProvider } from "@/lib/ai/providers/groq";

function persistKeyToFile(envVar: string, keyVal?: string) {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    let content = "";
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf-8");
    }

    if (keyVal) {
      const regex = new RegExp(`^${envVar}=.*$`, "m");
      if (regex.test(content)) {
        content = content.replace(regex, `${envVar}=${keyVal}`);
      } else {
        content = content.trim() ? `${content}\n${envVar}=${keyVal}\n` : `${envVar}=${keyVal}\n`;
      }
    } else {
      const regex = new RegExp(`^${envVar}=.*$(\r?\n)?`, "m");
      content = content.replace(regex, "");
    }

    fs.writeFileSync(envPath, content, "utf-8");
  } catch {}
}

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

    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập API Key hợp lệ" },
        { status: 400 }
      );
    }

    const lower = provider.toLowerCase();
    const cleanKey = apiKey.trim();

    // Verify key against actual provider API
    let models = [];
    if (lower === "gemini") {
      try {
        const probeRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
        );
        if (!probeRes.ok) {
          const errData = await probeRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Lỗi kết nối Gemini API (Mã: ${probeRes.status})`;
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }
      } catch (e: unknown) {
        return NextResponse.json(
          { error: `Không thể kết nối đến Google Gemini: ${e instanceof Error ? e.message : String(e)}` },
          { status: 500 }
        );
      }
      const gemini = new GeminiProvider(cleanKey);
      models = await gemini.getModels();
      persistKeyToFile("GEMINI_API_KEY", cleanKey);
    } else if (lower === "groq") {
      try {
        const probeRes = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${cleanKey}` },
        });
        if (!probeRes.ok) {
          const errData = await probeRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Lỗi kết nối Groq API (Mã: ${probeRes.status})`;
          return NextResponse.json({ error: errMsg }, { status: 400 });
        }
      } catch (e: unknown) {
        return NextResponse.json(
          { error: `Không thể kết nối đến Groq API: ${e instanceof Error ? e.message : String(e)}` },
          { status: 500 }
        );
      }
      const groq = new GroqProvider(cleanKey);
      models = await groq.getModels();
      persistKeyToFile("GROQ_API_KEY", cleanKey);
    } else {
      return NextResponse.json(
        { error: `Provider '${provider}' chưa được hỗ trợ lưu key` },
        { status: 400 }
      );
    }

    // Save key to runtime
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

    if (lower === "gemini") persistKeyToFile("GEMINI_API_KEY", undefined);
    if (lower === "groq") persistKeyToFile("GROQ_API_KEY", undefined);

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
