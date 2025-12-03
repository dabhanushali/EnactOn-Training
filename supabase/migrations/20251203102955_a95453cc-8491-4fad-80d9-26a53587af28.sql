-- Fix the delete policy to use correct role name
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;

CREATE POLICY "Admins can delete courses" 
ON public.courses 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['Management'::text, 'Human Resources'::text, 'Team Lead'::text]));