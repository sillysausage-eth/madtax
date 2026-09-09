-- 0003_rls.sql — public read, nobody writes.
--
-- Tax Truth stores published figures only. There is no user input, no
-- personalisation and nothing user-generated (plan, pinned decisions), so the
-- access model is the simplest one that exists: every row is world-readable and
-- no client role may write anything, ever. Seeding runs with the service role,
-- which bypasses RLS.
--
-- Two independent locks, because either alone is insufficient:
--   1. RLS enabled on every table with a single permissive SELECT policy. This
--      is what makes the tables reachable through PostgREST at all.
--   2. INSERT/UPDATE/DELETE/TRUNCATE revoked from anon and authenticated. This
--      matters because Supabase's default privileges GRANT ALL on new tables in
--      `public` to anon and authenticated — without the revoke, a table with RLS
--      on but no write policy still reports a policy violation rather than a
--      permission denial, and any future permissive policy would open writes.
--
-- The loop covers every table created by 0001 and 0002 without a hand-written
-- list that could silently miss one; the assertion at the end fails the
-- migration if any table in `public` ends up without RLS or without a policy.

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public' order by tablename
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t
    );
  end loop;
end
$$;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

-- Future tables in `public` inherit the same posture: readable, never writable.
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public revoke insert, update, delete, truncate on tables from anon, authenticated;

do $$
declare
  unprotected text[];
  writable    text[];
begin
  select coalesce(array_agg(c.relname order by c.relname), '{}')
    into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and (
      c.relrowsecurity is false
      or not exists (
        select 1 from pg_policies p
        where p.schemaname = 'public' and p.tablename = c.relname
      )
    );

  if array_length(unprotected, 1) is not null then
    raise exception 'RLS gap: % lack row level security or a select policy', unprotected;
  end if;

  select coalesce(array_agg(distinct table_name order by table_name), '{}')
    into writable
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');

  if array_length(writable, 1) is not null then
    raise exception 'write grant leak: anon/authenticated can write to %', writable;
  end if;
end
$$;
