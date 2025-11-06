import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, BookOpen, Star, Trash2 } from 'lucide-react';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  duration?: string;
  enrolledCount?: number;
  rating?: number;
  progress?: number;
  isEnrolled?: boolean;
  isCompleted?: boolean;
  isMandatory?: boolean;
  isAdmin?: boolean;
  onEnroll?: (courseId: string) => void;
  onViewDetails?: (courseId: string) => void;
  onDelete?: (courseId: string) => void;
}

export const CourseCard = ({
  id,
  title,
  description,
  type,
  difficulty,
  duration,
  enrolledCount = 0,
  rating,
  progress,
  isEnrolled = false,
  isCompleted = false,
  isMandatory = false,
  isAdmin = false,
  onEnroll,
  onViewDetails,
  onDelete,
}: CourseCardProps) => {
  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-success text-success-foreground';
      case 'intermediate':
        return 'bg-warning text-warning-foreground';
      case 'advanced':
        return 'bg-error text-error-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeColor = (courseType: string) => {
    switch (courseType.toLowerCase()) {
      case 'pre-joining':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'onboarding':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'technical':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
      {/* Gradient overlay for mandatory courses */}
      {isMandatory && (
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-error/20 to-transparent rounded-bl-3xl" />
      )}

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className={getTypeColor(type)}>
            {type}
          </Badge>
          {isMandatory && (
            <Badge variant="destructive" className="text-xs">
              Mandatory
            </Badge>
          )}
        </div>

        <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
          {title}
        </CardTitle>

        <CardDescription className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow">
        {/* Course Meta */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            {duration && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>{duration}</span>
              </div>
            )}

            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{enrolledCount}</span>
            </div>

            {rating && (
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-1 fill-current text-warning" />
                <span>{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <Badge variant="secondary" className={getDifficultyColor(difficulty)}>
            {difficulty}
          </Badge>
        </div>

        {/* Progress bar for enrolled courses */}
        {isEnrolled && progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 mt-auto">
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails?.(id)}
          >
            <BookOpen className="w-4 h-4" />
            View Details
          </Button>

          {!isEnrolled && !isAdmin ? (
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary text-white"
              onClick={() => onEnroll?.(id)}
            >
              Enroll Now
            </Button>
          ) : !isEnrolled && isAdmin ? (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onViewDetails?.(id)}
            >
              <Users className="w-4 h-4" />
              Assign Employees
            </Button>
          ) : isCompleted ? (
            <Button
              size="sm"
              className="flex-1"
              variant="secondary"
              onClick={() => onViewDetails?.(id)}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Review Course
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1"
              variant="default"
              onClick={() => onViewDetails?.(id)}
            >
              Continue
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(id)}
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground h-9 w-9"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
