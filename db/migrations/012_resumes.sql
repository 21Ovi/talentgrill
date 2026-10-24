-- Optional resume per session: only the structured profile written by
-- ResumeReaderAgent is kept, never the file or its raw text.
alter table agent_runs drop constraint agent_runs_task_check;
alter table agent_runs add constraint agent_runs_task_check
  check (task in ('hint','quick_eval','followup','full_eval','course_plan','company_prep','resume_read'));

create table resumes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id),
  agent_run_id uuid not null references agent_runs(id),
  file_type text not null check (file_type in ('pdf','text')),
  chars int not null,
  profile jsonb not null,  -- {headline, education, skills, projects, experience, achievements, talking_points, gaps}
  created_at timestamptz not null default now()
);
