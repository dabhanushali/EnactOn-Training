-- Check all functions for proper search_path and fix any missing ones
-- Update delete_user function to have proper search_path
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NOT (
    auth.role() = 'authenticated' AND
    (get_user_role(auth.uid()) = 'Management' OR get_user_role(auth.uid()) = 'HR')
  ) THEN
    RAISE EXCEPTION 'error: unauthorized';
  END IF;

  DELETE FROM auth.users WHERE id = user_id;
END;
$function$;

-- Enable leaked password protection in auth settings
-- This cannot be done via SQL migration, it needs to be done through the dashboard
-- The user will need to enable this in Authentication > Settings > Password strength