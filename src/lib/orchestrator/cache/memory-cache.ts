// Simple LRU memory cache §32
type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();
const MAX_SIZE = 200;

export function cacheGet(key: string): unknown | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) { store.delete(key); return undefined; }
  // LRU: move to end
  store.delete(key);
  store.set(key, e);
  return e.value;
}

export function cacheSet(key: string, value: unknown, ttlMs: number): void {
  if (store.size >= MAX_SIZE) {
    const first = store.keys().next().value as string | undefined;
    if (first) store.delete(first);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(prefix?: string): void {
  if (!prefix) store.clear();
  else for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((obj as Record<string, unknown>)[k])}`).join(",")}}`;
}

export function buildCacheKey(parts: Record<string, unknown>): string {
  // Stable JSON with sorted keys recursively
  const sorted = Object.keys(parts).sort().map((k) => `${k}=${stableStringify(parts[k])}`).join("|");
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) hash = (hash * 31 + sorted.charCodeAt(i)) >>> 0;
  return `${hash.toString(16)}:${sorted.slice(0, 80)}`;
}

export function getTTL(task: string): number {
  // §89 different TTLs
  if (task === "scenario_generation") return 1000 * 60 * 30; // 30m
  if (task === "exercise_generation") return 1000 * 60 * 30;
  if (task === "conversation_summary") return 1000 * 60 * 60;
  if (task.includes("evaluation")) return 1000 * 60 * 60 * 2;
  return 1000 * 60 * 5; // default 5m
}

// Periodic sweep for expired entries §19
if (typeof globalThis !== "undefined" && typeof setInterval !== "undefined") {
  try {
    // Only run on server
    if (typeof window === "undefined") {
      setInterval(() => {
        const now = Date.now();
        for (const [k, v] of Array.from(store.entries())) {
          if (now > v.expiresAt) store.delete(k);
        }
      }, 60000).unref?.();
    }
  } catch {}
}
