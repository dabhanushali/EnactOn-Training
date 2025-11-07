-- Create module_contents table for multiple content items per module
CREATE TABLE IF NOT EXISTS public.module_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  content_title TEXT NOT NULL,
  content_description TEXT,
  content_url TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'External Link',
  content_order INTEGER NOT NULL DEFAULT 1,
  estimated_duration_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on module_contents
ALTER TABLE public.module_contents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_contents
CREATE POLICY "module_contents_select_policy" 
ON public.module_contents 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "module_contents_manage_policy" 
ON public.module_contents 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'HR'::text, 'Management'::text]));

-- Trigger for updated_at
CREATE TRIGGER update_module_contents_updated_at
BEFORE UPDATE ON public.module_contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();