-- Drop and recreate the delete policy to include both 'HR' and 'Human Resources'
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

CREATE POLICY "Admins can delete projects" 
ON public.projects 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['Management'::text, 'HR'::text, 'Human Resources'::text, 'Team Lead'::text]));