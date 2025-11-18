import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Plus, Users, TrendingUp, Target, 
  Clock, CheckCircle, AlertCircle, Play 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CourseQuickActionsProps {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  pendingEnrollments?: number;
  userRole: string;
}

export const CourseQuickActions = ({ 
  totalCourses, 
  activeCourses, 
  completedCourses,
  pendingEnrollments = 0,
  userRole 
}: CourseQuickActionsProps) => {
  const navigate = useNavigate();
  const canManage = ['Management', 'Human Resources', 'Team Lead'].includes(userRole);
  
  const completionRate = totalCourses > 0 
    ? (completedCourses / totalCourses) * 100 
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {/* Total Courses */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <Badge variant="secondary" className="text-xs">
              Total
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-foreground">{totalCourses}</p>
            <p className="text-sm text-muted-foreground">Available Courses</p>
          </div>
        </CardContent>
      </Card>

      {/* Active Courses */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-white hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate('/courses')}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-warning/10">
              <Play className="w-6 h-6 text-warning" />
            </div>
            <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
              Active
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-foreground">{activeCourses}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
        </CardContent>
      </Card>

      {/* Completed Courses */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-success/10">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <Badge className="bg-success/20 text-success border-success/30 text-xs">
              Done
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-foreground">{completedCourses}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </CardContent>
      </Card>

      {/* Completion Rate or Quick Action */}
      {canManage ? (
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-white hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate('/courses/create')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                Action
              </Badge>
            </div>
            <div className="space-y-2">
              <Button 
                className="w-full bg-primary hover:bg-primary/90" 
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-white hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">
                Rate
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-primary">{completionRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
