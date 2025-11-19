-- Fix assessment_templates RLS policy to allow course creators to manage assessments
-- This resolves the RLS violation when creating assessments in courses

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "assessment_templates_manage_policy" ON public.assessment_templates;

-- Create a more flexible policy that allows:
-- 1. Management roles (Team Lead, HR, Management)
-- 2. Course creators (users who created the course)
-- 3. Assessment creators (users who created the assessment template)
CREATE POLICY "assessment_templates_manage_policy"
ON public.assessment_templates
FOR ALL
USING (
  -- Allow management roles
  get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'HR'::text, 'Management'::text]) OR
  -- Allow users who created the assessment
  created_by = auth.uid() OR
  -- Allow users who created the course
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_id
    AND c.created_by = auth.uid()
  )
);

-- Drop and recreate policies for related tables with same logic
DROP POLICY IF EXISTS "assessment_questions_manage_policy" ON public.assessment_questions;

CREATE POLICY "assessment_questions_manage_policy"
ON public.assessment_questions
FOR ALL
USING (
  -- Allow management roles
  get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'HR'::text, 'Management'::text]) OR
  -- Allow users who created the assessment template
  EXISTS (
    SELECT 1 FROM assessment_templates at
    WHERE at.id = assessment_template_id
    AND (
      at.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = at.course_id
        AND c.created_by = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "question_options_manage_policy" ON public.question_options;

CREATE POLICY "question_options_manage_policy"
ON public.question_options
FOR ALL
USING (
  -- Allow management roles
  get_user_role(auth.uid()) = ANY (ARRAY['Team Lead'::text, 'HR'::text, 'Management'::text]) OR
  -- Allow users who created the assessment template through the question
  EXISTS (
    SELECT 1 FROM assessment_questions aq
    JOIN assessment_templates at ON aq.assessment_template_id = at.id
    WHERE aq.id = question_id
    AND (
      at.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = at.course_id
        AND c.created_by = auth.uid()
      )
    )
  )
);

-- Add comments to document the policy changes
COMMENT ON POLICY "assessment_templates_manage_policy" ON public.assessment_templates IS 'Allows management roles and course creators to manage assessment templates';
COMMENT ON POLICY "assessment_questions_manage_policy" ON public.assessment_questions IS 'Allows management roles and assessment creators to manage assessment questions';
COMMENT ON POLICY "question_options_manage_policy" ON public.question_options IS 'Allows management roles and assessment creators to manage question options';