-- Create function and trigger to mark assignments as Submitted when a trainee submits work
CREATE OR REPLACE FUNCTION public.mark_assignment_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.project_assignments
  SET status = 'Submitted',
      updated_at = now()
  WHERE id = NEW.assignment_id;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on project_milestone_submissions
DROP TRIGGER IF EXISTS trg_mark_assignment_submitted ON public.project_milestone_submissions;
CREATE TRIGGER trg_mark_assignment_submitted
AFTER INSERT ON public.project_milestone_submissions
FOR EACH ROW
EXECUTE FUNCTION public.mark_assignment_submitted();