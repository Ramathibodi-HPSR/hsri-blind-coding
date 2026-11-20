-- Export for analysis (study lead only, after both coders have submitted). Run as postgres.
-- Save the result as raw/coding_human/export/codes.json in the study's private records, never in this repository.
select json_agg(row_to_json(x) order by x.coder, x.position) from (
  select c.label as coder, k.contactno, k.practice, k.position, k.domain, k.approach, k.state, k.critical, k.rights,
         k.purpose, k.rules, k.evidence, k.note, k.opened_fulltext, k.saved_at,
         (select count(*) from public.code_history h where h.user_id = k.user_id and h.contactno = k.contactno) as revisions
  from public.codes k
  join auth.users u on u.id = k.user_id
  join public.coders c on c.email = lower(u.email)
) x;
