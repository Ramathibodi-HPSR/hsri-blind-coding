-- Access-rule test for the lead role, the practice key and adjudication (migration 20261126000300).
-- Run as postgres. Uses throwaway users with the coder1/coder2 emails and a temporary lead entry, so run it only
-- before the real coder1/coder2 accounts exist (or adapt the emails). Every row should show ok = true.
create temp table t (n serial, label text, ok boolean, detail text);
grant all on t to authenticated, anon;
grant usage on sequence t_n_seq to authenticated, anon;
insert into public.coders (email, label, role) values ('lead-test@hsricode.test', 'LeadTest', 'lead');
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','coder1@hsricode.test'),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','coder2@hsricode.test'),
 ('00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-000000000000','authenticated','authenticated','lead-test@hsricode.test');
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b9","email":"lead-test@hsricode.test","role":"authenticated"}',false);
insert into public.codes (user_id, contactno, practice, domain, approach, state, critical, rights, purpose, rules)
  values ('00000000-0000-0000-0000-0000000000b9','99-001',true,'biomedical','quant','no','no','no','diagnosis','within');
insert into t (label, ok) select 'lead writes a practice key row', count(*) = 1 from public.codes;
do $$ begin insert into public.codes (contactno, practice, domain) values ('63-001', false, 'biomedical'); insert into t (label, ok, detail) values ('lead cannot code the main set', false, 'insert succeeded'); exception when others then insert into t (label, ok, detail) values ('lead cannot code the main set', true, sqlstate); end $$;
do $$ begin insert into public.submissions default values; insert into t (label, ok, detail) values ('lead cannot submit', false, 'insert succeeded'); exception when others then insert into t (label, ok, detail) values ('lead cannot submit', true, sqlstate); end $$;
insert into t (label, ok, detail) select 'progress lists coders only', count(*) = 2, string_agg(label, ',') from public.coding_progress();
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b1","email":"coder1@hsricode.test","role":"authenticated"}',false);
insert into t (label, ok, detail) select 'coder sees no key before finishing practice', count(*) = 0, count(*)::text from public.practice_key();
insert into public.codes (user_id, contactno, practice, domain, approach, state, critical, rights, purpose, rules)
  select '00000000-0000-0000-0000-0000000000b1', '99-00' || g, true, 'biomedical','quant','no','no','no','diagnosis','within' from generate_series(1,5) g;
insert into t (label, ok, detail) select 'coder sees the key after 5 practice items', count(*) = 1, count(*)::text from public.practice_key();
insert into public.codes (user_id, contactno, domain, approach, state, critical, rights, purpose, rules)
  values ('00000000-0000-0000-0000-0000000000b1','63-001','health_systems_public_health','quant','yes','no','no','diagnosis','within');
insert into public.submissions default values;
do $$ begin insert into public.adjudications (contactno, field, value) values ('63-001','state','yes'); insert into t (label, ok, detail) values ('coder cannot adjudicate', false, 'insert succeeded'); exception when others then insert into t (label, ok, detail) values ('coder cannot adjudicate', true, sqlstate); end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b9","email":"lead-test@hsricode.test","role":"authenticated"}',false);
insert into t (label, ok, detail) select 'no disagreements shown before both submit', count(*) = 0, count(*)::text from public.disagreements();
do $$ begin insert into public.adjudications (contactno, field, value) values ('63-001','state','yes'); insert into t (label, ok, detail) values ('lead cannot decide before both submit', false, 'insert succeeded'); exception when others then insert into t (label, ok, detail) values ('lead cannot decide before both submit', true, sqlstate); end $$;
insert into t (label, ok, detail) select 'lead cannot read coder answers', count(*) = 0, count(*)::text from public.codes where not practice;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b2","email":"coder2@hsricode.test","role":"authenticated"}',false);
insert into public.codes (user_id, contactno, domain, approach, state, critical, rights, purpose, rules)
  values ('00000000-0000-0000-0000-0000000000b2','63-001','health_systems_public_health','quant','no','no','borderline','diagnosis','within');
insert into public.submissions default values;
insert into t (label, ok, detail) select 'coder sees no disagreements', count(*) = 0, count(*)::text from public.disagreements();
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b9","email":"lead-test@hsricode.test","role":"authenticated"}',false);
insert into t (label, ok, detail) select 'lead sees the 2 disputed fields', count(*) = 2, string_agg(field || ':' || coalesce(a,'-') || '/' || coalesce(b,'-'), ' ') from public.disagreements();
insert into public.adjudications (contactno, field, value, note) values ('63-001','state','yes','test');
insert into t (label, ok, detail) select 'lead decides after both submit', count(*) = 1, max(decided) from public.disagreements() where decided is not null;
do $$ begin insert into public.adjudications (contactno, field, value) values ('63-001','rights','maybe'); insert into t (label, ok, detail) values ('invalid value refused', false, 'insert succeeded'); exception when others then insert into t (label, ok, detail) values ('invalid value refused', true, sqlstate); end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b2","email":"coder2@hsricode.test","role":"authenticated"}',false);
insert into t (label, ok, detail) select 'coder cannot read decisions', count(*) = 0, count(*)::text from public.adjudications;
reset role;
delete from public.adjudications where contactno = '63-001';
delete from public.code_history where user_id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b9');
delete from auth.users where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b9');
delete from public.coders where email = 'lead-test@hsricode.test';
select n, label, ok, detail from t order by n;

-- Round-3 checks (migration 20261126000400): the key locks once a coder can see it, answers lock on submit,
-- and A/B swap per item. Run on its own; expected: all ok, and "A is coder 1" on some but not all of 20 items.
create temp table t2 (n serial, label text, ok boolean, detail text);
grant all on t2 to authenticated, anon;
grant usage on sequence t2_n_seq to authenticated, anon;
insert into public.coders (email, label, role) values ('lead-test@hsricode.test', 'LeadTest', 'lead');
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','coder1@hsricode.test'),
 ('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','coder2@hsricode.test'),
 ('00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-000000000000','authenticated','authenticated','lead-test@hsricode.test');
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b9","email":"lead-test@hsricode.test","role":"authenticated"}',false);
insert into public.codes (user_id, contactno, practice, domain) values ('00000000-0000-0000-0000-0000000000b9','99-001',true,'biomedical');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b1","email":"coder1@hsricode.test","role":"authenticated"}',false);
insert into public.codes (user_id, contactno, practice, domain, approach, state, critical, rights, purpose, rules)
  select '00000000-0000-0000-0000-0000000000b1', '99-00' || g, true, 'biomedical','quant','no','no','no','diagnosis','within' from generate_series(1,5) g;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b9","email":"lead-test@hsricode.test","role":"authenticated"}',false);
insert into t2 (label, ok) select 'key_seen true after a coder finishes practice', public.key_seen();
do $$ begin update public.codes set domain = 'unclear' where contactno = '99-001'; insert into t2 (label, ok, detail) values ('lead cannot change key once seen', not found, 'no error'); exception when others then insert into t2 (label, ok, detail) values ('lead cannot change key once seen', true, sqlstate); end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b1","email":"coder1@hsricode.test","role":"authenticated"}',false);
insert into public.codes (user_id, contactno, domain, approach, state, critical, rights, purpose, rules)
  select '00000000-0000-0000-0000-0000000000b1', '63-' || lpad(g::text,3,'0'), 'health_systems_public_health','quant','yes','no','no','diagnosis','within' from generate_series(1,20) g;
insert into public.submissions default values;
do $$ begin update public.codes set state = 'no' where contactno = '63-001'; insert into t2 (label, ok, detail) values ('coder locked after submit', not found, 'no error'); exception when others then insert into t2 (label, ok, detail) values ('coder locked after submit', true, sqlstate); end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b2","email":"coder2@hsricode.test","role":"authenticated"}',false);
insert into public.codes (user_id, contactno, domain, approach, state, critical, rights, purpose, rules)
  select '00000000-0000-0000-0000-0000000000b2', '63-' || lpad(g::text,3,'0'), 'health_systems_public_health','quant','no','no','no','diagnosis','within' from generate_series(1,20) g;
insert into public.submissions default values;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b9","email":"lead-test@hsricode.test","role":"authenticated"}',false);
insert into t2 (label, ok, detail) select 'A is coder 1 on some items and coder 2 on others', count(*) filter (where a = 'yes') between 3 and 17, (count(*) filter (where a = 'yes'))::text || ' of ' || count(*) from public.disagreements();
reset role;
delete from public.code_history where user_id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b9');
delete from auth.users where id in ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b9');
delete from public.coders where email = 'lead-test@hsricode.test';
select n, label, ok, detail from t2 order by n;
