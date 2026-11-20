-- HSRI blind coding: two human coders classify sampled HSRI projects, each blind to the model codes and to each other.
-- Project texts live in the repo (public abstracts); only the coders' answers live here.

-- Who may code. Accounts are created by the PI in the Supabase dashboard; only listed emails get access,
-- so a stray sign-up can read and write nothing.
create table public.coders (
  email text primary key,
  label text not null,
  created_at timestamptz not null default now()
);
alter table public.coders enable row level security;

create or replace function public.is_coder() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.coders where email = lower(auth.jwt() ->> 'email'));
$$;
revoke all on function public.is_coder() from public;
grant execute on function public.is_coder() to authenticated;

create policy "coder reads own entry" on public.coders for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

-- One row per coder per project. Each coder reads and writes only their own rows.
create table public.codes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contactno text not null check (contactno ~ '^[0-9]{2}-[0-9]{3}$'),
  practice boolean not null default false,
  position int,
  domain text check (domain in ('health_systems_public_health','biomedical','unclear')),
  approach text check (approach in ('qual/mixed','quant','cost','review','unclear')),
  state text check (state in ('yes','no')),
  critical text check (critical in ('yes','borderline','no')),
  rights text check (rights in ('yes','borderline','no')),
  purpose text check (purpose in ('diagnosis','prescription','unclear')),
  rules text check (rules in ('within','structural','unclear')),
  evidence text check (char_length(evidence) <= 1000),
  note text check (char_length(note) <= 2000),
  opened_fulltext boolean not null default false,
  saved_at timestamptz not null default now(),
  primary key (user_id, contactno)
);
alter table public.codes enable row level security;

create policy "coder reads own codes" on public.codes for select to authenticated
  using (user_id = auth.uid() and public.is_coder());
create policy "coder inserts own codes" on public.codes for insert to authenticated
  with check (user_id = auth.uid() and public.is_coder());
create policy "coder updates own codes" on public.codes for update to authenticated
  using (user_id = auth.uid() and public.is_coder()) with check (user_id = auth.uid() and public.is_coder());

-- The server, not the browser, sets who wrote a row and when.
create or replace function public.codes_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.saved_at := now();
  return new;
end $$;
create trigger codes_stamp before insert or update on public.codes for each row execute function public.codes_stamp();

-- Every earlier version of a row is kept, so the methods can report how often answers were changed.
-- Nobody reads this through the API.
create table public.code_history (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  contactno text not null,
  old_row jsonb not null,
  replaced_at timestamptz not null default now()
);
alter table public.code_history enable row level security;
create or replace function public.codes_keep_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.code_history (user_id, contactno, old_row) values (old.user_id, old.contactno, to_jsonb(old));
  return new;
end $$;
create trigger codes_keep_history after update on public.codes for each row execute function public.codes_keep_history();

-- A coder marks the main set as finished.
create table public.submissions (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  submitted_at timestamptz not null default now()
);
alter table public.submissions enable row level security;
create policy "coder reads own submission" on public.submissions for select to authenticated
  using (user_id = auth.uid() and public.is_coder());
create policy "coder submits" on public.submissions for insert to authenticated
  with check (user_id = auth.uid() and public.is_coder());

-- What every coder may see about the others: counts only, never answers.
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
  where public.is_coder()
  order by c.label;
$$;
revoke all on function public.coding_progress() from public;
grant execute on function public.coding_progress() to authenticated;

revoke all on public.code_history from anon, authenticated;
revoke all on public.coders, public.codes, public.submissions from anon;
grant select on public.coders to authenticated;
grant select, insert, update on public.codes to authenticated;
grant select, insert on public.submissions to authenticated;

-- The two coder logins (usernames percy and coder2; the PI creates the accounts and passwords in the dashboard).
insert into public.coders (email, label) values
  ('percy@hsricode.test', 'Percy'),
  ('coder2@hsricode.test', 'ผู้ลงรหัสคนที่ 2');
