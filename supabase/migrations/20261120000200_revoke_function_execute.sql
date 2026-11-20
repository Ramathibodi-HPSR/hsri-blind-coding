-- Trigger functions are never called through the API; the two helpers are for signed-in coders only.
revoke execute on function public.codes_stamp() from public, anon, authenticated;
revoke execute on function public.codes_keep_history() from public, anon, authenticated;
revoke execute on function public.is_coder() from anon;
revoke execute on function public.coding_progress() from anon;
