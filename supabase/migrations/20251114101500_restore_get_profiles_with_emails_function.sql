-- Restore the get_profiles_with_emails function that was temporarily disabled
-- This function provides authorized access to profiles with email information

-- Create a function to get user email by ID for HR/Management users
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = user_id;
$$;

-- Restore the get_profiles_with_emails function
CREATE OR REPLACE FUNCTION public.get_profiles_with_emails()
RETURNS TABLE (
  id uuid,
  role_id uuid,
  manager_id uuid,
  date_of_joining date,
  updated_at timestamptz,
  employee_code text,
  first_name text,
  last_name text,
  phone text,
  department text,
  designation text,
  current_status text,
  created_at timestamptz,
  email text,
  role_name text,
  role_description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has permission
  IF NOT (
    get_user_role(auth.uid()) = ANY (ARRAY['HR'::text, 'Management'::text]) OR
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
      WHEN get_user_role(auth.uid()) = ANY (ARRAY['HR'::text, 'Management'::text]) THEN true
      WHEN get_user_role(auth.uid()) = 'Team Lead' THEN p.manager_id = auth.uid()
      ELSE p.id = auth.uid()
    END
  ORDER BY p.created_at DESC;
END;
$$;
