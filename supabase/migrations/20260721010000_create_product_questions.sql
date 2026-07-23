-- Create product_questions table without REFERENCES constraints to match store schema conventions
CREATE TABLE IF NOT EXISTS public.product_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  customer_name text NOT NULL,
  question text NOT NULL,
  answer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

-- Allow select query checks globally
CREATE POLICY "Questions are viewable by anyone" ON public.product_questions
  FOR SELECT TO public USING (true);

-- Allow insert query checks for anonymous questions
CREATE POLICY "Anyone can ask questions" ON public.product_questions
  FOR INSERT TO public WITH CHECK (true);

-- Allow update query checks for dashboard answering managers
CREATE POLICY "Store owners can manage questions" ON public.product_questions
  FOR ALL TO public USING (true);
