import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Calendar, CheckCircle, Clock, Award } from 'lucide-react';
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
  percentage: number;
  passing_score: number;
  status: string;
  course_id: string;
}

interface EmployeeCourseEnrollmentsProps {
  employeeId: string;
}

export function EmployeeCourseEnrollments({ employeeId }: EmployeeCourseEnrollmentsProps) {
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [assessments, setAssessments] = useState<CourseAssessment[]>([]);
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

      // Fetch course assessments for progress calculation
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('course_assessments')
        .select('id, percentage, passing_score, status, course_id')
        .eq('employee_id', employeeId);

      if (assessmentError) throw assessmentError;

      setEnrollments(enrollmentData || []);
      setAssessments(assessmentData || []);
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

  const getCourseProgress = (courseId: string) => {
    const courseAssessments = assessments.filter(a => a.course_id === courseId);
    if (courseAssessments.length === 0) return 0;
    
    const passedAssessments = courseAssessments.filter(a => a.percentage >= a.passing_score).length;
    return Math.round((passedAssessments / courseAssessments.length) * 100);
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
        const progress = getCourseProgress(enrollment.course.id);
        const courseAssessments = assessments.filter(a => a.course_id === enrollment.course.id);
        
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
            
            {courseAssessments.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Assessment Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {assessments.filter(a => a.course_id === enrollment.course.id && a.percentage >= a.passing_score).length} of {courseAssessments.length} assessments passed
                </p>
              </div>
            )}
            
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