-- Phase 1 sessions & conversation_turns §26, §27
-- Run in Supabase SQL editor

-- Enable UUID generation
create extension if not exists "pgcrypto";

create table if not exists sessions (
  id text primary key,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active','completed','error')),
  provider text,
  model text,
  stt_provider text,
  stt_model text,
  tts_provider text,
  tts_model text,
  created_at timestamptz not null default now()
);

create table if not exists conversation_turns (
  id text primary key,
  session_id text not null references sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  text text not null,
  timestamp timestamptz not null default now(),
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_turns_session_id on conversation_turns(session_id);
create index if not exists idx_sessions_started_at on sessions(started_at desc);

-- Optional: enable RLS later when auth added; for now permissive
alter table sessions disable row level security;
alter table conversation_turns disable row level security;
