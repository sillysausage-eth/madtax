-- 0004_storage.sql — the raw-sources bucket, created empty and private.
--
-- The bucket exists so the archive has somewhere to land the day the extractors
-- are rewritten to snapshot-then-parse. It is deliberately LEFT EMPTY: filling
-- it now with fresh re-downloads would attach today's files to figures that were
-- extracted from other retrievals, which is provenance theatre — the archived
-- artefact must be the one the number actually came from.
--
-- Private, and no storage.objects policies are created for it, so anon and
-- authenticated cannot list, read or write it. Only the service role can, which
-- is exactly the posture the section tables have in 0003.

insert into storage.buckets (id, name, public)
values ('raw-sources', 'raw-sources', false);

do $$
declare
  n bigint;
begin
  select count(*) into n
  from storage.objects
  where bucket_id = 'raw-sources';

  if n <> 0 then
    raise exception 'raw-sources must be created empty, found % object(s)', n;
  end if;

  if exists (select 1 from storage.buckets where id = 'raw-sources' and public) then
    raise exception 'raw-sources must not be public';
  end if;
end
$$;
