-- Phase 9: AI Content Banking & Dynamic Caching Engine
-- Stores AI-generated tasks, scenarios, and prompts with SHA-256 deduplication and user exposure history

create extension if not exists "pgcrypto";

create table if not exists content_banks (
  id text primary key,
  module text not null, -- 'sentence_builder', 'vn_to_en', 'latency', 'survival', 'chunks', 'conversation'
  category text not null default 'general',
  level text not null default 'all', -- 'controlled', 'semi_controlled', 'free', 'A1', 'A2', 'B1', 'B2', etc.
  difficulty integer not null default 3 check (difficulty between 1 and 10),
  topic text not null default 'general',
  content_hash text not null, -- SHA-256 normalized hash to prevent near/exact duplicates
  payload jsonb not null, -- The complete validated task/prompt JSON object
  quality_score numeric(3,2) not null default 1.00,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique index prevents duplicate items for the same module
create unique index if not exists idx_content_banks_hash on content_banks(module, content_hash);

-- Fast lookup indexes by module, difficulty, level, and topic
create index if not exists idx_content_banks_lookup on content_banks(module, difficulty, level);
create index if not exists idx_content_banks_topic on content_banks(module, topic);
create index if not exists idx_content_banks_usage on content_banks(usage_count asc);

-- Track which user has encountered which content to enforce 14-day anti-repetition window
create table if not exists user_content_exposures (
  id text primary key,
  user_id text not null default 'local_user',
  content_id text not null references content_banks(id) on delete cascade,
  module text not null,
  exposed_at timestamptz not null default now(),
  score integer,
  completed boolean not null default true
);

create index if not exists idx_user_exposures_lookup on user_content_exposures(user_id, module, exposed_at desc);
create index if not exists idx_user_exposures_content on user_content_exposures(content_id);

alter table content_banks disable row level security;
alter table user_content_exposures disable row level security;
