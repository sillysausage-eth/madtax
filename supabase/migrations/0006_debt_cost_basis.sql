-- 0006_debt_cost_basis.sql — debt_cost gets the same honest-null basis column
-- that debt_maturity already carries.
--
-- Audit finding: the plan calls for debt_holders / debt_maturity / debt_cost to
-- each carry as_of/scope/basis. debt_holders.basis is populated (bundle
-- debt.holders.basis). debt_maturity.basis is a column that is always null,
-- with a comment explaining the bundle carries no such stamp for the ladder
-- (0002). debt_cost had no basis column at all, even though bundle debt.cost
-- has exactly the same gap (no basis key). Two different representations of
-- the same absence is worse than one: this migration brings debt_cost in line
-- with debt_maturity's precedent, so "the bundle doesn't say" is a queryable
-- null in both places instead of a column in one and a silent omission in the
-- other. No fabrication — the column will never be populated because bundle
-- debt.cost carries no basis field, same as debt.maturity.

alter table public.debt_cost
  add column basis text;

comment on column public.debt_cost.basis is
  'Null: the bundle carries no valuation-basis stamp for this series (same absence as debt_maturity.basis, bundle debt.cost has no basis key). Stated as a null rather than guessed from the neighbouring debt_stock/debt_holders basis text.';
