// Unified SQLite Database Manager for EnglishSpeaking
// Replaces Supabase 100% with local, persistent SQLite (node:sqlite) storage.
import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
export const APP_DB_PATH = path.join(DATA_DIR, "app.db");

let dbInstance: DatabaseSync | null = null;

/**
 * Initializes and returns the unified SQLite database singleton.
 * Automatically runs all table migrations and performance indexes on startup.
 */
export function getAppDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  dbInstance = new DatabaseSync(APP_DB_PATH);

  // High performance & concurrency config
  dbInstance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  initializeSchema(dbInstance);
  migrateLegacyContentBanks(dbInstance);

  return dbInstance;
}

/**
 * Creates all tables and indexes.
 */
function initializeSchema(db: DatabaseSync) {
  db.exec(`
    -- 1. Universal Content Bank & Exposures
    CREATE TABLE IF NOT EXISTS content_banks (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      level TEXT NOT NULL DEFAULT 'all',
      difficulty INTEGER NOT NULL DEFAULT 3,
      topic TEXT NOT NULL DEFAULT 'general',
      content_hash TEXT NOT NULL,
      payload TEXT NOT NULL,
      quality_score REAL NOT NULL DEFAULT 1.0,
      usage_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_content_banks_hash ON content_banks(module, content_hash);
    CREATE INDEX IF NOT EXISTS idx_content_banks_lookup ON content_banks(module, difficulty, level);
    CREATE INDEX IF NOT EXISTS idx_content_banks_usage ON content_banks(usage_count ASC);

    CREATE TABLE IF NOT EXISTS user_content_exposures (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local_user',
      content_id TEXT NOT NULL,
      module TEXT NOT NULL,
      exposed_at TEXT NOT NULL,
      score INTEGER,
      completed INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_user_exposures_lookup ON user_content_exposures(user_id, module, exposed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_exposures_content ON user_content_exposures(content_id);

    -- 2. Sessions & Conversation Turns
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      provider TEXT,
      model TEXT,
      stt_provider TEXT,
      stt_model TEXT,
      tts_provider TEXT,
      tts_model TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);

    CREATE TABLE IF NOT EXISTS conversation_turns (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      duration_ms INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_turns_session_id ON conversation_turns(session_id);

    -- 3. Foundation Sessions, Attempts & Baselines
    CREATE TABLE IF NOT EXISTS foundation_sessions (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      skill TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      exercise_type TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_foundation_sessions_started ON foundation_sessions(started_at DESC);

    CREATE TABLE IF NOT EXISTS foundation_attempts (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      transcript TEXT NOT NULL,
      raw_transcript TEXT NOT NULL,
      duration_ms INTEGER,
      time_to_first_word_ms INTEGER,
      hints_used INTEGER NOT NULL DEFAULT 0,
      hint_level INTEGER NOT NULL DEFAULT 0,
      score_overall INTEGER,
      completed INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES foundation_sessions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_foundation_attempts_session ON foundation_attempts(session_id);
    CREATE INDEX IF NOT EXISTS idx_foundation_attempts_created ON foundation_attempts(created_at DESC);

    CREATE TABLE IF NOT EXISTS foundation_baselines (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      overall INTEGER NOT NULL,
      level_suggestion INTEGER NOT NULL,
      response_speed INTEGER NOT NULL,
      sentence_production INTEGER NOT NULL,
      fluency INTEGER NOT NULL,
      vocabulary_retrieval INTEGER NOT NULL,
      grammar_in_speech INTEGER NOT NULL,
      confidence INTEGER NOT NULL,
      expansion_ability INTEGER NOT NULL,
      recovery_ability INTEGER NOT NULL,
      tasks TEXT NOT NULL DEFAULT '[]'
    );

    -- 4. Conversation Worlds
    CREATE TABLE IF NOT EXISTS conversation_worlds (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      scenario_blueprint TEXT NOT NULL,
      settings TEXT NOT NULL DEFAULT '{}',
      fingerprint TEXT,
      schema_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    -- 8. AI Observability & Requests Telemetry
    CREATE TABLE IF NOT EXISTS ai_requests (
      request_id TEXT PRIMARY KEY,
      session_id TEXT,
      task TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      prompt_version TEXT,
      status TEXT NOT NULL,
      latency_ms INTEGER,
      cache_hit INTEGER NOT NULL DEFAULT 0,
      retry_count INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      error_code TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_requests_task ON ai_requests(task);
    CREATE INDEX IF NOT EXISTS idx_ai_requests_created ON ai_requests(created_at DESC);

    -- 9. Advanced Sessions
    CREATE TABLE IF NOT EXISTS advanced_training_sessions (
      id TEXT PRIMARY KEY,
      learner_state_id TEXT,
      mode TEXT,
      primary_skill TEXT,
      secondary_skills TEXT DEFAULT '[]',
      estimated_duration INTEGER NOT NULL,
      difficulty TEXT NOT NULL DEFAULT '{}',
      pressure TEXT,
      topic TEXT,
      scenario TEXT,
      plan TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

/**
 * If data/content-banks.db exists from earlier runs, copy existing content_banks into app.db.
 */
function migrateLegacyContentBanks(db: DatabaseSync) {
  const legacyDbPath = path.join(DATA_DIR, "content-banks.db");
  if (!fs.existsSync(legacyDbPath)) return;

  try {
    const legacyDb = new DatabaseSync(legacyDbPath);
    const rows = legacyDb.prepare("SELECT * FROM content_banks").all() as Array<Record<string, any>>;
    if (rows && rows.length > 0) {
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO content_banks (id, module, category, level, difficulty, topic, content_hash, payload, quality_score, usage_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of rows) {
        insertStmt.run(
          r.id,
          r.module,
          r.category || "general",
          r.level || "all",
          r.difficulty ?? 3,
          r.topic || "general",
          r.content_hash,
          typeof r.payload === "string" ? r.payload : JSON.stringify(r.payload),
          r.quality_score ?? 1.0,
          r.usage_count ?? 1,
          r.created_at || new Date().toISOString(),
          r.updated_at || new Date().toISOString()
        );
      }
    }
  } catch {
    // Ignore legacy migration if empty or lock
  }
}

// ==========================================
// REPOSITORY HELPERS (Typed CRUD API)
// ==========================================

export interface SessionRecord {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  provider: string | null;
  model: string | null;
  stt_provider: string | null;
  stt_model: string | null;
  tts_provider: string | null;
  tts_model: string | null;
  created_at: string;
}

export interface ConversationTurnRecord {
  id: string;
  session_id: string;
  role: string;
  text: string;
  timestamp: string;
  duration_ms: number | null;
  created_at: string;
}

export const sessionRepo = {
  create(data: Omit<SessionRecord, "created_at">): SessionRecord {
    const db = getAppDb();
    const created_at = new Date().toISOString();
    const row: SessionRecord = { ...data, created_at };
    db.prepare(`
      INSERT INTO sessions (id, started_at, ended_at, status, provider, model, stt_provider, stt_model, tts_provider, tts_model, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id,
      row.started_at,
      row.ended_at,
      row.status,
      row.provider,
      row.model,
      row.stt_provider,
      row.stt_model,
      row.tts_provider,
      row.tts_model,
      row.created_at
    );
    return row;
  },

  get(id: string): SessionRecord | null {
    const db = getAppDb();
    const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRecord | undefined;
    return row || null;
  },

  updateStatus(id: string, status: string, ended_at?: string): void {
    const db = getAppDb();
    db.prepare("UPDATE sessions SET status = ?, ended_at = ? WHERE id = ?").run(
      status,
      ended_at || new Date().toISOString(),
      id
    );
  },

  list(limit = 50): SessionRecord[] {
    const db = getAppDb();
    return db.prepare("SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?").all(limit) as SessionRecord[];
  },

  addTurn(data: Omit<ConversationTurnRecord, "created_at">): ConversationTurnRecord {
    const db = getAppDb();
    const created_at = new Date().toISOString();
    const row: ConversationTurnRecord = { ...data, created_at };
    db.prepare(`
      INSERT INTO conversation_turns (id, session_id, role, text, timestamp, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(row.id, row.session_id, row.role, row.text, row.timestamp, row.duration_ms, row.created_at);
    return row;
  },

  getTurns(sessionId: string): ConversationTurnRecord[] {
    const db = getAppDb();
    return db.prepare("SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY timestamp ASC").all(sessionId) as ConversationTurnRecord[];
  },
};

export interface FoundationSessionRecord {
  id: string;
  exercise_id: string;
  mode: string;
  skill: string;
  difficulty: number;
  exercise_type: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  created_at: string;
}

export interface FoundationAttemptRecord {
  id: string;
  session_id: string;
  exercise_id: string;
  transcript: string;
  raw_transcript: string;
  duration_ms: number | null;
  time_to_first_word_ms: number | null;
  hints_used: number;
  hint_level: number;
  score_overall: number | null;
  completed: boolean;
  created_at: string;
}

export const foundationRepo = {
  createSession(data: Omit<FoundationSessionRecord, "created_at">): FoundationSessionRecord {
    const db = getAppDb();
    const created_at = new Date().toISOString();
    const row: FoundationSessionRecord = { ...data, created_at };
    db.prepare(`
      INSERT INTO foundation_sessions (id, exercise_id, mode, skill, difficulty, exercise_type, started_at, completed_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id,
      row.exercise_id,
      row.mode,
      row.skill,
      row.difficulty,
      row.exercise_type,
      row.started_at,
      row.completed_at,
      row.status,
      row.created_at
    );
    return row;
  },

  getSession(id: string): FoundationSessionRecord | null {
    const db = getAppDb();
    const row = db.prepare("SELECT * FROM foundation_sessions WHERE id = ?").get(id) as FoundationSessionRecord | undefined;
    return row || null;
  },

  completeSession(id: string, completedAt?: string): void {
    const db = getAppDb();
    db.prepare("UPDATE foundation_sessions SET status = 'completed', completed_at = ? WHERE id = ?").run(
      completedAt || new Date().toISOString(),
      id
    );
  },

  listSessions(limit = 50): FoundationSessionRecord[] {
    const db = getAppDb();
    return db.prepare("SELECT * FROM foundation_sessions ORDER BY started_at DESC LIMIT ?").all(limit) as FoundationSessionRecord[];
  },

  recordAttempt(data: Omit<FoundationAttemptRecord, "created_at">): FoundationAttemptRecord {
    const db = getAppDb();
    const created_at = new Date().toISOString();
    const row: FoundationAttemptRecord = { ...data, created_at };
    db.prepare(`
      INSERT INTO foundation_attempts (id, session_id, exercise_id, transcript, raw_transcript, duration_ms, time_to_first_word_ms, hints_used, hint_level, score_overall, completed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id,
      row.session_id,
      row.exercise_id,
      row.transcript,
      row.raw_transcript,
      row.duration_ms,
      row.time_to_first_word_ms,
      row.hints_used,
      row.hint_level,
      row.score_overall,
      row.completed ? 1 : 0,
      row.created_at
    );
    return row;
  },

  getAttempts(sessionId: string): FoundationAttemptRecord[] {
    const db = getAppDb();
    const rows = db.prepare("SELECT * FROM foundation_attempts WHERE session_id = ? ORDER BY created_at ASC").all(sessionId) as Array<Record<string, any>>;
    return rows.map((r) => ({
      ...r,
      completed: Boolean(r.completed),
    })) as FoundationAttemptRecord[];
  },

  saveBaseline(data: any): void {
    const db = getAppDb();
    db.prepare(`
      INSERT OR REPLACE INTO foundation_baselines (id, created_at, overall, level_suggestion, response_speed, sentence_production, fluency, vocabulary_retrieval, grammar_in_speech, confidence, expansion_ability, recovery_ability, tasks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id || `base_${Date.now()}`,
      data.created_at || new Date().toISOString(),
      data.overall ?? 0,
      data.level_suggestion ?? 1,
      data.response_speed ?? 0,
      data.sentence_production ?? 0,
      data.fluency ?? 0,
      data.vocabulary_retrieval ?? 0,
      data.grammar_in_speech ?? 0,
      data.confidence ?? 0,
      data.expansion_ability ?? 0,
      data.recovery_ability ?? 0,
      typeof data.tasks === "string" ? data.tasks : JSON.stringify(data.tasks || [])
    );
  },

  getLatestBaseline(): any | null {
    const db = getAppDb();
    const row = db.prepare("SELECT * FROM foundation_baselines ORDER BY created_at DESC LIMIT 1").get() as any | undefined;
    if (!row) return null;
    try {
      row.tasks = JSON.parse(row.tasks);
    } catch {}
    return row;
  },
};

export const telemetryRepo = {
  recordAiRequest(data: {
    request_id: string;
    session_id?: string | null;
    task: string;
    provider_id: string;
    model_id: string;
    prompt_version?: string | null;
    status: string;
    latency_ms?: number | null;
    cache_hit?: boolean;
    retry_count?: number;
    input_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
    error_code?: string | null;
  }): void {
    const db = getAppDb();
    db.prepare(`
      INSERT OR REPLACE INTO ai_requests (request_id, session_id, task, provider_id, model_id, prompt_version, status, latency_ms, cache_hit, retry_count, input_tokens, output_tokens, total_tokens, error_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.request_id,
      data.session_id || null,
      data.task,
      data.provider_id,
      data.model_id,
      data.prompt_version || null,
      data.status,
      data.latency_ms ?? null,
      data.cache_hit ? 1 : 0,
      data.retry_count ?? 0,
      data.input_tokens ?? null,
      data.output_tokens ?? null,
      data.total_tokens ?? null,
      data.error_code || null,
      new Date().toISOString()
    );
  },

  getAiUsageStats(limit = 100): any[] {
    const db = getAppDb();
    return db.prepare("SELECT * FROM ai_requests ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
  },
};

export const healthRepo = {
  checkHealth(): { status: "ok" | "error"; dbSize: number; tablesCount: number } {
    try {
      const db = getAppDb();
      const countRow = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
      const stat = fs.existsSync(APP_DB_PATH) ? fs.statSync(APP_DB_PATH) : { size: 0 };
      return {
        status: "ok",
        dbSize: stat.size,
        tablesCount: countRow?.count ?? 0,
      };
    } catch {
      return {
        status: "error",
        dbSize: 0,
        tablesCount: 0,
      };
    }
  },

  resetUserData(): void {
    const db = getAppDb();
    db.prepare("DELETE FROM user_content_exposure").run();
    db.prepare("DELETE FROM ai_telemetry").run();
  },
};
