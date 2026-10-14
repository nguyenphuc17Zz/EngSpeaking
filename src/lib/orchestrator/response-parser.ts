// Central JSON parser + repair §40
export function extractJson(text: string): unknown | null {
  const withoutThink = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .trim();
  const t = withoutThink.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(t); } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch { const arr = t.match(/\[[\s\S]*\]/); if (arr) try { return JSON.parse(arr[0]); } catch {} }
    return null;
  }
}

export function repairPrompt(originalError: string, schemaHint?: string, malformedOutput?: string): string {
  const rawSnippet = malformedOutput ? `\n\nMalformed output to repair:\n${malformedOutput.slice(0, 2000)}` : "";
  return `Your previous output failed validation: ${originalError}.${rawSnippet}\n\n${schemaHint || "Return ONLY valid JSON matching the requested schema, no markdown."} Do not resend full context, just the corrected JSON.`;
}
