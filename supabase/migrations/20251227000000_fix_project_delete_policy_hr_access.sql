-- Fix project delete policy to use correct role names
-- HR role should be 'Human Resources' not 'HR'

-- Drop the old policy
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

-- Create new policy with correct role names
CREATE POLICY "Admins can delete projects"
ON public.projects
FOR DELETE
USING ( get_user_role(auth.uid()) IN ('Management', 'Human Resources', 'Team Lead') );
