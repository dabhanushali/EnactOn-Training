-- Ensure the get_trainee_readiness_data function exists and is properly configured
-- This fixes the 404 error when accessing the readiness report

CREATE OR REPLACE FUNCTION get_trainee_readiness_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    caller_role TEXT;
    avg_assessment_score NUMERIC;
    avg_project_score NUMERIC;
    overall_score NUMERIC;
BEGIN
    -- Get the role of the user calling the function
    SELECT r.role_name INTO caller_role
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid();

    -- Ensure the calling user is Management, HR, the user themselves, or a Team Lead viewing their reportee
    IF NOT (
        auth.uid() = p_user_id OR
        caller_role IN ('Management', 'Human Resources') OR
        (caller_role = 'Team Lead' AND EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND manager_id = auth.uid()))
    ) THEN
        RAISE EXCEPTION 'Unauthorized to view this readiness report.';
    END IF;

    -- Calculate average assessment score
    SELECT AVG(ca.percentage) INTO avg_assessment_score
    FROM course_assessments ca
    WHERE ca.employee_id = p_user_id;

    -- Calculate average project evaluation score
    SELECT AVG(pe.overall_score) INTO avg_project_score
    FROM project_evaluations pe
    WHERE pe.employee_id = p_user_id;

    -- Calculate overall readiness score (example weights: assessments 60%, projects 40%)
    overall_score := COALESCE(avg_assessment_score * 0.6, 0) +
                     COALESCE(avg_project_score * 10 * 0.4, 0); -- score is out of 10, so multiply by 10

    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object(
                'user_id', p.id,
                'first_name', p.first_name,
                'last_name', p.last_name,
                'email', u.email,
                'designation', p.designation,
                'department', p.department
            )
            FROM profiles p
            JOIN auth.users u ON p.id = u.id
            WHERE p.id = p_user_id
        ),
        'readiness_summary', jsonb_build_object(
            'overall_readiness_score', ROUND(overall_score, 2),
            'average_assessment_score', ROUND(COALESCE(avg_assessment_score, 0), 2),
            'average_project_score', ROUND(COALESCE(avg_project_score, 0), 2)
        ),
        'completed_courses', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'course_id', c.id,
                    'course_name', c.course_name,
                    'completion_date', ce.completion_date
                )
            ), '[]'::jsonb)
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            WHERE ce.employee_id = p_user_id AND ce.status = 'completed'
        ),
        'pending_courses', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'course_id', c.id,
                    'course_name', c.course_name,
                    'enrollment_date', ce.enrolled_date
                )
            ), '[]'::jsonb)
            FROM course_enrollments ce
            JOIN courses c ON ce.course_id = c.id
            WHERE ce.employee_id = p_user_id AND ce.status != 'completed'
        ),
        'assessment_details', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'assessment_id', ca.id,
                    'course_name', c.course_name,
                    'assessment_title', at.title,
                    'score', ca.percentage,
                    'passed', (ca.percentage >= at.passing_score),
                    'taken_at', ca.created_at
                )
            ), '[]'::jsonb)
            FROM course_assessments ca
            JOIN assessment_templates at ON ca.assessment_template_id = at.id
            JOIN courses c ON at.course_id = c.id
            WHERE ca.employee_id = p_user_id
        ),
        'project_details', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'project_id', p.id,
                    'project_name', p.project_name,
                    'status', pa.status,
                    'evaluation', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'evaluator', (SELECT profiles.first_name || ' ' || profiles.last_name FROM profiles WHERE profiles.id = pe.evaluator_id),
                                'overall_score', pe.overall_score,
                                'strengths', pe.strengths,
                                'areas_for_improvement', pe.areas_for_improvement,
                                'evaluation_date', pe.evaluation_date
                            )
                        )
                        FROM project_evaluations pe
                        WHERE pe.project_id = p.id AND pe.employee_id = p_user_id
                    )
                )
            ), '[]'::jsonb)
            FROM project_assignments pa
            JOIN projects p ON pa.project_id = p.id
            WHERE pa.assignee_id = p_user_id
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Grant execution rights to the function
GRANT EXECUTE ON FUNCTION get_trainee_readiness_data(UUID) TO authenticated;