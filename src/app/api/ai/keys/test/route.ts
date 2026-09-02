import { NextResponse } from "next/server";
import { getProviderApiKey } from "@/lib/config/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin provider ('gemini' hoặc 'groq')" },
        { status: 400 }
      );
    }

    const lower = provider.toLowerCase();
    const key = getProviderApiKey(lower);

    if (!key) {
      return NextResponse.json(
        {
          success: false,
          error: `Chưa cấu hình API Key cho ${provider.toUpperCase()}. Vui lòng nhập key trước khi kiểm tra.`,
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    if (lower === "gemini") {
      const probeRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        { method: "GET" }
      );

      const latencyMs = Date.now() - startTime;

      if (!probeRes.ok) {
        const errData = await probeRes.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          `Google Gemini API trả về mã lỗi ${probeRes.status}. Vui lòng kiểm tra lại Key hoặc Quota.`;
        return NextResponse.json(
          { success: false, provider: lower, latencyMs, error: errMsg },
          { status: 400 }
        );
      }

      const data = await probeRes.json().catch(() => ({}));
      const modelsCount = Array.isArray(data.models) ? data.models.length : 0;

      return NextResponse.json({
        success: true,
        provider: lower,
        latencyMs,
        modelsCount,
        message: `Khóa API Google Gemini hoạt động hoàn hảo! Phản hồi trong ${latencyMs}ms (${modelsCount} models sẵn sàng).`,
      });
    } else if (lower === "groq") {
      const probeRes = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
      });

      const latencyMs = Date.now() - startTime;

      if (!probeRes.ok) {
        const errData = await probeRes.json().catch(() => ({}));
        const errMsg =
          errData.error?.message ||
          `Groq API trả về mã lỗi ${probeRes.status}. Vui lòng kiểm tra lại Key hoặc Quota.`;
        return NextResponse.json(
          { success: false, provider: lower, latencyMs, error: errMsg },
          { status: 400 }
        );
      }

      const data = await probeRes.json().catch(() => ({}));
      const modelsCount = Array.isArray(data.data) ? data.data.length : 0;

      return NextResponse.json({
        success: true,
        provider: lower,
        latencyMs,
        modelsCount,
        message: `Khóa API Groq hoạt động hoàn hảo! Phản hồi trong ${latencyMs}ms (${modelsCount} models sẵn sàng).`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: `Provider '${provider}' chưa hỗ trợ kiểm tra` },
        { status: 400 }
      );
    }
  } catch (e: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: `Không thể kết nối tới máy chủ AI: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 }
    );
  }
}
