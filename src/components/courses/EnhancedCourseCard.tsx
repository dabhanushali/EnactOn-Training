import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Clock, 
  Users, 
  BookOpen, 
  Star, 
  Trash2, 
  Edit3, 
  Play, 
  Calendar,
  Award,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2
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
  rating?: number;
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
  onEnroll?: (courseId: string) => void;
  onViewDetails?: (courseId: string) => void;
  onEdit?: (courseId: string) => void;
  onDelete?: (courseId: string) => void;
}

export const EnhancedCourseCard = ({
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
  instructor,
  completionRate,
  dueDate,
  moduleCount,
  estimatedTime,
  skillTags = [],
  isNew = false,
  onEnroll,
  onViewDetails,
  onEdit,
  onDelete,
}: CourseCardProps) => {
  const getDifficultyConfig = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return {
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: '🌱',
          label: 'Beginner'
        };
      case 'intermediate':
        return {
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: '⚡',
          label: 'Intermediate'
        };
      case 'advanced':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '🚀',
          label: 'Advanced'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📚',
          label: level
        };
    }
  };

  const getTypeConfig = (courseType: string) => {
    switch (courseType.toLowerCase()) {
      case 'pre-joining':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          gradient: 'from-purple-500 to-indigo-600'
        };
      case 'onboarding':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          gradient: 'from-blue-500 to-cyan-600'
        };
      case 'technical':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          gradient: 'from-green-500 to-teal-600'
        };
      case 'soft-skills':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          gradient: 'from-orange-500 to-red-600'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          gradient: 'from-gray-500 to-slate-600'
        };
    }
  };

  const difficultyConfig = getDifficultyConfig(difficulty);
  const typeConfig = getTypeConfig(type);
  const isOverdue = dueDate && new Date(dueDate) < new Date();
  const progressColor = progress && progress >= 80 ? 'text-green-600' : progress && progress >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <TooltipProvider>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-0 bg-white",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white before:via-white before:to-gray-50 before:opacity-60",
        isMandatory && "ring-2 ring-red-200 ring-offset-2",
        isNew && "ring-2 ring-blue-200 ring-offset-2"
      )}>
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50/50" />
        
        {/* Status Indicators */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          {isNew && (
            <Badge className="bg-blue-500 text-white border-0 shadow-lg text-xs px-2 py-1">
              ✨ New
            </Badge>
          )}
          {isMandatory && (
            <Badge className="bg-red-500 text-white border-0 shadow-lg text-xs px-2 py-1">
              ⚠️ Required
            </Badge>
          )}
          {isOverdue && (
            <Badge className="bg-orange-500 text-white border-0 shadow-lg text-xs px-2 py-1">
              🕐 Overdue
            </Badge>
          )}
        </div>

        <CardHeader className="relative z-10 pb-3">
          {/* Course Type Badge */}
          <div className="flex justify-between items-start mb-3">
            <Badge variant="outline" className={cn("border font-medium", typeConfig.color)}>
              {type}
            </Badge>
            {rating && (
              <div className="flex items-center gap-1 bg-white/80 rounded-full px-2 py-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <CardTitle className="text-lg font-bold leading-tight group-hover:text-blue-600 transition-colors">
            {title}
          </CardTitle>
          
          <CardDescription className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {description}
          </CardDescription>

          {/* Instructor Info */}
          {instructor && (
            <div className="flex items-center gap-2 mt-3">
              <Avatar className="w-6 h-6">
                <AvatarImage src={instructor.avatar} />
                <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                  {instructor.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-600 font-medium">by {instructor.name}</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="relative z-10 space-y-4">
          {/* Course Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="font-medium">{estimatedTime || duration || 'Self-paced'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
              <BookOpen className="w-4 h-4 text-green-500" />
              <span className="font-medium">{moduleCount || 'Multiple'} modules</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="font-medium">{enrolledCount} enrolled</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg p-2">
              <span className={cn("font-medium text-xs", difficultyConfig.color.split(' ')[1])}>
                {difficultyConfig.icon} {difficultyConfig.label}
              </span>
            </div>
          </div>

          {/* Skill Tags */}
          {skillTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skillTags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                >
                  {tag}
                </Badge>
              ))}
              {skillTags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600">
                  +{skillTags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Progress Section */}
          {isEnrolled && progress !== undefined && (
            <div className="space-y-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <div className="flex items-center gap-1">
                  {progress >= 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : progress >= 50 ? (
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Target className="w-4 h-4 text-orange-500" />
                  )}
                  <span className={cn("font-bold text-sm", progressColor)}>
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Due Date Warning */}
          {dueDate && !isEnrolled && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              <Calendar className="w-4 h-4" />
              <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
            </div>
          )}

          {/* Completion Rate for Admins */}
          {isAdmin && completionRate !== undefined && (
            <div className="flex items-center justify-between text-xs bg-green-50 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-green-500" />
                <span className="text-green-700 font-medium">Completion Rate</span>
              </div>
              <span className="font-bold text-green-600">{completionRate.toFixed(1)}%</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="relative z-10 pt-4 space-y-3">
          {/* Primary Action Button */}
          <div className="w-full">
            {!isEnrolled && !isAdmin ? (
              <Button
                className={cn(
                  "w-full h-10 font-semibold text-white border-0 shadow-lg transition-all duration-300",
                  `bg-gradient-to-r ${typeConfig.gradient} hover:shadow-xl hover:scale-105`
                )}
                onClick={() => onEnroll?.(id)}
              >
                <Play className="w-4 h-4 mr-2" />
                {isMandatory ? 'Start Required Course' : 'Enroll Now'}
              </Button>
            ) : isEnrolled ? (
              <Button
                className="w-full h-10 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
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
              <Button
                className="w-full h-10 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                onClick={() => onViewDetails?.(id)}
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Course
              </Button>
            )}
          </div>

          {/* Secondary Actions */}
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-200 hover:bg-gray-50"
              onClick={() => onViewDetails?.(id)}
            >
              <BookOpen className="w-4 h-4 mr-1" />
              Details
            </Button>
            
            {isAdmin && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-200 hover:bg-blue-50 text-blue-600"
                      onClick={() => onEdit?.(id)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Edit Course
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 hover:bg-red-50 text-red-600"
                      onClick={() => onDelete?.(id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Delete Course
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
};