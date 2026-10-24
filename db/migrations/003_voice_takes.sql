-- A recorded answer transcribed by ElevenLabs. The audio itself is never stored.
-- Voice answers point at their take, so the saved transcript is the vendor's,
-- not whatever the browser sends.
create table voice_takes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  question_id uuid not null references questions(id),
  mode text not null check (mode in ('live','stub')),
  transcript text not null,
  words jsonb not null default '[]',   -- [{text, start, end}] in seconds, for pace and pauses
  duration_ms int not null,            -- recording length measured in the browser
  audio_bytes int not null,
  language_code text,
  created_at timestamptz not null default now()
);
create index voice_takes_session_idx on voice_takes (session_id);

alter table answers add column voice_take_id uuid references voice_takes(id);
