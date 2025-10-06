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
  isMandatory = false,
  isAdmin = false,
  onEnroll,
  onViewDetails,
  onDelete,
}: CourseCardProps) => {
  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-success/10 text-success border-success/30';
      case 'intermediate':
        return 'bg-warning/10 text-warning border-warning/30';
      case 'advanced':
        return 'bg-error/10 text-error border-error/30';
      default:
        return 'bg-muted/10 text-muted-foreground border-border';
    }
  };

  const getTypeColor = (courseType: string) => {
    switch (courseType.toLowerCase()) {
      case 'pre-joining':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'onboarding':
        return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
      case 'technical':
        return 'bg-accent/10 text-accent-foreground border-accent/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-border';
    }
  };

  return (
    <Card className="group relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl h-full flex flex-col">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Mandatory indicator */}
      {isMandatory && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-error text-error-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg shadow-md">
            MANDATORY
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex gap-2 mb-3 flex-wrap">
          <Badge variant="outline" className={`${getTypeColor(type)} border`}>
            {type}
          </Badge>
          <Badge variant="outline" className={`${getDifficultyColor(difficulty)} border`}>
            {difficulty}
          </Badge>
        </div>
        
        <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
          {title}
        </CardTitle>
        
        <CardDescription className="text-sm text-muted-foreground line-clamp-3 min-h-[4rem] mt-2">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 flex-grow relative z-10">
        {/* Course Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">{duration}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">{enrolledCount}</span>
          </div>
          
          {rating && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-warning text-warning" />
              <span className="font-medium">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Progress bar for enrolled courses */}
        {isEnrolled && progress !== undefined && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground font-medium">Progress</span>
              <span className="font-bold text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t bg-muted/30 relative z-10">
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => onViewDetails?.(id)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {isEnrolled ? 'Continue' : 'View'}
          </Button>
          
          {!isEnrolled && !isAdmin && (
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              onClick={() => onEnroll?.(id)}
            >
              Enroll Now
            </Button>
          )}
          
          {!isEnrolled && isAdmin && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onViewDetails?.(id)}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage
            </Button>
          )}
          
          {isAdmin && (
            <Button 
              variant="destructive" 
              size="icon" 
              className="shrink-0"
              onClick={() => onDelete?.(id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
