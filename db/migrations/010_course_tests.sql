-- Final test results for a practice course: best score (percent) and when.
alter table courses add column test_score smallint check (test_score between 0 and 100);
alter table courses add column test_taken_at timestamptz;
