// Telemetry §12, §52-53, §58
export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  audioSeconds?: number;
  estimatedCost?: number;
}

export interface TelemetryRecord {
  requestId: string;
  task: string;
  providerId: string;
  modelId: string;
  promptVersion?: string;
  latencyMs: number;
  usage?: AIUsage;
  cacheHit: boolean;
  retryCount: number;
  status: "success" | "error";
  errorCode?: string;
  createdAt: string;
}

import { telemetryRepo } from "@/lib/db/sqlite-db";

const memoryLog: TelemetryRecord[] = [];
const MAX_LOG = 500;

function mapDbRowToTelemetryRecord(row: Record<string, unknown>): TelemetryRecord {
  return {
    requestId: String(row.request_id || ""),
    task: String(row.task || "general"),
    providerId: String(row.provider_id || "unknown"),
    modelId: String(row.model_id || "unknown"),
    promptVersion: row.prompt_version ? String(row.prompt_version) : undefined,
    latencyMs: Number(row.latency_ms ?? 0),
    usage:
      row.input_tokens != null || row.output_tokens != null || row.total_tokens != null
        ? {
            inputTokens: row.input_tokens != null ? Number(row.input_tokens) : undefined,
            outputTokens: row.output_tokens != null ? Number(row.output_tokens) : undefined,
            totalTokens: row.total_tokens != null ? Number(row.total_tokens) : undefined,
          }
        : undefined,
    cacheHit: Boolean(row.cache_hit),
    retryCount: Number(row.retry_count ?? 0),
    status: row.status === "error" ? "error" : "success",
    errorCode: row.error_code ? String(row.error_code) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function getHydratedLogs(limit = MAX_LOG): TelemetryRecord[] {
  if (memoryLog.length > 0) return memoryLog;
  try {
    if (typeof window === "undefined") {
      const rows = telemetryRepo.getAiUsageStats(limit);
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows
          .map((r) => mapDbRowToTelemetryRecord(r as Record<string, unknown>))
          .reverse();
        for (const item of mapped) {
          if (memoryLog.length < MAX_LOG) memoryLog.push(item);
        }
      }
    }
  } catch {}
  return memoryLog;
}

export function recordTelemetry(r: TelemetryRecord): void {
  memoryLog.push(r);
  if (memoryLog.length > MAX_LOG) memoryLog.shift();
  // Also persist via SQLite
  try {
    if (typeof window === "undefined") {
      telemetryRepo.recordAiRequest({
        request_id: r.requestId,
        task: r.task,
        provider_id: r.providerId,
        model_id: r.modelId,
        prompt_version: r.promptVersion,
        status: r.status,
        latency_ms: r.latencyMs,
        cache_hit: r.cacheHit,
        retry_count: r.retryCount,
        input_tokens: r.usage?.inputTokens,
        output_tokens: r.usage?.outputTokens,
        total_tokens: r.usage?.totalTokens,
        error_code: r.errorCode,
      });
    }
  } catch {}
}

export function getTelemetry(limit = 100): TelemetryRecord[] {
  const logs = getHydratedLogs(Math.max(limit, MAX_LOG));
  return logs.slice(-limit).reverse();
}

export function getUsageStats() {
  const logs = getHydratedLogs(MAX_LOG);
  const now = Date.now();
  const dayAgo = now - 86400000;
  const weekAgo = now - 604800000;
  const dayLogs = logs.filter((r) => new Date(r.createdAt).getTime() > dayAgo);
  const weekLogs = logs.filter((r) => new Date(r.createdAt).getTime() > weekAgo);
  const byProvider = (items: TelemetryRecord[]) => {
    const m = new Map<string, number>();
    for (const r of items) m.set(r.providerId, (m.get(r.providerId) || 0) + 1);
    return Object.fromEntries(m);
  };
  return {
    requestsToday: dayLogs.length,
    requestsWeek: weekLogs.length,
    tokensToday: dayLogs.reduce((s, r) => s + (r.usage?.totalTokens || 0), 0),
    tokensWeek: weekLogs.reduce((s, r) => s + (r.usage?.totalTokens || 0), 0),
    byProvider: byProvider(dayLogs),
    cacheHitRate: logs.length ? logs.filter((r) => r.cacheHit).length / logs.length : 0,
    avgLatency: logs.length ? Math.round(logs.reduce((s, r) => s + r.latencyMs, 0) / logs.length) : 0,
    errors: logs.filter((r) => r.status === "error").length,
  };
}
