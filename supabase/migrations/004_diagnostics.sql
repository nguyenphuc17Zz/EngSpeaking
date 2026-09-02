-- Phase 4 diagnostics
create extension if not exists "pgcrypto";

create table if not exists speaking_evaluations (
  id text primary key,
  session_id text not null,
  session_type text not null,
  overall_practice_score integer not null check (overall_practice_score between 0 and 100),
  dimensions jsonb not null,
  confidence jsonb not null,
  completeness text not null check (completeness in ('too_short','partial','sufficient','rich')),
  evaluation jsonb not null,
  snapshot jsonb not null,
  evaluator_version text not null,
  schema_version integer not null,
  model text,
  provider text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists turn_evaluations (
  id text primary key,
  evaluation_id text not null references speaking_evaluations(id) on delete cascade,
  turn_id text not null,
  scores jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists diagnostic_issues (
  id text primary key,
  evaluation_id text not null references speaking_evaluations(id) on delete cascade,
  category text not null,
  severity text not null check (severity in ('minor','moderate','major')),
  recurrence_key text,
  evidence text,
  confidence double precision,
  created_at timestamptz not null default now()
);

create table if not exists diagnostic_patterns (
  id text primary key,
  evaluation_id text not null references speaking_evaluations(id) on delete cascade,
  pattern_key text not null,
  frequency integer not null,
  created_at timestamptz not null default now()
);

create table if not exists speaking_recommendations (
  id text primary key,
  evaluation_id text not null references speaking_evaluations(id) on delete cascade,
  skill text not null,
  priority text not null check (priority in ('high','medium','low')),
  reason text not null,
  evidence_ids text[] not null default '{}',
  suggested_exercise_types text[] not null default '{}',
  target_metric text,
  created_at timestamptz not null default now()
);

create index if not exists idx_evals_session on speaking_evaluations(session_id);
create index if not exists idx_evals_generated on speaking_evaluations(generated_at desc);
create index if not exists idx_turn_evals_eval on turn_evaluations(evaluation_id);
create index if not exists idx_issues_eval on diagnostic_issues(evaluation_id);
create index if not exists idx_patterns_eval on diagnostic_patterns(evaluation_id);
create index if not exists idx_recs_eval on speaking_recommendations(evaluation_id);

alter table speaking_evaluations disable row level security;
alter table turn_evaluations disable row level security;
alter table diagnostic_issues disable row level security;
alter table diagnostic_patterns disable row level security;
alter table speaking_recommendations disable row level security;
