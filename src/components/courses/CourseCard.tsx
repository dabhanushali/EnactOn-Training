import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  Users, 
  BookOpen, 
  Trash2, 
  Edit3, 
  Play, 
  Calendar,
  Award,
  CheckCircle2,
  UserPlus,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  duration?: string;
  enrolledCount?: number;
  progress?: number;
  isEnrolled?: boolean;
  isMandatory?: boolean;
  isAdmin?: boolean;
  instructor?: {
    name: string;
    avatar?: string;
  };
  completionRate?: number;
  dueDate?: string;
  moduleCount?: number;
  estimatedTime?: string;
  skillTags?: string[];
  isNew?: boolean;
  userRole?: string;
  onEnroll?: (courseId: string) => void;
  onViewDetails?: (courseId: string) => void;
  onEdit?: (courseId: string) => void;
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
  progress,
  isEnrolled = false,
  isMandatory = false,
  isAdmin = false,
  instructor,
  completionRate,
  dueDate,
  moduleCount,
  estimatedTime,
  skillTags = [],
  isNew = false,
  userRole = 'Trainee',
  onEnroll,
  onViewDetails,
  onEdit,
  onDelete,
}: CourseCardProps) => {
  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (courseType: string) => {
    switch (courseType.toLowerCase()) {
      case 'pre-joining':
        return 'bg-purple-100 text-purple-800';
      case 'onboarding':
        return 'bg-blue-100 text-blue-800';
      case 'technical':
        return 'bg-green-100 text-green-800';
      case 'soft-skills':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = dueDate && new Date(dueDate) < new Date();
  const isTrainee = userRole === 'Trainee';

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      isMandatory && "ring-2 ring-red-200",
      isNew && "ring-2 ring-blue-200"
    )}>
      {/* Status Indicators */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        {isNew && (
          <Badge className="bg-blue-500 text-white text-xs">
            New
          </Badge>
        )}
        {isMandatory && (
          <Badge className="bg-red-500 text-white text-xs">
            Required
          </Badge>
        )}
        {isOverdue && (
          <Badge className="bg-orange-500 text-white text-xs">
            Overdue
          </Badge>
        )}
      </div>

      <CardHeader className="pb-3">
        {/* Course Type Badge */}
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className={getTypeColor(type)}>
            {type}
          </Badge>
        </div>
        
        <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
          {title}
        </CardTitle>
        
        <CardDescription className="text-sm line-clamp-2">
          {description}
        </CardDescription>

        {/* Instructor Info */}
        {instructor && (
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="w-5 h-5">
              <AvatarImage src={instructor.avatar} />
              <AvatarFallback className="text-xs">
                {instructor.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{instructor.name}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Course Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded p-2">
            <Clock className="w-3 h-3" />
            <span>{estimatedTime || duration || 'Self-paced'}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded p-2">
            <BookOpen className="w-3 h-3" />
            <span>{moduleCount || 0} modules</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded p-2">
            <Users className="w-3 h-3" />
            <span>{enrolledCount} enrolled</span>
          </div>
          
          <Badge variant="outline" className={getDifficultyColor(difficulty)}>
            {difficulty}
          </Badge>
        </div>

        {/* Skill Tags */}
        {skillTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skillTags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {skillTags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{skillTags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Progress Section - Only for enrolled trainees */}
        {isEnrolled && progress !== undefined && isTrainee && (
          <div className="space-y-2 p-3 bg-muted/50 rounded">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <div className="flex items-center gap-1">
                {progress >= 100 ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : null}
                <span className="font-bold text-sm">
                  {Math.round(progress || 0)}%
                </span>
              </div>
            </div>
            <Progress value={progress || 0} className="h-2" />
          </div>
        )}

        {/* Due Date Warning - Only for trainees */}
        {dueDate && !isEnrolled && isTrainee && (
          <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded p-2">
            <Calendar className="w-3 h-3" />
            <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Completion Rate for Admins */}
        {isAdmin && completionRate !== undefined && (
          <div className="flex items-center justify-between text-xs bg-green-50 rounded p-2">
            <div className="flex items-center gap-2">
              <Award className="w-3 h-3 text-green-500" />
              <span className="text-green-700">Completion Rate</span>
            </div>
            <span className="font-bold text-green-600">{completionRate.toFixed(1)}%</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 space-y-3">
        {/* Primary Action Button */}
        <div className="w-full">
          {/* For Trainees */}
          {isTrainee && !isEnrolled ? (
            <Button
              className="w-full"
              onClick={() => onEnroll?.(id)}
            >
              <Play className="w-4 h-4 mr-2" />
              {isMandatory ? 'Start Required Course' : 'Enroll Now'}
            </Button>
          ) : isTrainee && isEnrolled ? (
            <Button
              className="w-full"
              onClick={() => onViewDetails?.(id)}
            >
              {progress && progress >= 100 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  View Certificate
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Continue Learning
                </>
              )}
            </Button>
          ) : (
            /* For Admins/HR/Management */
            <Button
              className="w-full"
              onClick={() => onViewDetails?.(id)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign to Employees
            </Button>
          )}
        </div>

        {/* Secondary Actions */}
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails?.(id)}
          >
            <Eye className="w-4 h-4 mr-1" />
            {isAdmin ? 'Manage' : 'Details'}
          </Button>
          
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit?.(id)}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete?.(id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};