import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Award, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';

interface CourseAssessmentProps {
  id: string;
  courseId: string;
  employeeId: string;
  assessmentType: string;
  title?: string;
  description?: string;
  timeLimit?: number;
  status?: string;
  totalScore?: number;
  percentage?: number;
  passingScore?: number;
  isMandatory?: boolean;
  grade?: string;
  feedback?: string;
  certificateUrl?: string;
  completionDate?: string;
  onRetakeAssessment?: (assessmentId: string) => void;
  onViewCertificate?: (certificateUrl: string) => void;
  onMarkAsComplete?: (assessmentId: string) => void;
  instructions?: string;
}

export const CourseAssessment = ({
  id,
  assessmentType,
  title,
  description,
  timeLimit,
  status = 'Pending',
  totalScore = 0,
  percentage = 0,
  passingScore = 70,
  isMandatory = false,
  grade,
  feedback,
  certificateUrl,
  completionDate,
  onRetakeAssessment,
  onViewCertificate,
  onMarkAsComplete,
  instructions,
}: CourseAssessmentProps) => {
  const isPassed = percentage >= passingScore;
  const isCompleted = status === 'Completed';
  const canRetake = isCompleted && !isPassed;

  const getStatusColor = (status: string, passed: boolean) => {
    if (status === 'Pending') return 'bg-warning/10 text-warning border-warning/20';
    if (passed) return 'bg-success/10 text-success border-success/20';
    return 'bg-error/10 text-error border-error/20';
  };

  const getStatusIcon = (status: string, passed: boolean) => {
    if (status === 'Pending') return <Clock className="w-4 h-4" />;
    if (passed) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return 'bg-muted text-muted-foreground';
    switch (grade.toUpperCase()) {
      case 'A':
      case 'A+':
        return 'bg-success text-success-foreground';
      case 'B':
      case 'B+':
        return 'bg-primary text-primary-foreground';
      case 'C':
      case 'C+':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-error text-error-foreground';
    }
  };

  if (assessmentType === 'project') {
    return (
      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{title || assessmentType}</CardTitle>
            {status !== 'Completed' && (
              <Button
                size="sm"
                onClick={() => onMarkAsComplete?.(id)}
              >
                Mark as Complete
              </Button>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
           {instructions && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Instructions:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{instructions}</p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mb-4">
            <p className="text-sm text-blue-800">
              This project is for practice purposes and will not be formally evaluated.
            </p>
          </div>
          {status === 'Completed' && (
            <div className="flex items-center text-sm text-success">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span>Completed</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className={getStatusColor(status, isPassed)}>
            <span className="mr-1">{getStatusIcon(status, isPassed)}</span>
            {status === 'Pending' ? 'Not Started' : isPassed ? 'Passed' : 'Failed'}
          </Badge>
          
          <div className="flex items-center space-x-2">
            {isMandatory && (
              <Badge variant="destructive" className="text-xs">
                Mandatory
              </Badge>
            )}
            {grade && (
              <Badge variant="secondary" className={getGradeColor(grade)}>
                Grade: {grade}
              </Badge>
            )}
          </div>
        </div>
        
        <CardTitle className="text-lg font-semibold">
          {title || assessmentType}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {timeLimit && (
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <Clock className="w-4 h-4 mr-1" />
            <span>{timeLimit} minutes</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Display */}
        {isCompleted && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span className="font-medium">
                {totalScore} points ({percentage.toFixed(1)}%)
              </span>
            </div>
            <Progress 
              value={percentage} 
              className="h-2"
              // Show different colors based on performance
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Passing Score: {passingScore}%</span>
              {isPassed ? (
                <span className="text-success">✓ Passed</span>
              ) : (
                <span className="text-error">✗ Failed</span>
              )}
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Feedback:</p>
            <p className="text-sm">{feedback}</p>
          </div>
        )}

        {/* Completion Date */}
        {completionDate && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-2" />
            <span>Completed: {new Date(completionDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {status === 'Pending' && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onRetakeAssessment?.(id)}
          >
            Start Assessment
          </Button>
          )}
          
          {canRetake && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onRetakeAssessment?.(id)}
            >
              Retake Assessment
            </Button>
          )}
          
          {certificateUrl && isPassed && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onViewCertificate?.(certificateUrl)}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Certificate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};