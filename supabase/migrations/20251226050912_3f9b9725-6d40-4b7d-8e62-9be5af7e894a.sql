-- Add UPDATE policy for users to update their own course assessments
CREATE POLICY "course_assessments_update_own_policy" 
ON public.course_assessments 
FOR UPDATE 
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());