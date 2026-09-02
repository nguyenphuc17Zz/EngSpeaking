-- Phase 6 advanced training
create extension if not exists "pgcrypto";

create table if not exists advanced_training_sessions (
  id text primary key,
  learner_state_id text,
  mode text,
  primary_skill text,
  secondary_skills text[] default '{}',
  estimated_duration integer not null,
  difficulty jsonb not null default '{}',
  pressure text,
  topic text,
  scenario jsonb,
  plan jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists advanced_training_blocks (
  id text primary key,
  session_id text not null references advanced_training_sessions(id) on delete cascade,
  type text not null,
  objective text not null,
  skill_targets text[] default '{}',
  difficulty jsonb not null default '{}',
  estimated_duration integer not null,
  instructions text not null,
  scenario jsonb,
  constraints text[] default '{}',
  order_index integer not null,
  created_at timestamptz not null default now()
);

create table if not exists advanced_training_challenges (
  id text primary key,
  session_id text not null references advanced_training_sessions(id) on delete cascade,
  block_id text,
  type text not null,
  trigger text not null,
  purpose text not null,
  effect text not null,
  triggered_at timestamptz not null default now()
);

create table if not exists advanced_training_outcomes (
  id text primary key,
  session_id text not null references advanced_training_sessions(id) on delete cascade,
  module text not null,
  objectives text[] default '{}',
  turns integer not null default 0,
  challenges_encountered text[] default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_adv_sessions_created on advanced_training_sessions(created_at desc);
create index if not exists idx_adv_blocks_session on advanced_training_blocks(session_id);
create index if not exists idx_adv_challenges_session on advanced_training_challenges(session_id);

alter table advanced_training_sessions disable row level security;
alter table advanced_training_blocks disable row level security;
alter table advanced_training_challenges disable row level security;
alter table advanced_training_outcomes disable row level security;
