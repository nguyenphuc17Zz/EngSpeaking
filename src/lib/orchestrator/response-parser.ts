// Central JSON parser + repair §40
export function extractJson(text: string): unknown | null {
  const t = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch { const arr = t.match(/\[[\s\S]*\]/); if (arr) try { return JSON.parse(arr[0]); } catch {} }
    return null;
  }
}

export function repairPrompt(originalError: string, schemaHint?: string): string {
  return `Your previous output failed validation: ${originalError}. ${schemaHint || "Return ONLY valid JSON matching the requested schema, no markdown."} Do not resend full context, just the corrected JSON.`;
}
