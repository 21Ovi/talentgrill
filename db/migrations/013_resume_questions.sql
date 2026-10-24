-- A main interview question written from the candidate's resume: one per
-- session, stored with the bank but tied to that session only.
alter table questions add column session_id uuid references sessions(id);
alter table questions drop constraint questions_role_tier_position_key;
create unique index questions_bank_slot on questions (role, tier, position) where session_id is null;
create unique index questions_session_slot on questions (session_id) where session_id is not null;

alter table agent_runs drop constraint agent_runs_task_check;
alter table agent_runs add constraint agent_runs_task_check
  check (task in ('hint','quick_eval','followup','full_eval','course_plan','company_prep','resume_read','resume_question'));
