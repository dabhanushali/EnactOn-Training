import { useAuth } from '@/hooks/auth-utils';
import { UserRoles } from '@/lib/enums';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Target,
  FolderOpen,
  BarChart3,
  Activity,
  Star,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface DashboardStats {
  totalEmployees: number;
  activeCourses: number;
  completedCourses: number;
  totalCourses: number;
  completionRate: number;
  totalProjects: number;
  monthlyGrowth: number;
  recentActivity: Array<{
    id: string;
    type: 'enrollment' | 'completion' | 'assignment';
    description: string;
    time: string;
    user: string;
  }>;
  departmentStats: Array<{
    name: string;
    employees: number;
    completionRate: number;
  }>;
  loading: boolean;
}

export const EnhancedDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const userRole = profile?.role?.role_name;
  
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeCourses: 0,
    completedCourses: 0,
    totalCourses: 0,
    completionRate: 0,
    totalProjects: 0,
    monthlyGrowth: 0,
    recentActivity: [],
    departmentStats: [],
    loading: true
  });

  const fetchDashboardStats = useCallback(async () => {
    try {
      const { id: userId, role } = profile || {};
      const userRoleName = role?.role_name;

      let data: Partial<DashboardStats> = { loading: false };

      if (userRoleName === UserRoles.MANAGEMENT || userRoleName === UserRoles.HR) {
        // Management/HR Dashboard
        const [employeesResult, coursesResult, projectsResult, enrollmentsResult] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('courses').select('*', { count: 'exact', head: true }),
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('course_enrollments').select('status, created_at')
        ]);

        const totalEmployees = employeesResult.count || 0;
        const totalCourses = coursesResult.count || 0;
        const totalProjects = projectsResult.count || 0;
        const enrollments = enrollmentsResult.data || [];
        
        const completed = enrollments.filter(e => e.status === 'completed').length;
        const completionRate = enrollments.length > 0 ? (completed / enrollments.length) * 100 : 0;

        // Mock data for enhanced features
        const recentActivity = [
          { id: '1', type: 'enrollment' as const, description: 'New employee enrolled in React Fundamentals', time: '2 hours ago', user: 'John Doe' },
          { id: '2', type: 'completion' as const, description: 'Course completed: Advanced JavaScript', time: '4 hours ago', user: 'Jane Smith' },
          { id: '3', type: 'assignment' as const, description: 'Project assigned: E-commerce Dashboard', time: '1 day ago', user: 'Team Lead' },
        ];

        const departmentStats = [
          { name: 'Development', employees: 12, completionRate: 85 },
          { name: 'Design', employees: 6, completionRate: 78 },
          { name: 'Marketing', employees: 8, completionRate: 92 },
        ];

        data = {
          totalEmployees,
          totalCourses,
          totalProjects,
          completionRate,
          monthlyGrowth: 12.5,
          recentActivity,
          departmentStats,
          loading: false
        };

      } else if (userRoleName === UserRoles.TRAINEE) {
        // Trainee Dashboard
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('status, courses(*)')
          .eq('employee_id', userId);
        
        const activeCourses = enrollments?.filter(e => e.status === 'enrolled').length || 0;
        const completedCourses = enrollments?.filter(e => e.status === 'completed').length || 0;

        data = {
          activeCourses,
          completedCourses,
          loading: false
        };
      }

      setStats(prev => ({ ...prev, ...data }));

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardStats();
    }
  }, [fetchDashboardStats, profile?.id]);

  const StatCard = ({ title, value, description, icon: Icon, trend, onClick }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    trend?: { value: number; isPositive: boolean };
    onClick?: () => void;
  }) => (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-6 w-6 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        {trend && (
          <div className="flex items-center gap-1">
            {trend.isPositive ? (
              <ArrowUp className="h-3 w-3 text-success" />
            ) : (
              <ArrowDown className="h-3 w-3 text-error" />
            )}
            <span className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-error'}`}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-xs text-muted-foreground">from last month</span>
          </div>
        )}
      </CardContent>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
    </Card>
  );

  const renderManagementDashboard = () => (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats.loading ? "..." : stats.totalEmployees}
          description="Active workforce"
          icon={Users}
          trend={{ value: stats.monthlyGrowth, isPositive: true }}
          onClick={() => navigate('/employees')}
        />
        <StatCard
          title="Total Courses"
          value={stats.loading ? "..." : stats.totalCourses}
          description="Available in catalog"
          icon={BookOpen}
          onClick={() => navigate('/courses')}
        />
        <StatCard
          title="Completion Rate"
          value={stats.loading ? "..." : `${stats.completionRate.toFixed(0)}%`}
          description="Average course completion"
          icon={CheckCircle}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="Active Projects"
          value={stats.loading ? "..." : stats.totalProjects}
          description="Ongoing assignments"
          icon={FolderOpen}
          onClick={() => navigate('/projects')}
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Department Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.departmentStats.map((dept, index) => (
                <div key={dept.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{dept.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {dept.employees} employees
                      </Badge>
                      <span className="text-sm font-bold">{dept.completionRate}%</span>
                    </div>
                  </div>
                  <Progress value={dept.completionRate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'completion' ? 'bg-success/10' :
                    activity.type === 'enrollment' ? 'bg-primary/10' : 'bg-warning/10'
                  }`}>
                    {activity.type === 'completion' && <CheckCircle className="h-3 w-3 text-success" />}
                    {activity.type === 'enrollment' && <BookOpen className="h-3 w-3 text-primary" />}
                    {activity.type === 'assignment' && <Target className="h-3 w-3 text-warning" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{activity.user}</p>
                    <p className="text-sm text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTraineeDashboard = () => (
    <div className="space-y-8">
      {/* Personal Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Active Courses"
          value={stats.loading ? "..." : stats.activeCourses}
          description="Currently enrolled"
          icon={BookOpen}
          onClick={() => navigate('/courses')}
        />
        <StatCard
          title="Completed"
          value={stats.loading ? "..." : stats.completedCourses}
          description="Courses finished"
          icon={Award}
        />
        <StatCard
          title="Learning Streak"
          value="7 days"
          description="Keep it up!"
          icon={Star}
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Learning Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Your Learning Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Continue your learning path and unlock new achievements!</p>
            <Button onClick={() => navigate('/courses')} className="mt-4">
              Continue Learning
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center md:text-left">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3">
          Welcome back, {profile?.first_name}!
        </h1>
        <p className="text-lg text-muted-foreground">
          {userRole === UserRoles.MANAGEMENT && "Monitor your organization's training performance and growth."}
          {userRole === UserRoles.HR && "Manage employee development and training programs."}
          {userRole === UserRoles.TEAM_LEAD && "Guide your team's learning journey and track progress."}
          {userRole === UserRoles.TRAINEE && "Continue your learning journey and unlock your potential."}
        </p>
      </div>

      {/* Role-specific Dashboard Content */}
      {userRole === UserRoles.MANAGEMENT && renderManagementDashboard()}
      {userRole === UserRoles.TRAINEE && renderTraineeDashboard()}
      {(userRole === UserRoles.HR || userRole === UserRoles.TEAM_LEAD) && renderManagementDashboard()}

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {userRole === UserRoles.MANAGEMENT && (
              <>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/employees')}>
                  <Users className="h-4 w-4 mr-2" />
                  View Team
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/courses')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
              </>
            )}
            {userRole === UserRoles.HR && (
              <>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/employees')}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Employees
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/training-sessions')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Training
                </Button>
              </>
            )}
            {userRole === UserRoles.TEAM_LEAD && (
              <>
                <Button className="justify-start" onClick={() => navigate('/courses/create')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/projects')}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Assign Project
                </Button>
              </>
            )}
            {userRole === UserRoles.TRAINEE && (
              <>
                <Button className="justify-start" onClick={() => navigate('/courses')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => navigate('/training-sessions')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Join Sessions
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};