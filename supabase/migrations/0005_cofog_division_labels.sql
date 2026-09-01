-- 0005_cofog_division_labels.sql — keep both of the bundle's COFOG wordings.
--
-- Found while writing the seed: the bundle carries TWO different label sets for
-- the ten COFOG divisions, not one.
--
--   spendSubEN.GF03 = 'Public order and safety'   (full COFOG wording)
--   divEN['03']     = 'Public order & safety'     (short label the console shows)
--
-- and only divES carries Spanish division labels at all — spendSubES starts at
-- group level. Merging them into cofog_item.label_es / label_en as 0002 assumed
-- would have meant picking one wording per language and silently dropping the
-- other, so the second set gets its own columns and each column keeps exactly
-- one origin in the bundle. Level 1 only; null everywhere else, because the
-- bundle has no division label for TOTAL or for a group.

alter table public.cofog_item
  add column division_label_es text,
  add column division_label_en text;

comment on table public.cofog_item is
  'COFOG hierarchy used across the spending console: level 0 = TOTAL, level 1 = GF01..GF10 divisions, level 2 = groups. Every label column has exactly one origin in the bundle and is never merged with another — the bundle carries two differently-worded English label sets for the divisions and both are kept. Notes from spendNoteES/spendNoteEN.';
comment on column public.cofog_item.label_es is
  'Drill-down label, bundle spendSubES. Null where that dictionary has no entry for the code (it carries no Spanish division labels and no TOTAL) — a real gap, not a placeholder.';
comment on column public.cofog_item.label_en is
  'Drill-down label, bundle spendSubEN — the full COFOG wording, e.g. "Public order and safety".';
comment on column public.cofog_item.division_label_es is
  'Short division label the console shows on the map and tree, bundle divES. Level 1 only; null elsewhere.';
comment on column public.cofog_item.division_label_en is
  'Short division label the console shows on the map and tree, bundle divEN — deliberately not the same string as label_en, e.g. "Public order & safety". Level 1 only; null elsewhere.';
