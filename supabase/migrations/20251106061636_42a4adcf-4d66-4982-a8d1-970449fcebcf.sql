-- Create company_rules table for pre-joiner guidelines
CREATE TABLE public.company_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'Code of Conduct', 'Work Ethics', 'Policies', 'Culture'
  priority INTEGER DEFAULT 0, -- For ordering
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active rules
CREATE POLICY "Anyone can view active rules"
ON public.company_rules
FOR SELECT
USING (is_active = true);

-- Policy: Only HR can insert rules
CREATE POLICY "HR can insert rules"
ON public.company_rules
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.role_name = 'HR'
  )
);

-- Policy: Only HR can update rules
CREATE POLICY "HR can update rules"
ON public.company_rules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.role_name = 'HR'
  )
);

-- Policy: Only HR can delete rules
CREATE POLICY "HR can delete rules"
ON public.company_rules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.role_name = 'HR'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_company_rules_updated_at
BEFORE UPDATE ON public.company_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();