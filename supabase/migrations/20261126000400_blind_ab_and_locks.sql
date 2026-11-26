-- UX review round 3 (26 Nov 2026):
-- 1. A and B are assigned per item from a server-side secret, so the lead cannot tell which coder is A.
-- 2. A coder's answers lock when that coder submits, so the lead adjudicates the answers as submitted.
-- 3. The practice key locks once any coder can see it, so both coders see the same key.

create table public.app_secret (k text primary key, v text not null);
alter table public.app_secret enable row level security;
revoke all on public.app_secret from public, anon, authenticated;
insert into public.app_secret (k, v) values ('ab', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

create or replace function public.has_submitted() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.submissions where user_id = auth.uid());
$$;
revoke all on function public.has_submitted() from public, anon;
grant execute on function public.has_submitted() to authenticated;

create or replace function public.key_seen() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coders c join auth.users u on lower(u.email) = c.email
    where c.role = 'coder' and (
      select count(*) from public.codes m where m.user_id = u.id and m.practice
        and m.domain is not null and m.approach is not null and m.state is not null and m.critical is not null
        and m.rights is not null and m.purpose is not null and m.rules is not null) >= 5);
$$;
revoke all on function public.key_seen() from public, anon;
grant execute on function public.key_seen() to authenticated;

drop policy "coder inserts own codes" on public.codes;
drop policy "coder updates own codes" on public.codes;
create policy "coder inserts own codes" on public.codes for insert to authenticated
  with check (user_id = auth.uid() and (
    (public.my_role() = 'coder' and not public.has_submitted()) or
    (public.my_role() = 'lead' and practice and not public.key_seen())));
create policy "coder updates own codes" on public.codes for update to authenticated
  using (user_id = auth.uid() and public.is_coder())
  with check (user_id = auth.uid() and (
    (public.my_role() = 'coder' and not public.has_submitted()) or
    (public.my_role() = 'lead' and practice and not public.key_seen())));

-- Coders listed in an order that says nothing about A and B.
create or replace function public.coding_progress()
returns table (label text, is_me boolean, coded int, practice_coded int, submitted boolean)
language sql stable security definer set search_path = public as $$
  select c.label,
         c.email = lower(auth.jwt() ->> 'email'),
         (select count(*)::int from public.codes k where k.user_id = u.id and not k.practice
            and k.domain is not null and k.approach is not null and k.state is not null and k.critical is not null
            and k.rights is not null and k.purpose is not null and k.rules is not null),
         (select count(*)::int from public.codes k where k.user_id = u.id and k.practice),
         exists (select 1 from public.submissions s where s.user_id = u.id)
  from public.coders c
  left join auth.users u on lower(u.email) = c.email
  where public.is_coder() and c.role = 'coder'
  order by md5(c.label || (select v from public.app_secret where k = 'ab'));
$$;

-- A and B swap per item: for each contract number a keyed hash decides which coder is shown as A.
create or replace function public.disagreements()
returns table (contactno text, "position" int, field text, a text, b text, a_evidence text, a_note text,
               b_evidence text, b_note text, decided text, decided_note text)
language sql stable security definer set search_path = public as $$
  with sec as (select v from public.app_secret where k = 'ab'),
  cs as (
    select u.id, row_number() over (order by c.label) as n
    from public.coders c join auth.users u on lower(u.email) = c.email where c.role = 'coder'),
  c1 as (select k.* from public.codes k join cs on cs.id = k.user_id and cs.n = 1 where not k.practice),
  c2 as (select k.* from public.codes k join cs on cs.id = k.user_id and cs.n = 2 where not k.practice),
  f(field, ord) as (values ('domain', 1), ('approach', 2), ('state', 3), ('critical', 4), ('rights', 5), ('purpose', 6), ('rules', 7)),
  pairs as (
    select coalesce(c1.contactno, c2.contactno) as contactno, coalesce(c1.position, c2.position) as pos, f.field, f.ord,
           to_jsonb(c1) ->> f.field as v1, to_jsonb(c2) ->> f.field as v2,
           c1.evidence as e1, c1.note as n1, c2.evidence as e2, c2.note as n2,
           get_byte(decode(md5(coalesce(c1.contactno, c2.contactno) || (select v from sec)), 'hex'), 0) % 2 = 1 as swap
    from c1 full join c2 on c1.contactno = c2.contactno cross join f)
  select p.contactno, p.pos, p.field,
         case when p.swap then p.v2 else p.v1 end, case when p.swap then p.v1 else p.v2 end,
         case when p.swap then p.e2 else p.e1 end, case when p.swap then p.n2 else p.n1 end,
         case when p.swap then p.e1 else p.e2 end, case when p.swap then p.n1 else p.n2 end,
         d.value, d.note
  from pairs p left join public.adjudications d on d.contactno = p.contactno and d.field = p.field
  where public.my_role() = 'lead' and public.both_submitted() and p.v1 is distinct from p.v2
  order by p.pos, p.ord;
$$;
