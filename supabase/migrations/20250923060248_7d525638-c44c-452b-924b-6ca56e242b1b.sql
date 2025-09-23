-- Fix security warnings: Update functions to have proper search_path settings

-- Fix get_project_assignments function
CREATE OR REPLACE FUNCTION public.get_project_assignments(p_project_id uuid)
 RETURNS TABLE(id uuid, status text, trainee_id uuid, trainee_first_name text, trainee_last_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
    return query
    select
        pa.id,
        pa.status,
        p.id as trainee_id,
        p.first_name as trainee_first_name,
        p.last_name as trainee_last_name
    from
        public.project_assignments pa
    join
        public.profiles p on pa.assignee_id = p.id
    where
        pa.project_id = p_project_id;
end;
$function$;

-- The other functions already have proper search_path settings, so this should resolve the warnings