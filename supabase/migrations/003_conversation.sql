-- Phase 3 Dynamic Conversation — conversation worlds
create extension if not exists "pgcrypto";

create table if not exists conversation_worlds (
  id text primary key,
  mode text not null,
  scenario_blueprint jsonb not null,
  settings jsonb not null default '{}',
  fingerprint text,
  schema_version integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists conversation_turns_world (
  id text primary key,
  world_id text not null references conversation_worlds(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  text text not null,
  timestamp timestamptz not null default now(),
  duration_ms integer,
  time_to_first_word_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists conversation_facts (
  id text primary key,
  world_id text not null references conversation_worlds(id) on delete cascade,
  fact text not null,
  created_at timestamptz not null default now()
);

create table if not exists conversation_events (
  id text primary key,
  world_id text not null references conversation_worlds(id) on delete cascade,
  type text not null,
  effect text not null,
  turn_index integer,
  created_at timestamptz not null default now()
);

create table if not exists conversation_summaries (
  world_id text primary key references conversation_worlds(id) on delete cascade,
  summary jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_worlds_fingerprint on conversation_worlds(fingerprint);
create index if not exists idx_worlds_created on conversation_worlds(created_at desc);
create index if not exists idx_world_turns_world on conversation_turns_world(world_id);
create index if not exists idx_facts_world on conversation_facts(world_id);
create index if not exists idx_events_world on conversation_events(world_id);

alter table conversation_worlds disable row level security;
alter table conversation_turns_world disable row level security;
alter table conversation_facts disable row level security;
alter table conversation_events disable row level security;
alter table conversation_summaries disable row level security;
