-- Drop existing policies that have incorrect role names
DROP POLICY IF EXISTS "course_assessments_select_policy" ON public.course_assessments;
DROP POLICY IF EXISTS "course_assessments_manage_policy" ON public.course_assessments;
DROP POLICY IF EXISTS "course_assessments_insert_policy" ON public.course_assessments;
DROP POLICY IF EXISTS "course_assessments_update_own_policy" ON public.course_assessments;

-- Recreate policies with correct role names (including both 'HR' and 'Human Resources')
CREATE POLICY "course_assessments_select_policy" 
ON public.course_assessments 
FOR SELECT 
USING (
  (employee_id = auth.uid()) OR 
  (get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'HR'::text, 'Human Resources'::text, 'Management'::text]))
);

CREATE POLICY "course_assessments_manage_policy" 
ON public.course_assessments 
FOR ALL 
USING (
  get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'HR'::text, 'Human Resources'::text, 'Management'::text])
);

CREATE POLICY "course_assessments_insert_policy" 
ON public.course_assessments 
FOR INSERT 
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "course_assessments_update_own_policy" 
ON public.course_assessments 
FOR UPDATE 
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());