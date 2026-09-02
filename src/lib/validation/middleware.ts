import { z } from "zod";
import { NextResponse } from "next/server";

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ", details: parsed.error.flatten() } },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const obj: Record<string, string> = {};
  for (const [k, v] of searchParams.entries()) obj[k] = v;
  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Tham số không hợp lệ", details: parsed.error.flatten() } },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
