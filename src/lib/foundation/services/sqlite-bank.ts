import { DatabaseSync } from "node:sqlite";
import { getAppDb } from "@/lib/db/sqlite-db";
import type {
  ContentBankRecord,
  SampleBankOptions,
  SampleBankResult,
} from "./content-bank.service";

/**
 * Initializes and returns the unified SQLite database singleton.
 */
export function getSqliteDb(): DatabaseSync {
  return getAppDb();
}

/**
 * Saves or updates a task in the SQLite database.
 */
export function saveSqliteBankTask(
  record: ContentBankRecord
): ContentBankRecord {
  const db = getSqliteDb();

  // Check if existing record with same module & content_hash
  const checkStmt = db.prepare(
    "SELECT id, usage_count FROM content_banks WHERE module = ? AND content_hash = ?"
  );
  const existing = checkStmt.get(record.module, record.content_hash) as
    | { id: string; usage_count: number }
    | undefined;

  if (existing) {
    const updateStmt = db.prepare(
      "UPDATE content_banks SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?"
    );
    updateStmt.run(record.updated_at, existing.id);
    return {
      ...record,
      id: existing.id,
      usage_count: existing.usage_count + 1,
    };
  }

  const insertStmt = db.prepare(`
    INSERT INTO content_banks (
      id, module, category, level, difficulty, topic, content_hash, payload, quality_score, usage_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    record.id,
    record.module,
    record.category,
    record.level,
    record.difficulty,
    record.topic,
    record.content_hash,
    typeof record.payload === "string" ? record.payload : JSON.stringify(record.payload),
    record.quality_score,
    record.usage_count,
    record.created_at,
    record.updated_at
  );

  return record;
}

/**
 * Samples a task from SQLite according to module, difficulty, and anti-repetition rules.
 */
export function sampleSqliteBankTask<T>(
  options: SampleBankOptions
): SampleBankResult<T> | null {
  const db = getSqliteDb();
  const {
    module,
    category,
    difficulty,
    level,
    topic,
    userId = "local_user",
    maxAgeDays = 14,
    bankRatio = 0.7,
    forceSource = "auto",
  } = options;

  if (forceSource === "ai") return null;

  if (forceSource === "auto") {
    if (Math.random() > bankRatio) return null;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  const cutoffIso = cutoffDate.toISOString();

  // 1. Fetch recent exposure content IDs to exclude
  const expStmt = db.prepare(
    "SELECT content_id FROM user_content_exposures WHERE user_id = ? AND module = ? AND exposed_at >= ?"
  );
  const recentExposures = expStmt.all(userId, module, cutoffIso) as Array<{
    content_id: string;
  }>;
  const excludedIds = new Set(recentExposures.map((e) => e.content_id));

  // 2. Build candidate query
  let sql = "SELECT * FROM content_banks WHERE module = ?";
  const params: unknown[] = [module];

  if (category && category !== "all") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (level && level !== "all") {
    sql += " AND level = ?";
    params.push(level);
  }
  if (topic && topic !== "all" && topic !== "general") {
    sql += " AND topic = ?";
    params.push(topic);
  }

  // Difficulty tolerance +/- 1
  if (typeof difficulty === "number") {
    sql += " AND difficulty BETWEEN ? AND ?";
    params.push(Math.max(1, difficulty - 1), Math.min(10, difficulty + 1));
  }

  sql += " ORDER BY usage_count ASC";

  const candidateStmt = db.prepare(sql);
  const candidates = candidateStmt.all(...params) as Array<{
    id: string;
    payload: string;
    usage_count: number;
  }>;

  // Filter out recently exposed items
  const eligible = candidates.filter((c) => !excludedIds.has(c.id));
  const pool = eligible.length > 0 ? eligible : candidates;

  if (pool.length === 0) return null;

  // Random pick from least-used candidates
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  // Increment usage
  try {
    const incStmt = db.prepare(
      "UPDATE content_banks SET usage_count = usage_count + 1 WHERE id = ?"
    );
    incStmt.run(chosen.id);
  } catch {}

  let parsedPayload: T;
  try {
    parsedPayload = typeof chosen.payload === "string" ? JSON.parse(chosen.payload) : (chosen.payload as T);
  } catch {
    return null;
  }

  return {
    task: parsedPayload,
    contentId: chosen.id,
    source: "bank",
    usageCount: chosen.usage_count + 1,
  };
}

/**
 * Records an exposure in SQLite to enforce 14-day anti-repetition.
 */
export function recordSqliteUserExposure(
  contentId: string,
  module: string,
  userId = "local_user",
  score?: number
): void {
  const db = getSqliteDb();
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  try {
    const stmt = db.prepare(`
      INSERT INTO user_content_exposures (id, user_id, content_id, module, exposed_at, score, completed)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    stmt.run(id, userId, contentId, module, now, score ?? null);
  } catch {}
}

/**
 * Finds a task by exact content hash in SQLite.
 */
export function findSqliteBankTaskByHash<T>(
  module: string,
  hash: string
): T | null {
  const db = getSqliteDb();
  try {
    const stmt = db.prepare(
      "SELECT id, payload, usage_count FROM content_banks WHERE module = ? AND content_hash = ?"
    );
    const row = stmt.get(module, hash) as
      | { id: string; payload: string; usage_count: number }
      | undefined;

    if (!row) return null;

    // Increment usage
    const incStmt = db.prepare(
      "UPDATE content_banks SET usage_count = usage_count + 1 WHERE id = ?"
    );
    incStmt.run(row.id);

    return typeof row.payload === "string" ? JSON.parse(row.payload) : (row.payload as T);
  } catch {
    return null;
  }
}

/**
 * Retrieves aggregate content bank stats by module.
 */
export function getSqliteBankStats(): Record<string, number> {
  const db = getSqliteDb();
  try {
    const stmt = db.prepare(
      "SELECT module, count(*) as count FROM content_banks GROUP BY module"
    );
    const rows = stmt.all() as Array<{ module: string; count: number }>;
    const stats: Record<string, number> = {};
    for (const r of rows) {
      stats[r.module] = r.count;
    }
    return stats;
  } catch {
    return {};
  }
}

/**
 * Returns total count of user content exposures in SQLite.
 */
export function getSqliteExposureCount(): number {
  const db = getSqliteDb();
  try {
    const stmt = db.prepare(
      "SELECT count(*) as count FROM user_content_exposures"
    );
    const row = stmt.get() as { count: number } | undefined;
    return row?.count || 0;
  } catch {
    return 0;
  }
}

