-- Design review 26 Nov 2026 (v1.5): a coder sees whether the other coder has submitted, not how far they have got,
-- so the progress hub cannot turn into a race. The lead still sees every coder's counts.

create or replace function public.coding_progress()
returns table (label text, is_me boolean, coded int, practice_coded int, submitted boolean)
language sql stable security definer set search_path = public as $$
  select c.label,
         c.email = lower(auth.jwt() ->> 'email'),
         case when c.email = lower(auth.jwt() ->> 'email') or public.my_role() = 'lead' then
           (select count(*)::int from public.codes k where k.user_id = u.id and not k.practice
              and k.domain is not null and k.approach is not null and k.state is not null and k.critical is not null
              and k.rights is not null and k.purpose is not null and k.rules is not null) end,
         case when c.email = lower(auth.jwt() ->> 'email') or public.my_role() = 'lead' then
           (select count(*)::int from public.codes k where k.user_id = u.id and k.practice) end,
         exists (select 1 from public.submissions s where s.user_id = u.id)
  from public.coders c
  left join auth.users u on lower(u.email) = c.email
  where public.is_coder() and c.role = 'coder'
  order by md5(c.label || (select v from public.app_secret where k = 'ab'));
$$;
