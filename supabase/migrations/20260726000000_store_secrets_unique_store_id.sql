-- Ensure store_secrets.store_id has a unique/primary key constraint
-- so that ON CONFLICT (store_id) works in upsert operations.
-- This is safe to run even if the constraint already exists.

DO $$
BEGIN
  -- Add primary key if there is no primary key constraint at all
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'store_secrets'
      AND constraint_type = 'PRIMARY KEY'
  ) THEN
    -- Check if a unique constraint on store_id exists instead
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'store_secrets'
        AND tc.constraint_type = 'UNIQUE'
        AND kcu.column_name = 'store_id'
    ) THEN
      ALTER TABLE public.store_secrets ADD PRIMARY KEY (store_id);
    END IF;
  END IF;
END $$;
