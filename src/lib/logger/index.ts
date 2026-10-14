// Structured dev logging per §43 — never logs secrets

type LogLevel = "info" | "warn" | "error" | "debug";

function sanitizeValue(val: unknown, depth = 0): unknown {
  if (depth > 5 || val === null || val === undefined) return val;
  if (typeof val === "string") {
    return val.length > 500 ? val.slice(0, 500) + "…" : val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof val === "object") {
    return sanitize(val as Record<string, unknown>, depth + 1);
  }
  return val;
}

function sanitize(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/api[_-]?key|secret|authorization|token|password/i.test(k)) {
      clone[k] = "***";
    } else {
      clone[k] = sanitizeValue(v, depth);
    }
  }
  return clone;
}

function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production" && level === "debug") return;
  const sanitized = data ? sanitize(data) : undefined;
  const prefix = `[VoiceEngine:${event}]`;
  if (level === "error") console.error(prefix, sanitized ?? "");
  else if (level === "warn") console.warn(prefix, sanitized ?? "");
  else console.log(sanitized ? `${prefix} ${JSON.stringify(sanitized)}` : prefix);
}

export const logger = {
  sessionStarted: (data?: Record<string, unknown>) => log("info", "session_started", data),
  sessionEnded: (data?: Record<string, unknown>) => log("info", "session_ended", data),
  recordingStarted: (data?: Record<string, unknown>) => log("info", "recording_started", data),
  recordingStopped: (data?: Record<string, unknown>) => log("info", "recording_stopped", data),
  sttStarted: (data?: Record<string, unknown>) => log("info", "stt_started", data),
  sttCompleted: (data?: Record<string, unknown>) => log("info", "stt_completed", data),
  aiStarted: (data?: Record<string, unknown>) => log("info", "ai_started", data),
  aiCompleted: (data?: Record<string, unknown>) => log("info", "ai_completed", data),
  ttsStarted: (data?: Record<string, unknown>) => log("info", "tts_started", data),
  ttsCompleted: (data?: Record<string, unknown>) => log("info", "tts_completed", data),
  providerSelected: (data?: Record<string, unknown>) => log("info", "provider_selected", data),
  modelSelected: (data?: Record<string, unknown>) => log("info", "model_selected", data),
  error: (data?: Record<string, unknown>) => log("error", "error", data),
  debug: (event: string, data?: Record<string, unknown>) => log("debug", event, data),
};
