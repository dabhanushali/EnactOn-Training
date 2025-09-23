import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { toast } from 'sonner';
import { BookOpen, Award, CheckCircle, Clock, Star } from 'lucide-react';

interface CourseEnrollmentProps {
  courseId: string;
  courseName: string;
  courseDescription?: string;
  completionRule?: string;
  minimumPassingPercentage?: number;
  assessmentsCompleted?: number;
  totalAssessments?: number;
  isCompleted?: boolean;
  enrollmentDate?: string;
  completionDate?: string;
  onViewModules?: () => void;
  onTakeAssessment?: () => void;
}

export const CourseEnrollment = ({
  courseId,
  courseName,
  isCompleted = false,
  completionDate,
  assessmentsCompleted = 0,
  totalAssessments = 0,
  ...props
}: CourseEnrollmentProps) => {
  // Check if assessments are complete before allowing "Mark as Complete"
  const canMarkComplete = totalAssessments === 0 || assessmentsCompleted === totalAssessments;
  
  if (isCompleted) {
    return (
      <Card className="bg-gradient-to-br from-background to-muted/50 border-green-500/30">
        <CardContent className="p-6 text-center space-y-4">
          <Award className="w-16 h-16 text-yellow-500 mx-auto animate-pulse" />
          <h2 className="text-2xl font-bold">Congratulations!</h2>
          <p className="text-muted-foreground">
            You have successfully completed the course:
          </p>
          <p className="text-lg font-semibold">{courseName}</p>
          {completionDate && (
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Completed on {new Date(completionDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="pt-4">
            <Button variant="outline">
              <Star className="w-4 h-4 mr-2" />
              Review Course
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <InProgressCourse 
    courseId={courseId} 
    courseName={courseName} 
    canMarkComplete={canMarkComplete}
    {...props} 
  />;
};

const InProgressCourse = ({
  courseId,
  courseName,
  courseDescription,
  completionRule = 'pass_all_assessments',
  minimumPassingPercentage = 70,
  assessmentsCompleted = 0,
  totalAssessments = 0,
  enrollmentDate,
  canMarkComplete = true,
  onViewModules,
  onTakeAssessment,
}: Omit<CourseEnrollmentProps, 'isCompleted' | 'completionDate'> & { canMarkComplete?: boolean }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const completionPercentage = totalAssessments > 0 
    ? (assessmentsCompleted / totalAssessments) * 100 
    : 0;

  const getCompletionRuleText = (rule: string) => {
    switch (rule) {
      case 'pass_all_assessments': return 'Pass all assessments to complete';
      case 'pass_minimum_percentage': return `Pass ${minimumPassingPercentage}% of assessments`;
      case 'pass_mandatory_only': return 'Pass all mandatory assessments';
      default: return 'Complete all requirements';
    }
  };

  const handleMarkComplete = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .update({ status: 'completed', completion_date: new Date().toISOString() })
        .eq('employee_id', user.id)
        .eq('course_id', courseId);
      if (error) throw error;
      toast.success('Course marked as completed!');
    } catch (error) {
      toast.error('Failed to update course status');
      console.error('Error updating course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">In Progress</Badge>
            {enrollmentDate && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Enrolled: {new Date(enrollmentDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          {/* Move Mark as Complete button to top-right */}
          {totalAssessments === 0 && (
            <Button 
              onClick={handleMarkComplete} 
              disabled={isLoading || !canMarkComplete}
              size="sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isLoading ? 'Marking...' : 'Mark as Complete'}
            </Button>
          )}
        </div>
        <CardTitle className="text-xl font-semibold">{courseName}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Assessment Progress</span>
            <span className="font-medium">{assessmentsCompleted}/{totalAssessments}</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">{getCompletionRuleText(completionRule)}</p>
        </div>

        <div className="flex space-x-3 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onViewModules}>
            <BookOpen className="w-4 h-4 mr-2" />
            View Modules
          </Button>
          {totalAssessments > 0 ? (
            <Button className="flex-1" onClick={onTakeAssessment}>
              Go to Assessments
            </Button>
          ) : !canMarkComplete ? (
            <div className="flex-1 flex justify-end">
              <Button 
                disabled
                variant="secondary"
                title="Complete all required assessments first"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Assessments First
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};