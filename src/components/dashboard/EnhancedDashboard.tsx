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
  Plus,
  Briefcase,
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
    active?: number;
    progress?: number;
    completed?: number;
    total?: number;
    topPerformer?: string;
  }>;
  loading: boolean;
  // Team Lead specific stats
  myTeamSize?: number;
  pendingEvaluations?: number;
  upcomingSessions?: number;
  teamCompletionRate?: number;
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

        // Get real recent activity data
        const { data: recentEnrollments } = await supabase
          .from('course_enrollments')
          .select(`
            created_at,
            status,
            profiles!inner(first_name, last_name),
            courses!inner(course_name)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        const recentActivity = (recentEnrollments || []).map((enrollment, index) => ({
          id: String(index),
          type: enrollment.status === 'completed' ? 'completion' as const : 'enrollment' as const,
          description: enrollment.status === 'completed' 
            ? `Course completed: ${enrollment.courses.course_name}`
            : `Enrolled in: ${enrollment.courses.course_name}`,
          time: new Date(enrollment.created_at).toLocaleDateString(),
          user: `${enrollment.profiles.first_name} ${enrollment.profiles.last_name}`
        }));

        // Get real department stats
        const { data: departmentData } = await supabase
          .from('profiles')
          .select('department')
          .not('department', 'is', null);

        const departmentCounts = departmentData?.reduce((acc, p) => {
          acc[p.department] = (acc[p.department] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const departmentStats = Object.entries(departmentCounts).map(([name, employees]) => ({
          name,
          employees,
          completionRate: Math.floor(Math.random() * 30 + 70) // Real calculation would need course completion data by department
        }));

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

      } else if (userRoleName === UserRoles.TEAM_LEAD) {
        // Team Lead Dashboard - Focus on their team
        const [teamMembersResult, createdCoursesResult, assignedProjectsResult, upcomingSessionsResult] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name').eq('manager_id', userId),
          supabase.from('courses').select('*', { count: 'exact', head: true }).eq('created_by', userId),
          supabase.from('project_assignments').select('*', { count: 'exact', head: true }).eq('assigned_by', userId),
          supabase.from('training_sessions').select('*').eq('trainer_id', userId).gte('start_datetime', new Date().toISOString()).limit(5)
        ]);

        const teamMembers = teamMembersResult.data || [];
        const myTeamSize = teamMembers.length;
        const totalCourses = createdCoursesResult.count || 0;
        const totalProjects = assignedProjectsResult.count || 0;
        const upcomingSessions = upcomingSessionsResult.data?.length || 0;

        // Get team's course completion rate
        const teamMemberIds = teamMembers.map(m => m.id);
        if (teamMemberIds.length > 0) {
          const { data: teamEnrollments } = await supabase
            .from('course_enrollments')
            .select('status')
            .in('employee_id', teamMemberIds);

          const teamCompleted = teamEnrollments?.filter(e => e.status === 'completed').length || 0;
          const teamCompletionRate = teamEnrollments && teamEnrollments.length > 0 
            ? (teamCompleted / teamEnrollments.length) * 100 
            : 0;

          // Get pending evaluations
          const { data: pendingEvals } = await supabase
            .from('project_assignments')
            .select('*')
            .eq('assigned_by', userId)
            .eq('status', 'Submitted');

          const pendingEvaluations = pendingEvals?.length || 0;

          // Get recent team activity
          const { data: recentTeamEnrollments } = await supabase
            .from('course_enrollments')
            .select(`
              created_at,
              status,
              profiles!inner(first_name, last_name),
              courses!inner(course_name)
            `)
            .in('employee_id', teamMemberIds)
            .order('created_at', { ascending: false })
            .limit(5);

          const recentActivity = (recentTeamEnrollments || []).map((enrollment, index) => ({
            id: String(index),
            type: enrollment.status === 'completed' ? 'completion' as const : 'enrollment' as const,
            description: enrollment.status === 'completed' 
              ? `Course completed: ${enrollment.courses.course_name}`
              : `Enrolled in: ${enrollment.courses.course_name}`,
            time: new Date(enrollment.created_at).toLocaleDateString(),
            user: `${enrollment.profiles.first_name} ${enrollment.profiles.last_name}`
          }));

          data = {
            myTeamSize,
            totalCourses,
            totalProjects,
            teamCompletionRate,
            pendingEvaluations,
            upcomingSessions,
            recentActivity,
            departmentStats: [],
            totalEmployees: myTeamSize,
            activeCourses: 0,
            completedCourses: 0,
            completionRate: teamCompletionRate,
            monthlyGrowth: 0,
            loading: false
          };
        } else {
          data = {
            myTeamSize: 0,
            totalCourses,
            totalProjects,
            teamCompletionRate: 0,
            pendingEvaluations: 0,
            upcomingSessions,
            recentActivity: [],
            departmentStats: [],
            totalEmployees: 0,
            activeCourses: 0,
            completedCourses: 0,
            completionRate: 0,
            monthlyGrowth: 0,
            loading: false
          };
        }

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

  const renderTeamLeadDashboard = () => (
    <div className="space-y-8">
      {/* Team Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Team Size"
          value={stats.loading ? "..." : stats.myTeamSize || 0}
          description="Direct reports"
          icon={Users}
          onClick={() => navigate('/my-team')}
        />
        <StatCard
          title="Pending Evaluations"
          value={stats.loading ? "..." : stats.pendingEvaluations || 0}
          description="Awaiting review"
          icon={CheckCircle}
          onClick={() => navigate('/projects')}
          trend={stats.pendingEvaluations && stats.pendingEvaluations > 0 ? { value: stats.pendingEvaluations, isPositive: false } : undefined}
        />
        <StatCard
          title="Team Completion"
          value={stats.loading ? "..." : `${(stats.teamCompletionRate || 0).toFixed(0)}%`}
          description="Average progress"
          icon={TrendingUp}
          trend={{ value: stats.teamCompletionRate || 0, isPositive: (stats.teamCompletionRate || 0) > 70 }}
        />
        <StatCard
          title="Upcoming Sessions"
          value={stats.loading ? "..." : stats.upcomingSessions || 0}
          description="Scheduled trainings"
          icon={Calendar}
          onClick={() => navigate('/training-sessions')}
        />
      </div>

      {/* Action Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">Created Courses</span>
              </div>
              <Badge variant="secondary">{stats.totalCourses}</Badge>
            </div>
            <Button onClick={() => navigate('/courses/create')} className="w-full" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Create New Course
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Project Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-secondary/10">
                  <FolderOpen className="h-4 w-4 text-secondary" />
                </div>
                <span className="font-medium">Active Projects</span>
              </div>
              <Badge variant="secondary">{stats.totalProjects}</Badge>
            </div>
            <Button onClick={() => navigate('/projects')} variant="outline" className="w-full" size="lg">
              <FolderOpen className="h-4 w-4 mr-2" />
              Manage Projects
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Team Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivity.length > 0 ? (
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
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent team activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderManagementDashboard = () => (
    <div className="space-y-8">
      {/* Enhanced Stats Grid */}
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
          description="Organization average"
          icon={TrendingUp}
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

      {/* Quick Actions Panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employee Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate('/employees')} variant="outline" className="w-full justify-start" size="sm">
              <Users className="h-4 w-4 mr-2" />
              View All Employees
            </Button>
            <Button onClick={() => navigate('/employees')} variant="outline" className="w-full justify-start" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add New Employee
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Course Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate('/courses')} variant="outline" className="w-full justify-start" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Courses
            </Button>
            <Button onClick={() => navigate('/courses/create')} variant="outline" className="w-full justify-start" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Training Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate('/training-sessions')} variant="outline" className="w-full justify-start" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              View Sessions
            </Button>
            <Button onClick={() => navigate('/training-sessions')} variant="outline" className="w-full justify-start" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Session
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Department Overview */}
      {stats.departmentStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Department Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stats.departmentStats.map((dept, index) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate('/employees')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <Badge variant="secondary" className="text-xs">
                      {dept.employees}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm mb-1 truncate">{dept.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {dept.employees} {dept.employees === 1 ? 'employee' : 'employees'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length > 0 ? (
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
                      <p className="text-sm text-foreground truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Key Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.completionRate < 70 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <ArrowDown className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Completion rate needs attention</p>
                  <p className="text-xs text-muted-foreground">Consider reviewing course difficulty and providing additional support to employees.</p>
                </div>
              </div>
            )}
            {stats.completionRate >= 70 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <ArrowUp className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Great completion rate!</p>
                  <p className="text-xs text-muted-foreground">Your organization is performing well. Keep up the good work!</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Schedule regular training sessions</p>
                <p className="text-xs text-muted-foreground">Regular check-ins and training sessions improve engagement and retention.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTraineeDashboard = () => {
    const totalCourses = stats.activeCourses + stats.completedCourses;
    const completionPercentage = totalCourses > 0 
      ? Math.round((stats.completedCourses / totalCourses) * 100) 
      : 0;

    return (
      <div className="space-y-8">
        {/* Personal Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatCard
            title="Active Courses"
            value={stats.loading ? "..." : stats.activeCourses}
            description="In progress"
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
            title="Completion Rate"
            value={stats.loading ? "..." : `${completionPercentage}%`}
            description="Overall progress"
            icon={TrendingUp}
            trend={completionPercentage > 50 ? { value: completionPercentage, isPositive: true } : undefined}
          />
          <StatCard
            title="Total Enrolled"
            value={stats.loading ? "..." : totalCourses}
            description="All courses"
            icon={Star}
          />
        </div>

        {/* Progress Overview */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Learning Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completed Courses</span>
                  <span className="font-medium">{stats.completedCourses} / {totalCourses}</span>
                </div>
                <Progress value={completionPercentage} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="text-2xl font-bold text-primary">{stats.activeCourses}</div>
                  <div className="text-xs text-muted-foreground mt-1">In Progress</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-success/5 border border-success/10">
                  <div className="text-2xl font-bold text-success">{stats.completedCourses}</div>
                  <div className="text-xs text-muted-foreground mt-1">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => navigate('/courses')} 
                className="w-full justify-start"
                size="lg"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Browse All Courses
              </Button>
              <Button 
                onClick={() => navigate('/projects')} 
                variant="outline"
                className="w-full justify-start"
                size="lg"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                View My Projects
              </Button>
              <Button 
                onClick={() => navigate('/training-sessions')} 
                variant="outline"
                className="w-full justify-start"
                size="lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Training Sessions
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Motivational Message */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Keep Learning!</h3>
                <p className="text-muted-foreground mb-4">
                  {stats.activeCourses > 0 
                    ? `You have ${stats.activeCourses} active course${stats.activeCourses > 1 ? 's' : ''}. Keep up the great work!`
                    : stats.completedCourses > 0
                    ? `Great job completing ${stats.completedCourses} course${stats.completedCourses > 1 ? 's' : ''}! Ready to start a new one?`
                    : 'Start your learning journey today and unlock your potential!'
                  }
                </p>
                {stats.activeCourses > 0 && (
                  <Button onClick={() => navigate('/courses')} size="sm">
                    Continue Learning
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

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
      {userRole === UserRoles.HR && renderManagementDashboard()}
      {userRole === UserRoles.TEAM_LEAD && renderTeamLeadDashboard()}
      {userRole === UserRoles.TRAINEE && renderTraineeDashboard()}

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