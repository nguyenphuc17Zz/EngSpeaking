// Structured dev logging per §43 — never logs secrets

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production" && level === "debug") return;
  const payload = data ? ` ${JSON.stringify(sanitize(data))}` : "";
  const prefix = `[VoiceEngine:${event}]`;
  if (level === "error") console.error(prefix, data ? sanitize(data) : "");
  else if (level === "warn") console.warn(prefix, data ? sanitize(data) : "");
  else console.log(prefix + payload);
}

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...obj };
  for (const k of Object.keys(clone)) {
    if (/api[_-]?key|secret|authorization|token/i.test(k)) clone[k] = "***";
    if (typeof clone[k] === "string" && (clone[k] as string).length > 500) clone[k] = (clone[k] as string).slice(0, 500) + "…";
  }
  return clone;
}

export const logger = {
  sessionStarted: (data?: Record<string, unknown>) => log("info", "session_started", data),
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
