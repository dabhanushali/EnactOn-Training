import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Calendar, CheckCircle, Clock, Award, FileText, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface CourseEnrollment {
  id: string;
  status: string;
  enrolled_date: string;
  completion_date: string | null;
  course: {
    id: string;
    course_name: string;
    course_description: string | null;
  };
}

interface CourseAssessment {
  id: string;
  percentage: number | null;
  passing_score: number | null;
  status: string | null;
  course_id: string;
  assessment_template_id: string | null;
}

interface ModuleProgress {
  module_id: string;
  course_id: string;
  completed: boolean;
}

interface CourseModule {
  id: string;
  course_id: string;
}

interface AssessmentTemplate {
  id: string;
  course_id: string;
}

interface EmployeeCourseEnrollmentsProps {
  employeeId: string;
}

export function EmployeeCourseEnrollments({ employeeId }: EmployeeCourseEnrollmentsProps) {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [assessments, setAssessments] = useState<CourseAssessment[]>([]);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress[]>([]);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [assessmentTemplates, setAssessmentTemplates] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId) {
      fetchEnrollments();
    }
  }, [employeeId]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      
      // Fetch course enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          status,
          enrolled_date,
          completion_date,
          course:courses!inner (
            id,
            course_name,
            course_description
          )
        `)
        .eq('employee_id', employeeId)
        .order('enrolled_date', { ascending: false });

      if (enrollmentError) throw enrollmentError;

      const courseIds = enrollmentData?.map(e => e.course.id) || [];

      if (courseIds.length === 0) {
        setEnrollments([]);
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [assessmentRes, moduleProgressRes, modulesRes, templatesRes] = await Promise.all([
        // Fetch course assessments
        supabase
          .from('course_assessments')
          .select('id, percentage, passing_score, status, course_id, assessment_template_id')
          .eq('employee_id', employeeId),
        // Fetch module progress
        supabase
          .from('module_progress')
          .select('module_id, course_id, completed')
          .eq('employee_id', employeeId),
        // Fetch all modules for enrolled courses
        supabase
          .from('course_modules')
          .select('id, course_id')
          .in('course_id', courseIds),
        // Fetch assessment templates for enrolled courses
        supabase
          .from('assessment_templates')
          .select('id, course_id')
          .in('course_id', courseIds)
      ]);

      if (assessmentRes.error) throw assessmentRes.error;
      if (moduleProgressRes.error) throw moduleProgressRes.error;
      if (modulesRes.error) throw modulesRes.error;
      if (templatesRes.error) throw templatesRes.error;

      setEnrollments(enrollmentData || []);
      setAssessments(assessmentRes.data || []);
      setModuleProgress(moduleProgressRes.data || []);
      setModules(modulesRes.data || []);
      setAssessmentTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Error fetching course enrollments:', error);
      toast.error('Failed to load course enrollments');
    } finally {
      setLoading(false);
    }
  };

  const getEnrollmentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'enrolled':
        return <Badge variant="outline"><BookOpen className="w-3 h-3 mr-1" />Enrolled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCourseModuleProgress = (courseId: string) => {
    const courseModules = modules.filter(m => m.course_id === courseId);
    const completedModules = moduleProgress.filter(
      mp => mp.course_id === courseId && mp.completed
    );
    return {
      completed: completedModules.length,
      total: courseModules.length,
      percentage: courseModules.length > 0 
        ? Math.round((completedModules.length / courseModules.length) * 100) 
        : 0
    };
  };

  const getCourseAssessmentProgress = (courseId: string) => {
    const courseTemplates = assessmentTemplates.filter(t => t.course_id === courseId);
    const courseAssessments = assessments.filter(a => a.course_id === courseId);
    
    // Count unique passed assessments (one per template)
    const passedTemplates = new Set<string>();
    
    courseAssessments.forEach(a => {
      const status = a.status?.toLowerCase();
      const percentage = a.percentage ?? 0;
      const passingScore = a.passing_score ?? 70;
      const isPassed = (status === 'completed' || status === 'passed') && percentage >= passingScore;
      
      if (isPassed && a.assessment_template_id) {
        passedTemplates.add(a.assessment_template_id);
      }
    });

    return {
      completed: passedTemplates.size,
      total: courseTemplates.length,
      percentage: courseTemplates.length > 0 
        ? Math.round((passedTemplates.size / courseTemplates.length) * 100) 
        : 0
    };
  };

  const getOverallProgress = (courseId: string) => {
    const moduleStats = getCourseModuleProgress(courseId);
    const assessmentStats = getCourseAssessmentProgress(courseId);
    
    const totalItems = moduleStats.total + assessmentStats.total;
    const completedItems = moduleStats.completed + assessmentStats.completed;
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-muted/20 rounded-lg animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No course enrollments found</p>
        <p className="text-sm text-muted-foreground mt-1">Courses will appear here once assigned</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {enrollments.map((enrollment) => {
        const moduleStats = getCourseModuleProgress(enrollment.course.id);
        const assessmentStats = getCourseAssessmentProgress(enrollment.course.id);
        const overallProgress = getOverallProgress(enrollment.course.id);
        
        return (
          <div key={enrollment.id} className="p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{enrollment.course.course_name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {enrollment.course.course_description || 'No description available'}
                </p>
              </div>
              <div className="ml-3">
                {getEnrollmentStatusBadge(enrollment.status)}
              </div>
            </div>
            
            {/* Overall Progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            {/* Module and Assessment Progress */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Module Progress */}
              <div className="bg-muted/30 rounded-md p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Layers className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium">Modules</span>
                </div>
                <p className="text-sm font-semibold">
                  {moduleStats.completed} / {moduleStats.total}
                  <span className="text-xs font-normal text-muted-foreground ml-1">completed</span>
                </p>
                {moduleStats.total > 0 && (
                  <Progress value={moduleStats.percentage} className="h-1 mt-1" />
                )}
              </div>

              {/* Assessment Progress */}
              <div className="bg-muted/30 rounded-md p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3 h-3 text-green-500" />
                  <span className="text-xs font-medium">Assessments</span>
                </div>
                <p className="text-sm font-semibold">
                  {assessmentStats.completed} / {assessmentStats.total}
                  <span className="text-xs font-normal text-muted-foreground ml-1">passed</span>
                </p>
                {assessmentStats.total > 0 && (
                  <Progress value={assessmentStats.percentage} className="h-1 mt-1" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                <span>Enrolled: {new Date(enrollment.enrolled_date).toLocaleDateString()}</span>
              </div>
              {enrollment.completion_date && (
                <div className="flex items-center">
                  <Award className="w-3 h-3 mr-1" />
                  <span>Completed: {new Date(enrollment.completion_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
