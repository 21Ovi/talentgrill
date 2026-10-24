-- Every account created before passwords existed (before migration 007 ran) gets
-- the temporary password Simple@123 with a forced change, even if it set a
-- password by signing up again before 008. Accounts that already completed the
-- forced change, and accounts created after passwords launched, are untouched.
update users
   set password_hash = 'scrypt$ikl5oenJ00fheWeCZpWXOg==$eDyIPtjpvyIu4ILB32QJ/OwV2tMxLk7Yf5Ni3+TKg5Tz3ruUYI7lBkkHLJbv84v/9pTm+MU7T+60FHkPHtgAWA==',
       password_must_change = true
 where created_at < (select min(ts) from events where type = 'migration_applied' and payload->>'file' = '007_user_passwords.sql')
   and not exists (select 1 from events e where e.type = 'password_changed' and e.user_id = users.id);
