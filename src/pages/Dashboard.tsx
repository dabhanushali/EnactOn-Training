import { useState, useEffect } from 'react';
import { MainNav } from '@/components/navigation/MainNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  Target,
  Calendar,
  ArrowRight,
  Play,
  GraduationCap,
  Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/auth-utils';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface DashboardStats {
  totalCourses: number;
  enrolledCourses: number;
  completedCourses: number;
  totalEmployees: number;
  recentActivity: any[];
}

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    enrolledCourses: 0,
    completedCourses: 0,
    totalEmployees: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  const isTrainee = profile?.role?.role_name === 'Trainee';
  const isAdmin = profile?.role?.role_name === 'HR' || 
                  profile?.role?.role_name === 'Management' || 
                  profile?.role?.role_name === 'Team Lead';

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch total courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id');

      if (coursesError) throw coursesError;

      // Fetch total employees
      const { data: employees, error: employeesError } = await supabase
        .from('profiles')
        .select('id');

      if (employeesError) throw employeesError;

      if (isTrainee && profile?.id) {
        // Fetch user's enrollments
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select('*, courses(course_name)')
          .eq('employee_id', profile.id);

        if (enrollmentError) throw enrollmentError;

        const enrolledCount = enrollments?.length || 0;
        const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0;
        
        setStats({
          totalCourses: courses?.length || 0,
          enrolledCourses: enrolledCount,
          completedCourses: completedCount,
          totalEmployees: employees?.length || 0,
          recentActivity: enrollments?.slice(0, 5) || []
        });
      } else {
        // Fetch all enrollments for admin view
        const { data: allEnrollments, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select('*, courses(course_name), profiles(full_name)');

        if (enrollmentError) throw enrollmentError;

        const totalEnrollments = allEnrollments?.length || 0;
        const completedEnrollments = allEnrollments?.filter(e => e.status === 'completed').length || 0;
        
        setStats({
          totalCourses: courses?.length || 0,
          enrolledCourses: totalEnrollments,
          completedCourses: completedEnrollments,
          totalEmployees: employees?.length || 0,
          recentActivity: allEnrollments?.slice(0, 5) || []
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            {isTrainee 
              ? "Ready to continue your learning journey?"
              : "Here's an overview of your team's learning progress."
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-muted-foreground">
                Available courses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isTrainee ? 'Enrolled' : 'Total Enrollments'}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.enrolledCourses}</div>
              <p className="text-xs text-muted-foreground">
                {isTrainee ? 'Your enrollments' : 'All enrollments'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedCourses}</div>
              <p className="text-xs text-muted-foreground">
                {isTrainee ? 'Your completions' : 'Total completions'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                Total employees
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                {isTrainee ? 'Your recent course activity' : 'Recent course enrollments'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="font-medium text-sm">
                        {isTrainee ? activity.courses?.course_name : activity.profiles?.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isTrainee ? 'Course enrolled' : activity.courses?.course_name}
                      </p>
                    </div>
                    <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                      {activity.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                {isTrainee ? 'Continue your learning' : 'Manage courses and employees'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isTrainee ? (
                <>
                  <Button 
                    onClick={() => navigate('/courses')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <BookOpen className="h-4 w-4 mr-3" />
                    Browse Courses
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/courses')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <Play className="h-4 w-4 mr-3" />
                    Continue Learning
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/training-sessions')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <Calendar className="h-4 w-4 mr-3" />
                    Training Sessions
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => navigate('/courses/create')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-3" />
                    Create Course
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/employees')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <Users className="h-4 w-4 mr-3" />
                    Manage Employees
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/courses')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <BookOpen className="h-4 w-4 mr-3" />
                    All Courses
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* No Data State */}
        {stats.totalCourses === 0 && (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {isTrainee ? 'No Courses Available' : 'No Courses Created'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {isTrainee 
                  ? 'There are no courses available at the moment.'
                  : 'Get started by creating your first course.'
                }
              </p>
              {isAdmin && (
                <Button onClick={() => navigate('/courses/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Course
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}