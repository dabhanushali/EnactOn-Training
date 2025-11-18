-- Fix remaining role references in database functions and RLS policies
-- This migration updates all 'HR' references to 'Human Resources' and 'Trainee' to 'Intern'

-- 1. Update get_user_role function to ensure it returns correct role names
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT r.role_name INTO user_role
  FROM profiles p
  JOIN roles r ON p.role_id = r.id
  WHERE p.id = user_id;

  RETURN COALESCE(user_role, 'Unknown');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;

-- 2. Drop and recreate trainee readiness function if it exists
DROP FUNCTION IF EXISTS public.get_trainee_readiness_data(uuid);

-- 3. Update key RLS policies that reference old role names
-- Profiles table policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Management and HR can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Management and HR can update profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management') OR
    get_user_role(auth.uid()) = 'Team Lead' OR
    id = auth.uid()
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid() OR
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );

CREATE POLICY "Management and HR can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );

CREATE POLICY "Management and HR can update profiles" ON public.profiles
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );

-- 4. Update course enrollment policies
DROP POLICY IF EXISTS "Users can view course enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Management and HR can manage enrollments" ON public.course_enrollments;

CREATE POLICY "Users can view course enrollments" ON public.course_enrollments
  FOR SELECT USING (
    employee_id = auth.uid() OR
    get_user_role(auth.uid()) IN ('Team Lead', 'Human Resources', 'Management')
  );

CREATE POLICY "Management and HR can manage enrollments" ON public.course_enrollments
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  ) WITH CHECK (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );

-- 5. Update project assignment policies
DROP POLICY IF EXISTS "Users can view project assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Management and HR can manage assignments" ON public.project_assignments;
DROP POLICY IF EXISTS "Team Lead can assign to their team" ON public.project_assignments;

CREATE POLICY "Users can view project assignments" ON public.project_assignments
  FOR SELECT USING (
    assignee_id = auth.uid() OR
    assigned_by = auth.uid() OR
    get_user_role(auth.uid()) IN ('Team Lead', 'Human Resources', 'Management')
  );

CREATE POLICY "Management and HR can manage assignments" ON public.project_assignments
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  ) WITH CHECK (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );

CREATE POLICY "Team Lead can assign to their team" ON public.project_assignments
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) = 'Team Lead'
  );

-- 6. Update training session policies
DROP POLICY IF EXISTS "Users can view training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Admin roles can manage sessions" ON public.training_sessions;

CREATE POLICY "Users can view training sessions" ON public.training_sessions
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('Team Lead', 'Human Resources', 'Management')
  );

CREATE POLICY "Admin roles can manage sessions" ON public.training_sessions
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management', 'Team Lead')
  ) WITH CHECK (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management', 'Team Lead')
  );

-- 7. Update course-related policies
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Management and HR can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Management and HR can update courses" ON public.courses;

CREATE POLICY "Users can view courses" ON public.courses
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('Team Lead', 'Human Resources', 'Management')
  );

CREATE POLICY "Management and HR can insert courses" ON public.courses
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );

CREATE POLICY "Management and HR can update courses" ON public.courses
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );

-- 8. Update project-related policies
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Management and HR can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Management and HR can update projects" ON public.projects;

CREATE POLICY "Users can view projects" ON public.projects
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('Team Lead', 'Human Resources', 'Management')
  );

CREATE POLICY "Management and HR can insert projects" ON public.projects
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );

CREATE POLICY "Management and HR can update projects" ON public.projects
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('Human Resources', 'Management')
  );