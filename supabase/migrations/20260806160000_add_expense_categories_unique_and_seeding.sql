-- Add UNIQUE constraint to public.expense_categories if not exists
ALTER TABLE public.expense_categories 
  ADD CONSTRAINT expense_categories_store_id_name_key UNIQUE (store_id, name);

-- Seed default expense categories for existing stores
INSERT INTO public.expense_categories (store_id, name, is_default)
SELECT s.id, c.name, true
FROM public.stores s
CROSS JOIN (VALUES
  ('Rent'),('Salary & Wages'),('Electricity'),('Gas/Fuel'),
  ('Internet/Phone'),('Marketing'),('Packaging'),('Repairs'),
  ('Transport'),('Bank charges'),('Other')
) c(name)
ON CONFLICT (store_id, name) DO NOTHING;

-- Create function and trigger to auto-seed default categories on store creation
CREATE OR REPLACE FUNCTION public.seed_default_expense_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.expense_categories (store_id, name, is_default)
  VALUES
    (NEW.id, 'Rent', true),
    (NEW.id, 'Salary & Wages', true),
    (NEW.id, 'Electricity', true),
    (NEW.id, 'Gas/Fuel', true),
    (NEW.id, 'Internet/Phone', true),
    (NEW.id, 'Marketing', true),
    (NEW.id, 'Packaging', true),
    (NEW.id, 'Repairs', true),
    (NEW.id, 'Transport', true),
    (NEW.id, 'Bank charges', true),
    (NEW.id, 'Other', true)
  ON CONFLICT (store_id, name) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_seed_expense_categories ON public.stores;
CREATE TRIGGER trg_seed_expense_categories
  AFTER INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_expense_categories();
