-- Phase 8 progress analytics
create extension if not exists "pgcrypto";

create table if not exists skill_history (
  id text primary key,
  learner_state_id text not null,
  skill_id text not null,
  captured_at timestamptz not null default now(),
  mastery double precision not null check (mastery >=0 and mastery <=1),
  confidence double precision not null check (confidence >=0 and confidence <=1),
  retention_risk double precision,
  trend text,
  practice_count integer not null default 0,
  source_session_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_skill_history_learner_skill on skill_history(learner_state_id, skill_id);
create index if not exists idx_skill_history_captured on skill_history(captured_at desc);

create table if not exists dimension_snapshots (
  id text primary key,
  learner_state_id text not null,
  captured_at timestamptz not null default now(),
  dimensions jsonb not null,
  overall integer not null check (overall >=0 and overall <=100),
  evaluation_id text references speaking_evaluations(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_dimension_snapshots_learner on dimension_snapshots(learner_state_id);
create index if not exists idx_dimension_snapshots_captured on dimension_snapshots(captured_at desc);

create table if not exists learning_milestones (
  id text primary key,
  learner_state_id text not null,
  type text not null,
  title text not null,
  description text not null,
  achieved_at timestamptz not null default now(),
  evidence_session_id text,
  skill_ids text[] not null default '{}',
  significance text not null check (significance in ('minor','major')),
  created_at timestamptz not null default now()
);
create index if not exists idx_milestones_learner on learning_milestones(learner_state_id);
create index if not exists idx_milestones_achieved on learning_milestones(achieved_at desc);

create table if not exists trend_records (
  id text primary key,
  learner_state_id text not null,
  metric_key text not null,
  value double precision not null,
  smoothed double precision,
  confidence text,
  calculated_at timestamptz not null default now()
);
create index if not exists idx_trend_records_learner_metric on trend_records(learner_state_id, metric_key);
create index if not exists idx_trend_records_calculated on trend_records(calculated_at desc);

create table if not exists progress_reports (
  id text primary key,
  learner_state_id text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  report jsonb not null,
  learner_state_version integer,
  report_version text not null default '1.0.0',
  prompt_version text,
  created_at timestamptz not null default now(),
  unique(learner_state_id, period_start, period_end)
);
create index if not exists idx_progress_reports_learner on progress_reports(learner_state_id);
create index if not exists idx_progress_reports_period on progress_reports(period_start, period_end);

alter table skill_history disable row level security;
alter table dimension_snapshots disable row level security;
alter table learning_milestones disable row level security;
alter table trend_records disable row level security;
alter table progress_reports disable row level security;
