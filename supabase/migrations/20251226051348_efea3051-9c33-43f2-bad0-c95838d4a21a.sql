-- Create module_progress table to track user's module completion
CREATE TABLE public.module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_id, module_id)
);

-- Enable RLS
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own progress
CREATE POLICY "module_progress_select_policy" 
ON public.module_progress 
FOR SELECT 
USING (
  employee_id = auth.uid() OR 
  get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'Human Resources'::text, 'Management'::text])
);

-- Policy: Users can insert their own progress
CREATE POLICY "module_progress_insert_policy" 
ON public.module_progress 
FOR INSERT 
WITH CHECK (employee_id = auth.uid());

-- Policy: Users can update their own progress
CREATE POLICY "module_progress_update_policy" 
ON public.module_progress 
FOR UPDATE 
USING (employee_id = auth.uid());

-- Policy: HR/Management can manage all progress
CREATE POLICY "module_progress_admin_policy" 
ON public.module_progress 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['Human Resources'::text, 'Management'::text]));