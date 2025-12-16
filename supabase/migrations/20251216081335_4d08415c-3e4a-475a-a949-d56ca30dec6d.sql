-- Drop existing policies
DROP POLICY IF EXISTS "course_modules_manage_policy" ON public.course_modules;

-- Recreate with correct role names (Human Resources instead of HR)
CREATE POLICY "course_modules_manage_policy" 
ON public.course_modules 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'Human Resources'::text, 'Management'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'Human Resources'::text, 'Management'::text]));