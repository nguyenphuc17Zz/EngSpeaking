-- Phase 2 Foundation — speaking foundation engine
create extension if not exists "pgcrypto";

create table if not exists foundation_baselines (
  id text primary key,
  created_at timestamptz not null default now(),
  overall integer not null,
  level_suggestion integer not null,
  response_speed integer not null,
  sentence_production integer not null,
  fluency integer not null,
  vocabulary_retrieval integer not null,
  grammar_in_speech integer not null,
  confidence integer not null,
  expansion_ability integer not null,
  recovery_ability integer not null,
  tasks jsonb not null default '[]'
);

create table if not exists foundation_sessions (
  id text primary key,
  exercise_id text not null,
  mode text not null check (mode in ('learn','practice','challenge','daily')),
  skill text not null,
  difficulty integer not null check (difficulty between 1 and 10),
  exercise_type text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active' check (status in ('created','active','completed','abandoned')),
  created_at timestamptz not null default now()
);

create table if not exists foundation_attempts (
  id text primary key,
  session_id text not null references foundation_sessions(id) on delete cascade,
  exercise_id text not null,
  transcript text not null,
  raw_transcript text not null,
  duration_ms integer,
  time_to_first_word_ms integer,
  hints_used integer not null default 0,
  hint_level integer not null default 0,
  score_overall integer,
  completed boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists speech_banks (
  id text primary key,
  category text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_foundation_sessions_started_at on foundation_sessions(started_at desc);
create index if not exists idx_foundation_attempts_session on foundation_attempts(session_id);
create index if not exists idx_foundation_attempts_created on foundation_attempts(created_at desc);

alter table foundation_baselines disable row level security;
alter table foundation_sessions disable row level security;
alter table foundation_attempts disable row level security;
alter table speech_banks disable row level security;
