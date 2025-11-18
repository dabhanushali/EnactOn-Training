-- Update role names in the roles table
UPDATE public.roles 
SET role_name = 'Intern' 
WHERE role_name = 'Trainee';

UPDATE public.roles 
SET role_name = 'Human Resources' 
WHERE role_name = 'HR';

-- Restore the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the Intern role id
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE role_name = 'Intern'
  LIMIT 1;

  -- Insert profile for new user
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role_id,
    current_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    default_role_id,
    'Pre-Joining',
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists and is enabled
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing database functions to use new role names
CREATE OR REPLACE FUNCTION public.get_profiles_with_emails()
RETURNS TABLE(
  id uuid,
  role_id uuid,
  manager_id uuid,
  date_of_joining date,
  updated_at timestamp with time zone,
  employee_code text,
  first_name text,
  last_name text,
  phone text,
  department text,
  designation text,
  current_status text,
  created_at timestamp with time zone,
  email text,
  role_name text,
  role_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NOT (
    get_user_role(auth.uid()) = ANY (ARRAY['Human Resources'::text, 'Management'::text]) OR
    get_user_role(auth.uid()) = 'Team Lead'::text
  ) THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.role_id,
    p.manager_id,
    p.date_of_joining,
    p.updated_at,
    p.employee_code,
    p.first_name,
    p.last_name,
    p.phone,
    p.department,
    p.designation,
    p.current_status,
    p.created_at,
    get_user_email(p.id) as email,
    r.role_name,
    r.role_description
  FROM profiles p
  LEFT JOIN roles r ON p.role_id = r.id
  WHERE
    CASE
      WHEN get_user_role(auth.uid()) = ANY (ARRAY['Human Resources'::text, 'Management'::text]) THEN true
      WHEN get_user_role(auth.uid()) = 'Team Lead' THEN p.manager_id = auth.uid()
      ELSE p.id = auth.uid()
    END
  ORDER BY p.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_project_assignments(p_project_id uuid)
RETURNS TABLE(
  id uuid,
  status text,
  intern_id uuid,
  intern_first_name text,
  intern_last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pa.id,
    pa.status,
    p.id as intern_id,
    p.first_name as intern_first_name,
    p.last_name as intern_last_name
  FROM public.project_assignments pa
  JOIN public.profiles p ON pa.assignee_id = p.id
  WHERE pa.project_id = p_project_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_trainee_readiness_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result jsonb;
  user_role text;
BEGIN
  SELECT r.role_name INTO user_role
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();

  IF user_role NOT IN ('Human Resources', 'Management', 'Team Lead') THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'employee_code', p.employee_code,
      'department', p.department,
      'designation', p.designation,
      'current_status', p.current_status
    ),
    'courses', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'course_id', c.id,
        'course_name', c.course_name,
        'enrollment_status', ce.status,
        'completion_date', ce.completion_date
      ))
      FROM public.course_enrollments ce
      JOIN public.courses c ON ce.course_id = c.id
      WHERE ce.employee_id = p.id),
      '[]'::jsonb
    ),
    'assessments', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'assessment_id', ca.id,
        'course_id', ca.course_id,
        'status', ca.status,
        'percentage', ca.percentage,
        'completion_date', ca.completion_date
      ))
      FROM public.course_assessments ca
      WHERE ca.employee_id = p.id),
      '[]'::jsonb
    ),
    'projects', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'project_id', pr.id,
        'project_name', pr.project_name,
        'assignment_status', pa.status
      ))
      FROM public.project_assignments pa
      JOIN public.projects pr ON pa.project_id = pr.id
      WHERE pa.assignee_id = p.id),
      '[]'::jsonb
    )
  ) INTO result
  FROM public.profiles p
  WHERE p.id = p_user_id;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role text;
BEGIN
  SELECT r.role_name INTO user_role
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();

  IF user_role NOT IN ('Human Resources', 'Management') THEN
    RAISE EXCEPTION 'Unauthorized: Only HR and Management can delete users';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$function$;