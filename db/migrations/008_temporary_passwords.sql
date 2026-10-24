-- Accounts from before passwords existed get the temporary password "Simple@123"
-- (shown on the log-in page) and must set their own right after logging in.
-- Accounts that already chose a password are not touched.
alter table users add column password_must_change boolean not null default false;
update users
   set password_hash = 'scrypt$ikl5oenJ00fheWeCZpWXOg==$eDyIPtjpvyIu4ILB32QJ/OwV2tMxLk7Yf5Ni3+TKg5Tz3ruUYI7lBkkHLJbv84v/9pTm+MU7T+60FHkPHtgAWA==',
       password_must_change = true
 where password_hash is null;
