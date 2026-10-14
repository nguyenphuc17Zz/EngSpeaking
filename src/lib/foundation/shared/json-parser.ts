// Shared AI JSON Sanitizer & Truncated Output Repair Utility
// Strips reasoning tags (<think>, <thought>), markdown code fences, invalid assignments,
// trailing commas, and repairs truncated JSON strings/brackets using a LIFO stack.

/**
 * Cleans raw AI text output into a valid or repaired JSON string.
 */
export function cleanAiJson(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  // 1. Strip reasoning / thinking tokens (<think> or <thought>)
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .trim();

  // 2. Extract content from markdown code block if present
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  // Clean invalid assignments like `var_name = "..."` inside arrays/objects
  const sanitizeSyntax = (str: string): string =>
    str
      .replace(/\b[a-zA-Z0-9_]+\s*=\s*(")/g, "$1")
      .replace(/,\s*([}\]])/g, "$1");

  // 3. Direct JSON parse verification
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {}

  const sanitizedDirect = sanitizeSyntax(cleaned);
  try {
    JSON.parse(sanitizedDirect);
    return sanitizedDirect;
  } catch {}

  // 4. Try locating the outermost JSON object { ... } or array [ ... ]
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const isArrayFirst =
    firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);

  if (isArrayFirst) {
    const lastBracket = cleaned.lastIndexOf("]");
    if (lastBracket > firstBracket) {
      const candidate = sanitizeSyntax(cleaned.slice(firstBracket, lastBracket + 1));
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {}
    }
  }

  if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        const withoutTrailingCommas = sanitizeSyntax(candidate);
        try {
          JSON.parse(withoutTrailingCommas);
          return withoutTrailingCommas;
        } catch {}
      }
    }
  }

  // 5. Truncated JSON recovery: if output was cut off, attempt auto-closing with a LIFO stack
  const startIdx =
    firstBrace !== -1 && firstBracket !== -1
      ? Math.min(firstBrace, firstBracket)
      : firstBrace !== -1
      ? firstBrace
      : firstBracket;

  if (startIdx !== -1) {
    const text = sanitizeSyntax(cleaned.slice(startIdx).trim());
    const stack: string[] = [];
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (ch === "\\" && !isEscaped) {
          isEscaped = true;
        } else if (ch === '"' && !isEscaped) {
          inString = false;
        } else {
          isEscaped = false;
        }
      } else {
        if (ch === '"') {
          inString = true;
        } else if (ch === "{") {
          stack.push("}");
        } else if (ch === "[") {
          stack.push("]");
        } else if (ch === "}") {
          if (stack.length > 0 && stack[stack.length - 1] === "}") {
            stack.pop();
          }
        } else if (ch === "]") {
          if (stack.length > 0 && stack[stack.length - 1] === "]") {
            stack.pop();
          }
        }
      }
    }

    let repaired = text;
    if (inString) {
      repaired += '"';
    }

    // Remove any dangling comma before closing
    repaired = repaired.replace(/,\s*$/, "");

    // If ended with dangling key: e.g. "key": -> add empty string
    if (/:\s*$/.test(repaired)) {
      repaired += '""';
    }

    // Close remaining in LIFO order
    while (stack.length > 0) {
      const closer = stack.pop();
      if (closer) repaired += closer;
    }

    repaired = sanitizeSyntax(repaired);
    return repaired;
  }

  return sanitizedDirect;
}

/**
 * Convenience helper that cleans raw AI text and parses it into a JavaScript value,
 * returning null if parsing fails.
 */
export function parseAiJson<T = unknown>(raw: string): T | null {
  const cleaned = cleanAiJson(raw);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
