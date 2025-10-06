import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, BookOpen, Award } from 'lucide-react';

interface CourseProgressTrackerProps {
  completedModules: number;
  totalModules: number;
  completedAssessments: number;
  totalAssessments: number;
  averageScore?: number;
  estimatedTimeRemaining?: number;
  enrollmentDate?: string;
  completionDate?: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

export const CourseProgressTracker = ({
  completedModules,
  totalModules,
  completedAssessments,
  totalAssessments,
  averageScore,
  estimatedTimeRemaining,
  enrollmentDate,
  completionDate,
  status
}: CourseProgressTrackerProps) => {
  const moduleProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
  const assessmentProgress = totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0;
  const overallProgress = ((moduleProgress + assessmentProgress) / 2);

  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          label: 'Completed',
          color: 'text-success',
          bgColor: 'bg-success/10',
          borderColor: 'border-success/20'
        };
      case 'in_progress':
        return {
          icon: Clock,
          label: 'In Progress',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/20'
        };
      default:
        return {
          icon: AlertCircle,
          label: 'Not Started',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/20'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={`${statusConfig.borderColor} border-2`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Your Progress
          </CardTitle>
          <Badge className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Completion</span>
            <span className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Modules Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Modules</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {completedModules} / {totalModules}
            </span>
          </div>
          <Progress value={moduleProgress} className="h-2" />
        </div>

        {/* Assessments Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Assessments</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {completedAssessments} / {totalAssessments}
            </span>
          </div>
          <Progress value={assessmentProgress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          {averageScore !== undefined && (
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className={`text-xl font-bold ${averageScore >= 70 ? 'text-success' : 'text-warning'}`}>
                {averageScore.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Avg. Score</div>
            </div>
          )}
          
          {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-xl font-bold text-foreground">
                {estimatedTimeRemaining}h
              </div>
              <div className="text-xs text-muted-foreground mt-1">Time Left</div>
            </div>
          )}

          {enrollmentDate && (
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-sm font-medium text-foreground">
                {new Date(enrollmentDate).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Started</div>
            </div>
          )}

          {completionDate && (
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <div className="text-sm font-medium text-success">
                {new Date(completionDate).toLocaleDateString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Completed</div>
            </div>
          )}
        </div>

        {/* Motivational Message */}
        {status === 'in_progress' && overallProgress < 100 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">
              {overallProgress < 25 && "Great start! Keep up the momentum."}
              {overallProgress >= 25 && overallProgress < 50 && "You're making good progress!"}
              {overallProgress >= 50 && overallProgress < 75 && "You're halfway there! Keep going!"}
              {overallProgress >= 75 && "Almost done! You're so close!"}
            </p>
          </div>
        )}

        {status === 'completed' && (
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-xs text-success font-medium">
              🎉 Congratulations on completing this course!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
