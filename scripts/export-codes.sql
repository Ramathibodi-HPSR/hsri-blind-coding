-- Export for analysis (study lead only, after both coders have submitted and the lead has finished adjudicating).
-- Run each query as postgres. Save the results in the study's private records, never in this repository:
--   query 1 -> raw/coding_human/export/codes.json
--   query 2 -> raw/coding_human/export/adjudications.json

-- 1. The coders' answers (the lead's practice key is left out).
select json_agg(row_to_json(x) order by x.coder, x.position) from (
  select c.label as coder, k.contactno, k.practice, k.position, k.domain, k.approach, k.state, k.critical, k.rights,
         k.purpose, k.rules, k.evidence, k.note, k.opened_fulltext, k.saved_at,
         (select count(*) from public.code_history h where h.user_id = k.user_id and h.contactno = k.contactno) as revisions
  from public.codes k
  join auth.users u on u.id = k.user_id
  join public.coders c on c.email = lower(u.email)
  where c.role = 'coder'
) x;

-- 2. The lead's decisions on disputed fields.
select json_agg(row_to_json(d) order by d.contactno, d.field) from (
  select contactno, field, value, note, decided_at from public.adjudications
) d;
