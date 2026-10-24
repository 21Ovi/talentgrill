-- A live voice interview with the ElevenLabs interviewer agent. After the call,
-- the server fetches the transcript from ElevenLabs (never from the browser) and
-- saves one voice take + answer per question, linked back to the call.
create table live_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  agent_id text not null,
  conversation_id text unique,                 -- ElevenLabs conversation id
  status text not null default 'STARTED'
    check (status in ('STARTED','SAVED','FAILED')),
  questions jsonb not null,                    -- [{number, question_id}] asked in this call
  transcript jsonb,                            -- ElevenLabs transcript turns
  duration_secs int,
  error text,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index live_calls_session_idx on live_calls (session_id);

alter table voice_takes add column live_call_id uuid references live_calls(id);
