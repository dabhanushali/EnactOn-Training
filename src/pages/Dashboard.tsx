import { useState, useEffect } from 'react';
import { MainNav } from '@/components/navigation/MainNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Users, 
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target,
  Calendar,
  ArrowRight,
  Play,
  GraduationCap
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
  recentEnrollments: any[];
  upcomingAssessments: any[];
}

interface CourseProgress {
  id: string;
  course_name: string;
  progress: number;
  status: string;
  due_date?: string;
}

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCourses: 0,
    enrolledCourses: 0,
    completedCourses: 0,
    totalEmployees: 0,
    recentEnrollments: [],
    upcomingAssessments: []
  });
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
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
      
      if (isTrainee) {
        await fetchTraineeDashboard();
      } else if (isAdmin) {
        await fetchAdminDashboard();
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTraineeDashboard = async () => {
    // Fetch user's enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        courses (id, course_name, course_description, difficulty_level)
      `)
      .eq('employee_id', profile?.id);

    if (enrollmentError) throw enrollmentError;

    // Fetch all available courses
    const { data: allCourses, error: coursesError } = await supabase
      .from('courses')
      .select('*');

    if (coursesError) throw coursesError;

    const enrolledCount = enrollments?.length || 0;
    const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0;
    
    // Create course progress data
    const progressData: CourseProgress[] = enrollments?.map(enrollment => ({
      id: enrollment.course_id,
      course_name: enrollment.courses.course_name,
      progress: enrollment.status === 'completed' ? 100 : Math.floor(Math.random() * 80) + 10, // Mock progress
      status: enrollment.status,
      due_date: enrollment.due_date
    })) || [];

    setStats({
      totalCourses: allCourses?.length || 0,
      enrolledCourses: enrolledCount,
      completedCourses: completedCount,
      totalEmployees: 0,
      recentEnrollments: enrollments?.slice(0, 5) || [],
      upcomingAssessments: []
    });
    
    setCourseProgress(progressData);
  };

  const fetchAdminDashboard = async () => {
    // Fetch all courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*');

    if (coursesError) throw coursesError;

    // Fetch all enrollments
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        courses (course_name),
        profiles (full_name)
      `);

    if (enrollmentError) throw enrollmentError;

    // Fetch all employees
    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id, full_name, role_id');

    if (employeesError) throw employeesError;

    const totalEnrollments = enrollments?.length || 0;
    const completedEnrollments = enrollments?.filter(e => e.status === 'completed').length || 0;
    
    setStats({
      totalCourses: courses?.length || 0,
      enrolledCourses: totalEnrollments,
      completedCourses: completedEnrollments,
      totalEmployees: employees?.length || 0,
      recentEnrollments: enrollments?.slice(0, 5) || [],
      upcomingAssessments: []
    });
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
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-lg text-muted-foreground">
            {isTrainee 
              ? "Ready to continue your learning journey?"
              : "Here's what's happening with your team's learning progress."
            }
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
              <p className="text-xs text-blue-100">
                {isTrainee ? 'Available to you' : 'In the system'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isTrainee ? 'Enrolled' : 'Total Enrollments'}
              </CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.enrolledCourses}</div>
              <p className="text-xs text-green-100">
                {isTrainee ? 'Courses enrolled' : 'Across all employees'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Award className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedCourses}</div>
              <p className="text-xs text-purple-100">
                {isTrainee ? 'Courses completed' : 'Total completions'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isTrainee ? 'Progress' : 'Employees'}
              </CardTitle>
              {isTrainee ? <TrendingUp className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isTrainee 
                  ? `${stats.completedCourses > 0 ? Math.round((stats.completedCourses / stats.enrolledCourses) * 100) : 0}%`
                  : stats.totalEmployees
                }
              </div>
              <p className="text-xs text-amber-100">
                {isTrainee ? 'Completion rate' : 'Total employees'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Course Progress for Trainees */}
          {isTrainee && courseProgress.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-primary" />
                  Your Course Progress
                </CardTitle>
                <CardDescription>
                  Track your learning journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {courseProgress.map((course) => (
                  <div key={course.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{course.course_name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={course.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {course.status === 'completed' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> In Progress</>
                          )}
                        </Badge>
                        <span className="text-sm font-medium">{course.progress}%</span>
                      </div>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                  </div>
                ))}
                
                <Button 
                  onClick={() => navigate('/courses')} 
                  className="w-full mt-4"
                  variant="outline"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View All Courses
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions for Trainees */}
          {isTrainee && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Play className="h-5 w-5 mr-2 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Continue your learning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <GraduationCap className="h-4 w-4 mr-3" />
                  Continue Learning
                </Button>
                
                <Button 
                  onClick={() => navigate('/training-sessions')} 
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <Calendar className="h-4 w-4 mr-3" />
                  View Training Sessions
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity for Admins */}
          {isAdmin && stats.recentEnrollments.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Recent Enrollments
                </CardTitle>
                <CardDescription>
                  Latest course activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.recentEnrollments.slice(0, 5).map((enrollment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">
                        {enrollment.profiles?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment.courses?.course_name || 'Course'}
                      </p>
                    </div>
                    <Badge 
                      variant={enrollment.status === 'completed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {enrollment.status}
                    </Badge>
                  </div>
                ))}
                
                <Button 
                  onClick={() => navigate('/employees')} 
                  className="w-full mt-4"
                  variant="outline"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Employees
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Management Quick Actions */}
          {isAdmin && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-primary" />
                  Management Actions
                </CardTitle>
                <CardDescription>
                  Manage your team's learning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => navigate('/courses/create')} 
                  className="w-full justify-start" 
                  variant="outline"
                >
                  <BookOpen className="h-4 w-4 mr-3" />
                  Create New Course
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
                  <Award className="h-4 w-4 mr-3" />
                  View All Courses
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* No Data Message */}
        {isTrainee && courseProgress.length === 0 && (
          <Card className="border-0 shadow-lg mt-8">
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold mb-2">Start Your Learning Journey</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You haven't enrolled in any courses yet. Explore available courses and start learning today!
              </p>
              <Button onClick={() => navigate('/courses')} size="lg">
                <BookOpen className="h-5 w-5 mr-2" />
                Browse Courses
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}