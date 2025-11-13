-- Allow users to view their manager's profile
CREATE POLICY "Users can view their manager's profile"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT manager_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND manager_id IS NOT NULL
  )
);