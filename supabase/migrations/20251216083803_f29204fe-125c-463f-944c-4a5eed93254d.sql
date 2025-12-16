-- Fix module_contents RLS policy to use correct role name
DROP POLICY IF EXISTS "module_contents_manage_policy" ON public.module_contents;

CREATE POLICY "module_contents_manage_policy"
ON public.module_contents
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'Human Resources'::text, 'Management'::text]))
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'Human Resources'::text, 'Management'::text]));