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
  course: {
    id: string;
    course_name: string;
    course_description?: string;
    completion_rule?: string;
    minimum_passing_percentage?: number;
  };
  completedAssessments: number;
  totalAssessments: number;
  isCompleted: boolean;
  isEnrolled?: boolean;
  completionDate?: string;
  enrollmentDate?: string;
  onViewModules: () => void;
  onTakeAssessment: () => void;
  onMarkComplete: (courseId: string) => void;
  isLoading?: boolean;
}

export const CourseEnrollment = ({
  course,
  completedAssessments,
  totalAssessments,
  isCompleted,
  completionDate,
  enrollmentDate,
  isEnrolled = true,
  onViewModules,
  onTakeAssessment,
  onMarkComplete,
  isLoading = false
}: CourseEnrollmentProps) => {
  // Check if assessments are complete before allowing "Mark as Complete"
  const canMarkComplete = totalAssessments === 0 || completedAssessments === totalAssessments;
  
  if (isCompleted) {
    return (
      <Card className="bg-gradient-to-br from-background to-muted/50 border-green-500/30">
        <CardContent className="p-6 text-center space-y-4">
          <Award className="w-16 h-16 text-yellow-500 mx-auto animate-pulse" />
          <h2 className="text-2xl font-bold">Congratulations!</h2>
          <p className="text-muted-foreground">
            You have successfully completed the course:
          </p>
          <p className="text-lg font-semibold">{course.course_name}</p>
          {completionDate && (
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 w-4 text-green-500" />
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
    course={course}
    completedAssessments={completedAssessments}
    totalAssessments={totalAssessments}
    canMarkComplete={canMarkComplete}
    isEnrolled={isEnrolled}
    enrollmentDate={enrollmentDate}
    onViewModules={onViewModules}
    onTakeAssessment={onTakeAssessment}
    onMarkComplete={onMarkComplete}
    isLoading={isLoading}
  />;
};

const InProgressCourse = ({
  course,
  completedAssessments = 0,
  totalAssessments = 0,
  canMarkComplete = true,
  isEnrolled = true,
  enrollmentDate,
  onViewModules,
  onTakeAssessment,
  onMarkComplete,
  isLoading = false,
}: Omit<CourseEnrollmentProps, 'isCompleted' | 'completionDate'> & { canMarkComplete?: boolean }) => {
  const { user } = useAuth();
  const [isLoadingMark, setIsLoadingMark] = useState(false);

  const completionPercentage = totalAssessments > 0 
    ? (completedAssessments / totalAssessments) * 100 
    : 0;

  const getCompletionRuleText = (rule: string) => {
    switch (rule) {
      case 'pass_all_assessments': return 'Pass all assessments to complete';
      case 'pass_minimum_percentage': return `Pass ${course.minimum_passing_percentage || 70}% of assessments`;
      case 'pass_mandatory_only': return 'Pass all mandatory assessments';
      default: return 'Complete all requirements';
    }
  };

  const handleMarkComplete = async () => {
    if (!user || !isEnrolled) {
      toast.error("You haven't enrolled in this course yet");
      return;
    }
    setIsLoadingMark(true);
    try {
      await onMarkComplete(course.id);
    } finally {
      setIsLoadingMark(false);
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
              disabled={isLoadingMark || !canMarkComplete || !isEnrolled}
              size="sm"
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isLoadingMark ? 'Marking...' : 'Mark as Complete'}
            </Button>
          )}
        </div>
        <CardTitle className="text-xl font-semibold">{course.course_name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Assessment Progress</span>
            <span className="font-medium">{completedAssessments}/{totalAssessments}</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">{getCompletionRuleText(course.completion_rule || 'pass_all_assessments')}</p>
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