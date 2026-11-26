-- Design change (study lead, 26 Nov 2026): two coders code the sample; the study lead does not code. The lead writes
-- reference answers for the practice set, which a coder sees only after finishing the practice set, and settles the two
-- coders' disagreements once both have submitted, without seeing the model codes (they are not in this database).

alter table public.coders add column role text not null default 'coder' check (role in ('coder', 'lead'));
update public.coders set role = 'lead' where label = 'Percy';
insert into public.coders (email, label, role) values ('coder1@hsricode.test', 'ผู้ลงรหัสคนที่ 1', 'coder');

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.coders where email = lower(auth.jwt() ->> 'email');
$$;
revoke all on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;

create or replace function public.both_submitted() returns boolean
language sql stable security definer set search_path = public as $$
  select (select count(*) from public.coders where role = 'coder') >= 2
     and (select count(*) from public.submissions s join auth.users u on u.id = s.user_id
          join public.coders c on c.email = lower(u.email) where c.role = 'coder')
       = (select count(*) from public.coders where role = 'coder');
$$;
revoke all on function public.both_submitted() from public, anon;
grant execute on function public.both_submitted() to authenticated;

-- Coders write any of their own rows; the lead writes only practice rows (the reference answers).
drop policy "coder inserts own codes" on public.codes;
drop policy "coder updates own codes" on public.codes;
create policy "coder inserts own codes" on public.codes for insert to authenticated
  with check (user_id = auth.uid() and (public.my_role() = 'coder' or (public.my_role() = 'lead' and practice)));
create policy "coder updates own codes" on public.codes for update to authenticated
  using (user_id = auth.uid() and public.is_coder())
  with check (user_id = auth.uid() and (public.my_role() = 'coder' or (public.my_role() = 'lead' and practice)));

drop policy "coder submits" on public.submissions;
create policy "coder submits" on public.submissions for insert to authenticated
  with check (user_id = auth.uid() and public.my_role() = 'coder');

-- Progress lists the coders only (counts, never answers); anyone on the list may see it.
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
  order by c.label;
$$;

-- The lead's practice answers, for a coder who has finished all practice items (and for the lead).
create or replace function public.practice_key()
returns table (contactno text, domain text, approach text, state text, critical text, rights text,
               purpose text, rules text, evidence text, note text)
language sql stable security definer set search_path = public as $$
  select k.contactno, k.domain, k.approach, k.state, k.critical, k.rights, k.purpose, k.rules, k.evidence, k.note
  from public.codes k
  join auth.users u on u.id = k.user_id
  join public.coders c on c.email = lower(u.email)
  where c.role = 'lead' and k.practice
    and (public.my_role() = 'lead'
         or (public.my_role() = 'coder' and (
              select count(*) from public.codes m where m.user_id = auth.uid() and m.practice
                and m.domain is not null and m.approach is not null and m.state is not null and m.critical is not null
                and m.rights is not null and m.purpose is not null and m.rules is not null) >= 5));
$$;
revoke all on function public.practice_key() from public, anon;
grant execute on function public.practice_key() to authenticated;

-- The lead's decisions on disputed fields.
create table public.adjudications (
  contactno text not null,
  field text not null,
  value text not null,
  note text check (char_length(note) <= 2000),
  decided_by uuid not null default auth.uid() references auth.users (id),
  decided_at timestamptz not null default now(),
  primary key (contactno, field),
  check (
    (field = 'domain' and value in ('health_systems_public_health', 'biomedical', 'unclear')) or
    (field = 'approach' and value in ('qual/mixed', 'quant', 'cost', 'review', 'unclear')) or
    (field = 'state' and value in ('yes', 'no')) or
    (field in ('critical', 'rights') and value in ('yes', 'borderline', 'no')) or
    (field = 'purpose' and value in ('diagnosis', 'prescription', 'unclear')) or
    (field = 'rules' and value in ('within', 'structural', 'unclear')))
);
alter table public.adjudications enable row level security;
create policy "lead reads decisions" on public.adjudications for select to authenticated
  using (public.my_role() = 'lead');
create policy "lead decides after both submit" on public.adjudications for insert to authenticated
  with check (public.my_role() = 'lead' and public.both_submitted());
create policy "lead revises after both submit" on public.adjudications for update to authenticated
  using (public.my_role() = 'lead') with check (public.my_role() = 'lead' and public.both_submitted());
grant select, insert, update on public.adjudications to authenticated;

create or replace function public.adjudications_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.decided_by := auth.uid();
  new.decided_at := now();
  return new;
end $$;
create trigger adjudications_stamp before insert or update on public.adjudications
  for each row execute function public.adjudications_stamp();
revoke execute on function public.adjudications_stamp() from public, anon, authenticated;

-- For the lead, once both coders have submitted: one row per item and field where the two coders differ.
-- The coders appear as A and B (A = the first coder by label), with their evidence and notes.
create or replace function public.disagreements()
returns table (contactno text, "position" int, field text, a text, b text, a_evidence text, a_note text,
               b_evidence text, b_note text, decided text, decided_note text)
language sql stable security definer set search_path = public as $$
  with cs as (
    select u.id, row_number() over (order by c.label) as n
    from public.coders c join auth.users u on lower(u.email) = c.email where c.role = 'coder'),
  a as (select k.* from public.codes k join cs on cs.id = k.user_id and cs.n = 1 where not k.practice),
  b as (select k.* from public.codes k join cs on cs.id = k.user_id and cs.n = 2 where not k.practice),
  f(field, ord) as (values ('domain', 1), ('approach', 2), ('state', 3), ('critical', 4), ('rights', 5), ('purpose', 6), ('rules', 7)),
  pairs as (
    select coalesce(a.contactno, b.contactno) as contactno, coalesce(a.position, b.position) as pos, f.field, f.ord,
           to_jsonb(a) ->> f.field as av, to_jsonb(b) ->> f.field as bv,
           a.evidence as ae, a.note as an, b.evidence as be, b.note as bn
    from a full join b on a.contactno = b.contactno cross join f)
  select p.contactno, p.pos, p.field, p.av, p.bv, p.ae, p.an, p.be, p.bn, d.value, d.note
  from pairs p left join public.adjudications d on d.contactno = p.contactno and d.field = p.field
  where public.my_role() = 'lead' and public.both_submitted() and p.av is distinct from p.bv
  order by p.pos, p.ord;
$$;
revoke all on function public.disagreements() from public, anon;
grant execute on function public.disagreements() to authenticated;
