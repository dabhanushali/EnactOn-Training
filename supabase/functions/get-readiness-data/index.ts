import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { userId } = await req.json();
    if (!userId) {
      throw new Error('Missing userId parameter');
    }

    // Get user role for authorization
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, roles(role_name), manager_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile query error:', profileError);
      throw new Error(`Unable to verify user role: ${profileError?.message || 'Profile not found'}`);
    }

    const userRole = (profile as any)?.roles?.role_name;

    // Authorization check
    const isOwner = user.id === userId;
    const isHRorManagement = ['Human Resources', 'Management'].includes(userRole || '');

    // For Team Lead, check if the target user reports to them
    let isTeamLead = false;
    if (userRole === 'Team Lead') {
      const { data: teamLeadCheck } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .eq('manager_id', user.id);
      isTeamLead = teamLeadCheck && teamLeadCheck.length > 0;
    }

    if (!isOwner && !isHRorManagement && !isTeamLead) {
      throw new Error('Unauthorized to view this readiness report');
    }

    // Get profile data
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, designation, department')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      throw new Error('Target user not found');
    }

    // Get user email from auth
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    // Get average assessment score
    const { data: assessments } = await supabaseAdmin
      .from('course_assessments')
      .select('percentage')
      .eq('employee_id', userId);

    const avgAssessmentScore = assessments && assessments.length > 0
      ? assessments.reduce((sum: number, a: any) => sum + a.percentage, 0) / assessments.length
      : 0;

    // Get average project score
    const { data: evaluations } = await supabaseAdmin
      .from('project_evaluations')
      .select('overall_score')
      .eq('employee_id', userId);

    const avgProjectScore = evaluations && evaluations.length > 0
      ? evaluations.reduce((sum: number, e: any) => sum + e.overall_score, 0) / evaluations.length
      : 0;

    // Calculate overall score
    const overallScore = (avgAssessmentScore * 0.6) + (avgProjectScore * 10 * 0.4);

    // Get completed courses
    const { data: completedCourses } = await supabaseAdmin
      .from('course_enrollments')
      .select('course_id, completion_date, courses!inner(course_name)')
      .eq('employee_id', userId)
      .eq('status', 'completed');

    // Get pending courses
    const { data: pendingCourses } = await supabaseAdmin
      .from('course_enrollments')
      .select('course_id, enrolled_date, courses!inner(course_name)')
      .eq('employee_id', userId)
      .neq('status', 'completed');

    // Get detailed assessment information
    const { data: assessmentDetails } = await supabaseAdmin
      .from('course_assessments')
      .select(`
        id,
        percentage,
        created_at,
        assessment_template_id!inner(
          title,
          passing_score,
          course_id!inner(course_name)
        )
      `)
      .eq('employee_id', userId);

    // Get project details with evaluations
    const { data: projectDetails } = await supabaseAdmin
      .from('project_assignments')
      .select(`
        project_id,
        status,
        projects!inner(project_name),
        project_evaluations!left(
          evaluator_id,
          overall_score,
          strengths,
          areas_for_improvement,
          evaluation_date
        )
      `)
      .eq('assignee_id', userId);

    const readinessData = {
      profile: {
        user_id: targetProfile.id,
        first_name: targetProfile.first_name,
        last_name: targetProfile.last_name,
        email: authUser.user?.email || '',
        designation: targetProfile.designation,
        department: targetProfile.department,
      },
      readiness_summary: {
        overall_readiness_score: Math.round(overallScore * 100) / 100,
        average_assessment_score: Math.round(avgAssessmentScore * 100) / 100,
        average_project_score: Math.round(avgProjectScore * 100) / 100,
      },
      completed_courses: completedCourses?.map(course => ({
        course_id: course.course_id,
        course_name: (course as any).courses.course_name,
        completion_date: course.completion_date
      })) || [],
      pending_courses: pendingCourses?.map(course => ({
        course_id: course.course_id,
        course_name: (course as any).courses.course_name,
        enrollment_date: course.enrolled_date
      })) || [],
      assessment_details: assessmentDetails?.map(assessment => ({
        assessment_id: assessment.id,
        course_name: (assessment as any).assessment_template_id.course_id.course_name,
        assessment_title: (assessment as any).assessment_template_id.title,
        score: assessment.percentage,
        passed: assessment.percentage >= (assessment as any).assessment_template_id.passing_score,
        taken_at: assessment.created_at
      })) || [],
      project_details: projectDetails?.map(project => {
        const evaluations = (project as any).project_evaluations || [];
        return {
          project_id: project.project_id,
          project_name: (project as any).projects.project_name,
          status: project.status,
          evaluation: evaluations.length > 0 ? evaluations.map((evaluation: any) => ({
            evaluator: evaluation.evaluator_id, // You could join with profiles here if needed
            overall_score: evaluation.overall_score,
            strengths: evaluation.strengths,
            areas_for_improvement: evaluation.areas_for_improvement,
            evaluation_date: evaluation.evaluation_date
          })) : null
        };
      }) || [],
    };

    return new Response(
      JSON.stringify({ success: true, data: readinessData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error getting readiness data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
