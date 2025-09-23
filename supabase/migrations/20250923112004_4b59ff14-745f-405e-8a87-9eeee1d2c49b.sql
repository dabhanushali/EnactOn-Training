-- Create a function to get user email by ID for HR/Management users
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = user_id;
$$;

-- Create a view that includes email for profiles (accessible only to HR/Management)
CREATE OR REPLACE VIEW public.profiles_with_email AS
SELECT 
  p.*,
  get_user_email(p.id) as email
FROM public.profiles p;

-- Enable RLS on the view
ALTER VIEW public.profiles_with_email SET (security_invoker = on);

-- Create policy for the view
CREATE POLICY "profiles_with_email_select_policy" ON public.profiles_with_email
FOR SELECT USING (
  (id = auth.uid()) OR 
  (get_user_role(auth.uid()) = ANY (ARRAY['HR'::text, 'Management'::text])) OR 
  ((get_user_role(auth.uid()) = 'Team Lead'::text) AND (manager_id = auth.uid()))
);