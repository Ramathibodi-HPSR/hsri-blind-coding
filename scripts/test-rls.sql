-- Access-rule test for the coding database. Run in the SQL editor (or via the Supabase MCP) as postgres.
-- It creates three throwaway users (two listed coders and one stranger), runs the checks, prints one row per check
-- and removes the users again. Every row should show ok = true.
create temp table t (n serial, label text, ok boolean, detail text);
grant all on t to authenticated, anon;
grant usage on sequence t_n_seq to authenticated, anon;
insert into auth.users (id, instance_id, aud, role, email) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','percy@hsricode.test'),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','coder2@hsricode.test'),
 ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','stranger@hsricode.test');

set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","email":"percy@hsricode.test","role":"authenticated"}',false);
insert into public.codes (user_id, contactno, domain, approach) values ('00000000-0000-0000-0000-0000000000a1','63-001','biomedical','quant');
insert into t (label, ok) select 'A reads own row', count(*) = 1 from public.codes;
insert into public.codes (user_id, contactno, domain) values ('00000000-0000-0000-0000-0000000000a1','63-001','unclear')
  on conflict (user_id, contactno) do update set domain = excluded.domain;
insert into t (label, ok, detail) select 'A upserts own row', domain = 'unclear', domain from public.codes where contactno = '63-001';

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a2","email":"coder2@hsricode.test","role":"authenticated"}',false);
insert into t (label, ok, detail) select 'B cannot read A', count(*) = 0, count(*)::text from public.codes;
insert into public.codes (user_id, contactno, domain) values ('00000000-0000-0000-0000-0000000000a1','63-002','biomedical');
insert into t (label, ok, detail) select 'B insert claiming A id is stamped as B', bool_and(user_id = '00000000-0000-0000-0000-0000000000a2'), string_agg(user_id::text, ',') from public.codes where contactno = '63-002';
with u as (update public.codes set domain = 'unclear' where contactno = '63-001' returning 1) insert into t (label, ok, detail) select 'B cannot update A', count(*) = 0, count(*)::text from u;
insert into t (label, ok, detail) select 'B sees progress of both, counts only', count(*) = 2, string_agg(label || ':' || coded || '/' || practice_coded, ' ') from public.coding_progress();
do $$ begin perform 1 from public.code_history; insert into t (label, ok, detail) values ('history hidden from coders', false, 'readable'); exception when insufficient_privilege then insert into t (label, ok) values ('history hidden from coders', true); end $$;
insert into public.submissions default values;
insert into t (label, ok) select 'B submits', count(*) = 1 from public.submissions;

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a3","email":"stranger@hsricode.test","role":"authenticated"}',false);
insert into t (label, ok, detail) select 'stranger reads no codes', count(*) = 0, count(*)::text from public.codes;
do $$ begin insert into public.codes (contactno, domain) values ('63-003','biomedical'); insert into t (label, ok, detail) values ('stranger cannot write', false, 'insert succeeded'); exception when others then insert into t (label, ok, detail) values ('stranger cannot write', true, sqlstate); end $$;
insert into t (label, ok, detail) select 'stranger sees no progress', count(*) = 0, count(*)::text from public.coding_progress();

reset role;
set role anon;
select set_config('request.jwt.claims','{"role":"anon"}',false);
do $$ begin perform 1 from public.codes; insert into t (label, ok, detail) values ('anon blocked from codes', false, 'readable'); exception when insufficient_privilege then insert into t (label, ok) values ('anon blocked from codes', true); end $$;
do $$ begin perform public.coding_progress(); insert into t (label, ok) values ('anon cannot call progress', false); exception when insufficient_privilege then insert into t (label, ok) values ('anon cannot call progress', true); end $$;
reset role;

insert into t (label, ok, detail) select 'history kept on update', count(*) >= 1, count(*)::text from public.code_history where user_id = '00000000-0000-0000-0000-0000000000a1';
delete from public.code_history where user_id in ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a3');
delete from auth.users where id in ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a3');
insert into t (label, ok) select 'test users removed', not exists (select 1 from auth.users where email like '%@hsricode.test' and id::text like '00000000-0000-0000-0000-0000000000a%');
select n, label, ok, detail from t order by n;
