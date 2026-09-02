-- Phase 7 orchestration & observability
create extension if not exists "pgcrypto";

create table if not exists ai_requests (
  request_id text primary key,
  session_id text,
  task text not null,
  provider_id text not null,
  model_id text not null,
  prompt_version text,
  status text not null check (status in ('success','error','pending')),
  latency_ms integer,
  cache_hit boolean not null default false,
  retry_count integer not null default 0,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists ai_usage (
  id text primary key,
  provider_id text not null,
  model_id text not null,
  task text not null,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  audio_seconds double precision,
  estimated_cost double precision,
  created_at timestamptz not null default now()
);

create table if not exists ai_model_configs (
  provider_id text not null,
  model_id text not null,
  capabilities jsonb not null default '{}',
  speed_class text,
  quality_class text,
  cost_class text,
  active boolean not null default true,
  primary key (provider_id, model_id)
);

create table if not exists ai_provider_configs (
  provider_id text primary key,
  configured boolean not null,
  health_status text,
  last_checked_at timestamptz
);

create table if not exists ai_prompt_versions (
  id text primary key,
  name text not null,
  version text not null,
  task text not null,
  template text not null,
  variables text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(name, version)
);

create table if not exists ai_cache_entries (
  cache_key text primary key,
  task text not null,
  provider_id text not null,
  model_id text not null,
  prompt_version text,
  input_hash text not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists ai_routing_decisions (
  id text primary key,
  task text not null,
  selected_provider text not null,
  selected_model text not null,
  reason text not null,
  alternatives jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_requests_task on ai_requests(task);
create index if not exists idx_ai_requests_provider on ai_requests(provider_id);
create index if not exists idx_ai_requests_created on ai_requests(created_at desc);
create index if not exists idx_ai_usage_provider on ai_usage(provider_id);
create index if not exists idx_ai_usage_task on ai_usage(task);

alter table ai_requests disable row level security;
alter table ai_usage disable row level security;
alter table ai_model_configs disable row level security;
alter table ai_provider_configs disable row level security;
alter table ai_prompt_versions disable row level security;
alter table ai_cache_entries disable row level security;
alter table ai_routing_decisions disable row level security;
