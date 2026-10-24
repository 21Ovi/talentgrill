-- Practice courses: CourseCreatorAgent turns a session's quick feedback and
-- answers into a short course. One per session, linked to the agent run.

-- Widen the task list only (no existing row changes).
alter table agent_runs drop constraint agent_runs_task_check;
alter table agent_runs add constraint agent_runs_task_check
  check (task in ('hint','quick_eval','followup','full_eval','course_plan'));

create table courses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id),
  agent_run_id uuid not null references agent_runs(id),
  trainer text not null,
  plan jsonb not null,  -- {title, summary, lessons: [{title, why, teach, example, drill}]}
  created_at timestamptz not null default now()
);
