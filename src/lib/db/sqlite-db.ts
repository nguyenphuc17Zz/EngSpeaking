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

    -- 4. Speaking Evaluations & Diagnostics
    CREATE TABLE IF NOT EXISTS speaking_evaluations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      session_type TEXT NOT NULL,
      overall_practice_score INTEGER NOT NULL,
      dimensions TEXT NOT NULL,
      confidence TEXT NOT NULL,
      completeness TEXT NOT NULL,
      evaluation TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      evaluator_version TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      model TEXT,
      provider TEXT,
      generated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_evals_session ON speaking_evaluations(session_id);
    CREATE INDEX IF NOT EXISTS idx_evals_generated ON speaking_evaluations(generated_at DESC);

    -- 5. Progress Analytics & Milestones
    CREATE TABLE IF NOT EXISTS skill_history (
      id TEXT PRIMARY KEY,
      learner_state_id TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      mastery REAL NOT NULL,
      confidence REAL NOT NULL,
      retention_risk REAL,
      trend TEXT,
      practice_count INTEGER NOT NULL DEFAULT 0,
      source_session_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_skill_history_learner_skill ON skill_history(learner_state_id, skill_id);
    CREATE INDEX IF NOT EXISTS idx_skill_history_captured ON skill_history(captured_at DESC);

    CREATE TABLE IF NOT EXISTS dimension_snapshots (
      id TEXT PRIMARY KEY,
      learner_state_id TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      dimensions TEXT NOT NULL,
      overall INTEGER NOT NULL,
      evaluation_id TEXT,
      session_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_dimension_snapshots_learner ON dimension_snapshots(learner_state_id);
    CREATE INDEX IF NOT EXISTS idx_dimension_snapshots_captured ON dimension_snapshots(captured_at DESC);

    CREATE TABLE IF NOT EXISTS learning_milestones (
      id TEXT PRIMARY KEY,
      learner_state_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      achieved_at TEXT NOT NULL,
      evidence_session_id TEXT,
      skill_ids TEXT NOT NULL DEFAULT '[]',
      significance TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_milestones_learner ON learning_milestones(learner_state_id);
    CREATE INDEX IF NOT EXISTS idx_milestones_achieved ON learning_milestones(achieved_at DESC);

    CREATE TABLE IF NOT EXISTS intervention_outcomes (
      id TEXT PRIMARY KEY,
      skill_id TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      before_score REAL NOT NULL,
      after_score REAL NOT NULL,
      improvement REAL NOT NULL,
      confidence REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progress_reports (
      id TEXT PRIMARY KEY,
      learner_state_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      report TEXT NOT NULL,
      learner_state_version INTEGER,
      report_version TEXT NOT NULL DEFAULT '1.0.0',
      prompt_version TEXT,
      created_at TEXT NOT NULL
    );

    -- 6. Curriculum & Learning Plans
    CREATE TABLE IF NOT EXISTS learning_plans (
      id TEXT PRIMARY KEY,
      learner_state_id TEXT NOT NULL,
      title TEXT NOT NULL,
      objective TEXT NOT NULL,
      estimated_duration_minutes INTEGER NOT NULL,
      primary_skill TEXT,
      secondary_skills TEXT NOT NULL DEFAULT '[]',
      expected_outcome TEXT NOT NULL,
      plan_version INTEGER NOT NULL DEFAULT 1,
      generated_at TEXT NOT NULL,
      generation_reason TEXT NOT NULL,
      teacher_version TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      blocks TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_learning_plans_learner ON learning_plans(learner_state_id);

    CREATE TABLE IF NOT EXISTS learner_states (
      id TEXT PRIMARY KEY,
      profile TEXT NOT NULL,
      skills TEXT NOT NULL,
      goals TEXT NOT NULL,
      preferences TEXT NOT NULL DEFAULT '{}',
      curriculum_state TEXT NOT NULL DEFAULT '{}',
      speaking_profile TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- 7. Conversation Worlds
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

export const evaluationRepo = {
  save(data: {
    id: string;
    session_id: string;
    session_type: string;
    overall_practice_score: number;
    dimensions: any;
    confidence: any;
    completeness: string;
    evaluation: any;
    snapshot: any;
    evaluator_version: string;
    schema_version: number;
    model?: string | null;
    provider?: string | null;
    generated_at: string;
  }): void {
    const db = getAppDb();
    db.prepare(`
      INSERT OR REPLACE INTO speaking_evaluations (id, session_id, session_type, overall_practice_score, dimensions, confidence, completeness, evaluation, snapshot, evaluator_version, schema_version, model, provider, generated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.session_id,
      data.session_type,
      data.overall_practice_score,
      JSON.stringify(data.dimensions),
      JSON.stringify(data.confidence),
      data.completeness,
      JSON.stringify(data.evaluation),
      JSON.stringify(data.snapshot),
      data.evaluator_version,
      data.schema_version,
      data.model || null,
      data.provider || null,
      data.generated_at,
      new Date().toISOString()
    );
  },

  getBySession(sessionId: string): any | null {
    const db = getAppDb();
    const row = db.prepare("SELECT * FROM speaking_evaluations WHERE session_id = ? ORDER BY generated_at DESC LIMIT 1").get(sessionId) as any | undefined;
    if (!row) return null;
    return parseEvaluationRow(row);
  },

  get(id: string): any | null {
    const db = getAppDb();
    const row = db.prepare("SELECT * FROM speaking_evaluations WHERE id = ?").get(id) as any | undefined;
    if (!row) return null;
    return parseEvaluationRow(row);
  },

  getLatest(): any | null {
    const db = getAppDb();
    const row = db.prepare("SELECT * FROM speaking_evaluations ORDER BY generated_at DESC LIMIT 1").get() as any | undefined;
    if (!row) return null;
    return parseEvaluationRow(row);
  },

  list(limit = 20): any[] {
    const db = getAppDb();
    const rows = db.prepare("SELECT * FROM speaking_evaluations ORDER BY generated_at DESC LIMIT ?").all(limit) as any[];
    return rows.map(parseEvaluationRow);
  },

  listSince(since: Date, limit = 100): any[] {
    const db = getAppDb();
    const rows = db.prepare("SELECT * FROM speaking_evaluations WHERE generated_at >= ? ORDER BY generated_at ASC LIMIT ?").all(since.toISOString(), limit) as any[];
    return rows.map(parseEvaluationRow);
  },
};

function parseEvaluationRow(row: any) {
  try { row.dimensions = JSON.parse(row.dimensions); } catch {}
  try { row.confidence = JSON.parse(row.confidence); } catch {}
  try { row.evaluation = JSON.parse(row.evaluation); } catch {}
  try { row.snapshot = JSON.parse(row.snapshot); } catch {}
  return row;
}

export const progressRepo = {
  recordSkillHistory(data: {
    learner_state_id?: string;
    skill_id: string;
    captured_at?: string;
    mastery: number;
    confidence: number;
    retention_risk?: number | null;
    trend?: string | null;
    practice_count?: number;
    source_session_id?: string | null;
  }): void {
    const db = getAppDb();
    const id = `skh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO skill_history (id, learner_state_id, skill_id, captured_at, mastery, confidence, retention_risk, trend, practice_count, source_session_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.learner_state_id || "default_learner",
      data.skill_id,
      data.captured_at || new Date().toISOString(),
      data.mastery,
      data.confidence,
      data.retention_risk ?? null,
      data.trend ?? null,
      data.practice_count ?? 1,
      data.source_session_id ?? null,
      new Date().toISOString()
    );
  },

  getSkillHistory(learnerId: string, skillId: string, since?: Date, limit = 200): any[] {
    const db = getAppDb();
    const sinceIso = since ? since.toISOString() : "1970-01-01T00:00:00.000Z";
    return db.prepare("SELECT * FROM skill_history WHERE learner_state_id = ? AND skill_id = ? AND captured_at >= ? ORDER BY captured_at ASC LIMIT ?").all(learnerId, skillId, sinceIso, limit) as any[];
  },

  recordDimensionSnapshot(data: {
    learner_state_id?: string;
    captured_at?: string;
    dimensions: any;
    overall: number;
    evaluation_id?: string | null;
    session_id?: string | null;
  }): void {
    const db = getAppDb();
    const id = `dsnap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO dimension_snapshots (id, learner_state_id, captured_at, dimensions, overall, evaluation_id, session_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.learner_state_id || "default_learner",
      data.captured_at || new Date().toISOString(),
      JSON.stringify(data.dimensions),
      data.overall,
      data.evaluation_id || null,
      data.session_id || null,
      new Date().toISOString()
    );
  },

  getDimensionSnapshots(learnerId: string, since?: Date, limit = 200): any[] {
    const db = getAppDb();
    const sinceIso = since ? since.toISOString() : "1970-01-01T00:00:00.000Z";
    const rows = db.prepare("SELECT * FROM dimension_snapshots WHERE learner_state_id = ? AND captured_at >= ? ORDER BY captured_at ASC LIMIT ?").all(learnerId, sinceIso, limit) as any[];
    return rows.map((r) => {
      try { r.dimensions = JSON.parse(r.dimensions); } catch {}
      return r;
    });
  },

  recordMilestone(data: {
    learner_state_id?: string;
    type: string;
    title: string;
    description: string;
    achieved_at?: string;
    evidence_session_id?: string | null;
    skill_ids?: string[];
    significance: "minor" | "major";
  }): void {
    const db = getAppDb();
    const id = `ms_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO learning_milestones (id, learner_state_id, type, title, description, achieved_at, evidence_session_id, skill_ids, significance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.learner_state_id || "default_learner",
      data.type,
      data.title,
      data.description,
      data.achieved_at || new Date().toISOString(),
      data.evidence_session_id || null,
      JSON.stringify(data.skill_ids || []),
      data.significance,
      new Date().toISOString()
    );
  },

  getMilestones(learnerId: string, limit = 100): any[] {
    const db = getAppDb();
    const rows = db.prepare("SELECT * FROM learning_milestones WHERE learner_state_id = ? ORDER BY achieved_at DESC LIMIT ?").all(learnerId, limit) as any[];
    return rows.map((r) => {
      try { r.skill_ids = JSON.parse(r.skill_ids); } catch {}
      return r;
    });
  },

  recordInterventionOutcome(data: {
    skill_id: string;
    exercise_type: string;
    before_score: number;
    after_score: number;
    improvement: number;
    confidence: number;
  }): void {
    const db = getAppDb();
    const id = `int_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
      INSERT INTO intervention_outcomes (id, skill_id, exercise_type, before_score, after_score, improvement, confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.skill_id,
      data.exercise_type,
      data.before_score,
      data.after_score,
      data.improvement,
      data.confidence,
      new Date().toISOString()
    );
  },

  getInterventionOutcomes(limit = 50): any[] {
    const db = getAppDb();
    return db.prepare("SELECT * FROM intervention_outcomes ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
  },

  saveProgressReport(data: {
    id?: string;
    learner_state_id?: string;
    period_start: string;
    period_end: string;
    report: any;
    report_version?: string;
  }): void {
    const db = getAppDb();
    const id = data.id || `rep_${Date.now()}`;
    db.prepare(`
      INSERT OR REPLACE INTO progress_reports (id, learner_state_id, period_start, period_end, report, report_version, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.learner_state_id || "default_learner",
      data.period_start,
      data.period_end,
      JSON.stringify(data.report),
      data.report_version || "1.0.0",
      new Date().toISOString()
    );
  },

  getLatestProgressReport(learnerId: string, since?: Date): any | null {
    const db = getAppDb();
    const sinceIso = since ? since.toISOString() : "1970-01-01T00:00:00.000Z";
    const row = db.prepare("SELECT * FROM progress_reports WHERE learner_state_id = ? AND period_start >= ? ORDER BY created_at DESC LIMIT 1").get(learnerId, sinceIso) as any | undefined;
    if (!row) return null;
    try { row.report = JSON.parse(row.report); } catch {}
    return row;
  },
};

export const curriculumRepo = {
  savePlan(plan: {
    id: string;
    learner_state_id?: string;
    title: string;
    objective: string;
    estimated_duration_minutes: number;
    primary_skill?: string;
    secondary_skills?: string[];
    expected_outcome: string;
    plan_version?: number;
    generated_at?: string;
    generation_reason?: string;
    teacher_version?: string;
    schema_version?: number;
    blocks?: any[];
  }): void {
    const db = getAppDb();
    db.prepare(`
      INSERT OR REPLACE INTO learning_plans (id, learner_state_id, title, objective, estimated_duration_minutes, primary_skill, secondary_skills, expected_outcome, plan_version, generated_at, generation_reason, teacher_version, schema_version, blocks, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      plan.id,
      plan.learner_state_id || "default_learner",
      plan.title,
      plan.objective,
      plan.estimated_duration_minutes,
      plan.primary_skill || "general",
      JSON.stringify(plan.secondary_skills || []),
      plan.expected_outcome,
      plan.plan_version ?? 1,
      plan.generated_at || new Date().toISOString(),
      plan.generation_reason || "Decision engine recommendation",
      plan.teacher_version || "1.0.0",
      plan.schema_version ?? 1,
      JSON.stringify(plan.blocks || []),
      new Date().toISOString()
    );
  },

  listPlans(learnerId = "default_learner", limit = 20): any[] {
    const db = getAppDb();
    const rows = db.prepare("SELECT * FROM learning_plans WHERE learner_state_id = ? ORDER BY generated_at DESC LIMIT ?").all(learnerId, limit) as any[];
    return rows.map((r) => {
      try { r.secondary_skills = JSON.parse(r.secondary_skills); } catch {}
      try { r.blocks = JSON.parse(r.blocks); } catch {}
      return r;
    });
  },

  getPlan(id: string): any | null {
    const db = getAppDb();
    const row = db.prepare("SELECT * FROM learning_plans WHERE id = ?").get(id) as any | undefined;
    if (!row) return null;
    try { row.secondary_skills = JSON.parse(row.secondary_skills); } catch {}
    try { row.blocks = JSON.parse(row.blocks); } catch {}
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

  resetUserData(learnerId = "default_learner"): void {
    const db = getAppDb();
    db.prepare("DELETE FROM skill_history WHERE learner_state_id = ?").run(learnerId);
    db.prepare("DELETE FROM dimension_snapshots WHERE learner_state_id = ?").run(learnerId);
    db.prepare("DELETE FROM learning_milestones WHERE learner_state_id = ?").run(learnerId);
    db.prepare("DELETE FROM progress_reports WHERE learner_state_id = ?").run(learnerId);
    db.prepare("DELETE FROM learning_plans WHERE learner_state_id = ?").run(learnerId);
    db.prepare("DELETE FROM speaking_evaluations").run();
  },
};
