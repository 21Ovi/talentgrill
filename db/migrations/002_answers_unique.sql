-- One answer per question per session (follow-up answers have no question_id).
create unique index answers_session_question_uidx
  on answers (session_id, question_id)
  where question_id is not null;
