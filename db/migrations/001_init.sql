create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,               -- normalized +91XXXXXXXXXX
  role_target text not null,
  ref_code text not null unique,            -- 6 chars
  referred_by uuid references users(id),
  source text,                              -- from ?src= : qr, whatsapp, linkedin, x, direct
  is_internal boolean not null default false,     -- phone listed in INTERNAL_PHONES
  is_event_staff boolean not null default false,  -- self-declared checkbox
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  domain text not null,       -- Tech | Management & Finance | Sales & HR
  role text not null,
  kind text not null check (kind in ('behavioral','situational','domain')),
  tier text not null check (tier in ('free','pro')),
  position int not null,
  question_text text not null,
  rubric jsonb not null,      -- dimensions with weights and descriptors for scores 1, 3 and 5
  created_at timestamptz not null default now(),
  unique (role, tier, position)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  role text not null,
  status text not null default 'IN_PROGRESS' check (status in
    ('IN_PROGRESS','FREE_DONE','PRO_IN_PROGRESS','EVALUATING',
     'AWAITING_APPROVAL','CERTIFIED','NOT_CERTIFIED','EVAL_FAILED')),
  is_pro boolean not null default false,
  quick_feedback jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index sessions_user_idx on sessions (user_id);

create table answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  question_id uuid references questions(id),
  followup_text text,                        -- set when answering an agent follow-up
  input_mode text not null check (input_mode in ('voice','text')),
  transcript text not null,
  duration_ms int,
  hints_used int not null default 0,
  paste_detected boolean not null default false,
  created_at timestamptz not null default now()
);
create index answers_session_idx on answers (session_id);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  task text not null check (task in ('hint','quick_eval','followup','full_eval')),
  mode text not null check (mode in ('live','stub')),
  agenticorg_run_id text,
  status text not null default 'RUNNING' check (status in ('RUNNING','SUCCEEDED','FAILED')),
  input jsonb not null,
  output jsonb,
  error text,
  latency_ms int,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index agent_runs_session_idx on agent_runs (session_id);

create table scorecards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id),
  agent_run_id uuid not null references agent_runs(id),
  overall_score int not null check (overall_score between 0 and 100),
  dimensions jsonb not null,       -- [{dimension, score 1-5, evidence_quote}]
  signals jsonb not null,          -- computed in code: word counts, filler words, durations
  strengths jsonb not null,
  gaps jsonb not null,
  model_answers jsonb not null,
  recommendation text not null check (recommendation in ('CERTIFY','DO_NOT_CERTIFY')),
  recommendation_reason text not null,
  risk_flags jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table certifications (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id),
  scorecard_id uuid not null references scorecards(id),
  hitl_status text not null default 'PENDING_APPROVAL'
    check (hitl_status in ('PENDING_APPROVAL','APPROVED','REJECTED')),
  agenticorg_approval_id text,
  reviewer text,
  reviewer_note text,
  public_slug text unique,
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);
create index certifications_status_idx on certifications (hitl_status);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  session_id uuid not null references sessions(id),
  amount_paise int not null,
  env text not null check (env in ('sandbox','live')),
  pine_labs_order_id text unique,
  pine_labs_payment_id text,
  status text not null default 'CREATED'
    check (status in ('CREATED','PENDING','SUCCESS','FAILED')),
  raw_webhook jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_session_idx on payments (session_id);

create table events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  actor text not null check (actor in ('user','agent','admin','system','webhook')),
  type text not null,
  user_id uuid,
  session_id uuid,
  payload jsonb not null default '{}'
);
create index events_ts_idx on events (ts desc);
create index events_type_idx on events (type);
create index events_session_idx on events (session_id);

-- The audit log is provably append-only: no UPDATE, DELETE or TRUNCATE.
create function events_block_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'events is append-only (% blocked)', tg_op;
end
$$;

create trigger events_no_update_delete
  before update or delete on events
  for each row execute function events_block_mutation();

create trigger events_no_truncate
  before truncate on events
  for each statement execute function events_block_mutation();
