-- Fix security issue: Remove uploaded_by condition from employee_documents SELECT policy
-- This prevents employees from accessing other employees' documents just because they uploaded them

DROP POLICY IF EXISTS "employee_documents_select_policy" ON public.employee_documents;

CREATE POLICY "employee_documents_select_policy" 
ON public.employee_documents 
FOR SELECT 
USING (
  (employee_id = auth.uid()) OR 
  (get_user_role(auth.uid()) = ANY (ARRAY['HR'::text, 'Management'::text]))
);