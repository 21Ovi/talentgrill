-- Lessons the candidate has marked as practised (1-based lesson numbers).
alter table courses add column completed_lessons smallint[] not null default '{}';
