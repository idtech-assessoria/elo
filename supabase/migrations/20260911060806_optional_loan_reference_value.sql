-- An omitted catalogue value is represented by zero; amounts charged on sale
-- remain strictly positive and are explicitly supplied when no value was set.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.loan_items
  DROP CONSTRAINT item_value_positive,
  ADD CONSTRAINT item_value_nonnegative CHECK (value >= 0);
