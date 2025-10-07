CREATE POLICY "Admins can delete course enrollments"
ON public.course_enrollments
FOR DELETE
USING ( get_user_role(auth.uid()) IN ('Management', 'HR', 'Team Lead') );