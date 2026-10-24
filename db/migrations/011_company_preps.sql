-- Company-specific preparation, unlocked at 80+: one guide per session and company,
-- written by FresherCoachAgent in the practice-course shape.
alter table agent_runs drop constraint agent_runs_task_check;
alter table agent_runs add constraint agent_runs_task_check
  check (task in ('hint','quick_eval','followup','full_eval','course_plan','company_prep'));

create table company_preps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  company text not null,
  agent_run_id uuid not null references agent_runs(id),
  plan jsonb not null,  -- same shape as courses.plan
  created_at timestamptz not null default now(),
  unique (session_id, company)
);
