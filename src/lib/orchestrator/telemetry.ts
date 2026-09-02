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

const memoryLog: TelemetryRecord[] = [];
const MAX_LOG = 500;

export function recordTelemetry(r: TelemetryRecord): void {
  memoryLog.push(r);
  if (memoryLog.length > MAX_LOG) memoryLog.shift();
  // Also persist via Supabase if configured (fire-and-forget)
  try {
    if (typeof window === "undefined") {
      // server: try supabase insert (best effort)
      import("@/lib/supabase/client").then(({ createServerClient, isSupabaseConfigured }) => {
        if (!isSupabaseConfigured()) return;
        const supabase = createServerClient();
        if (!supabase) return;
        supabase.from("ai_requests").insert({
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
        }).then(() => {});
      }).catch(() => {});
    }
  } catch {}
}

export function getTelemetry(limit = 100): TelemetryRecord[] {
  return memoryLog.slice(-limit).reverse();
}

export function getUsageStats() {
  const now = Date.now();
  const dayAgo = now - 86400000;
  const weekAgo = now - 604800000;
  const dayLogs = memoryLog.filter((r) => new Date(r.createdAt).getTime() > dayAgo);
  const weekLogs = memoryLog.filter((r) => new Date(r.createdAt).getTime() > weekAgo);
  const byProvider = (logs: TelemetryRecord[]) => {
    const m = new Map<string, number>();
    for (const r of logs) m.set(r.providerId, (m.get(r.providerId) || 0) + 1);
    return Object.fromEntries(m);
  };
  return {
    requestsToday: dayLogs.length,
    requestsWeek: weekLogs.length,
    tokensToday: dayLogs.reduce((s, r) => s + (r.usage?.totalTokens || 0), 0),
    tokensWeek: weekLogs.reduce((s, r) => s + (r.usage?.totalTokens || 0), 0),
    byProvider: byProvider(dayLogs),
    cacheHitRate: memoryLog.length ? memoryLog.filter((r) => r.cacheHit).length / memoryLog.length : 0,
    avgLatency: memoryLog.length ? Math.round(memoryLog.reduce((s, r) => s + r.latencyMs, 0) / memoryLog.length) : 0,
    errors: memoryLog.filter((r) => r.status === "error").length,
  };
}
