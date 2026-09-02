-- Phase 5 learner & curriculum
create extension if not exists "pgcrypto";

create table if not exists learner_states (
  id text primary key,
  profile jsonb not null,
  skills jsonb not null,
  goals jsonb not null,
  preferences jsonb not null default '{}',
  curriculum_state jsonb not null default '{}',
  speaking_profile jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists learning_goals (
  id text primary key,
  learner_state_id text not null references learner_states(id) on delete cascade,
  goal_id text not null,
  label text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists curriculum_states (
  learner_state_id text primary key references learner_states(id) on delete cascade,
  current_focus text,
  focus_started_at timestamptz,
  current_plan_id text,
  consecutive_successful_sessions integer not null default 0,
  consecutive_failed_sessions integer not null default 0,
  recently_completed_skills text[] not null default '{}',
  upcoming_review_skills text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists learning_plans (
  id text primary key,
  learner_state_id text not null references learner_states(id) on delete cascade,
  title text not null,
  objective text not null,
  estimated_duration_minutes integer not null,
  primary_skill text,
  secondary_skills text[] not null default '{}',
  expected_outcome text not null,
  plan_version integer not null default 1,
  generated_at timestamptz not null default now(),
  generation_reason text not null,
  teacher_version text not null,
  schema_version integer not null,
  blocks jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists learning_blocks (
  id text primary key,
  plan_id text not null references learning_plans(id) on delete cascade,
  type text not null,
  skill_id text,
  exercise_type text,
  duration_minutes integer not null,
  difficulty integer not null,
  rationale text not null,
  order_index integer not null,
  created_at timestamptz not null default now()
);

create table if not exists learner_state_changes (
  id text primary key,
  learner_state_id text not null references learner_states(id) on delete cascade,
  field text not null,
  previous jsonb,
  new jsonb,
  reason text not null,
  source_session_id text,
  timestamp timestamptz not null default now()
);

create table if not exists intervention_outcomes (
  id text primary key,
  skill_id text not null,
  exercise_type text not null,
  before_score double precision not null,
  after_score double precision not null,
  improvement double precision not null,
  confidence double precision not null,
  created_at timestamptz not null default now()
);

create table if not exists teaching_preferences (
  learner_state_id text primary key references learner_states(id) on delete cascade,
  optimal_difficulty integer,
  pressure_tolerance integer,
  preferred_exercise_types text[] not null default '{}',
  effective_exercise_types text[] not null default '{}',
  support_preference text,
  feedback_preference text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_learner_states_updated on learner_states(updated_at desc);
create index if not exists idx_learning_plans_learner on learning_plans(learner_state_id);
create index if not exists idx_learning_blocks_plan on learning_blocks(plan_id);
create index if not exists idx_state_changes_learner on learner_state_changes(learner_state_id);

alter table learner_states disable row level security;
alter table learning_goals disable row level security;
alter table curriculum_states disable row level security;
alter table learning_plans disable row level security;
alter table learning_blocks disable row level security;
alter table learner_state_changes disable row level security;
alter table intervention_outcomes disable row level security;
alter table teaching_preferences disable row level security;
