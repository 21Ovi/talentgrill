-- Password accounts: scrypt hash set at sign-up; null for numbers that signed up
-- before passwords existed (their next sign-up sets one).
alter table users add column password_hash text;
