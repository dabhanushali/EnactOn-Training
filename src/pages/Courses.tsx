import { useState, useEffect, useCallback } from 'react';
import { MainNav } from '@/components/navigation/MainNav';
import { CourseCard } from '@/components/courses/CourseCard';
import { EnhancedCourseCard } from '@/components/courses/EnhancedCourseCard';
import { CourseFiltersComponent, type CourseFilters } from '@/components/courses/CourseFilters';
import { CourseQuickActions } from '@/components/courses/CourseQuickActions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Grid3X3, List, Filter, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Course {
    id: string;
    course_name: string;
    course_description: string;
    course_type: string;
    target_role?: string;
    difficulty_level: string;
    is_mandatory: boolean;
    estimated_duration?: string;
    learning_objectives?: string[];
    skills_gained?: string[];
    instructor_id?: string;
    created_at: string;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [useEnhancedCards, setUseEnhancedCards] = useState(false); // Default to false
  const [filters, setFilters] = useState<CourseFilters>({
    courseType: 'all',
    targetRole: 'all',
    isMandatory: 'all',
    difficultyLevel: 'all'
  });
  const [enrollments, setEnrollments] = useState(new Map());
  const [moduleCount, setModuleCount] = useState(new Map());
  const [instructors, setInstructors] = useState(new Map());
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      let coursesData: Course[] | null = [];

      if (profile?.role?.role_name === 'Trainee') {
        // For trainees, show enrolled courses and optional courses
        const { data: enrolledCourseIds, error: enrolledError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('employee_id', profile.id);

        if (enrolledError) throw enrolledError;

        const enrolledCourseIdsList = enrolledCourseIds?.map(e => e.course_id) || [];

        const { data: optionalCourses, error: optionalError } = await supabase
          .from('courses')
          .select('*')
          .eq('is_mandatory', false);

        if (optionalError) throw optionalError;

        const { data: enrolledCoursesData, error: enrolledCoursesError } = await supabase
            .from('courses')
            .select('*')
            .in('id', enrolledCourseIdsList);

        if (enrolledCoursesError) throw enrolledCoursesError;
        
        const allCourses = [...(enrolledCoursesData || []), ...(optionalCourses || [])];
        const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values());
        coursesData = uniqueCourses;

      } else {
        // For admins/instructors, show all courses
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        coursesData = data;
      }

      // Fetch enrollments for the current user
      if (profile?.id) {
        const { data: enrollmentsData } = await supabase
          .from('course_enrollments')
          .select('course_id, status')
          .eq('employee_id', profile.id);

        const enrollmentMap = new Map();
        enrollmentsData?.forEach(enrollment => {
          enrollmentMap.set(enrollment.course_id, enrollment.status);
        });
        setEnrollments(enrollmentMap);
      }

      // Fetch module counts for each course
      const courseIds = coursesData?.map(c => c.id) || [];
      if (courseIds.length > 0) {
        const { data: modulesData } = await supabase
          .from('course_modules')
          .select('course_id')
          .in('course_id', courseIds);

        const moduleCountMap = new Map();
        modulesData?.forEach(module => {
          const count = moduleCountMap.get(module.course_id) || 0;
          moduleCountMap.set(module.course_id, count + 1);
        });
        setModuleCount(moduleCountMap);
      }

      // Fetch instructors
      const instructorIds = coursesData?.map(c => c.instructor_id).filter(Boolean) || [];
      if (instructorIds.length > 0) {
        const { data: instructorsData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', instructorIds);

        const instructorsMap = new Map();
        instructorsData?.forEach(instructor => {
          instructorsMap.set(instructor.id, {
            name: instructor.full_name || 'Unknown',
            avatar: instructor.avatar_url
          });
        });
        setInstructors(instructorsMap);
      }

      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCourses();
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          employee_id: profile?.id,
          course_id: courseId,
          status: 'enrolled'
        });

      if (error) throw error;

      setEnrollments(prev => new Map(prev).set(courseId, 'enrolled'));
      toast.success("Successfully enrolled in course");
    } catch (error) {
      console.error('Error enrolling in course:', error);
      toast.error("Failed to enroll in course");
    }
  };

  const handleViewDetails = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  const handleEditCourse = (courseId: string) => {
    navigate(`/courses/${courseId}/edit`);
  };

  const openDeleteDialog = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        setCourseToDelete(course);
        setDeleteDialogOpen(true);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    const { error } = await supabase.from('courses').delete().eq('id', courseToDelete.id);

    if (error) {
        toast.error(`Failed to delete course: ${error.message}`);
    } else {
        toast.success(`Course "${courseToDelete.course_name}" deleted.`);
        fetchCourses();
    }
    setDeleteDialogOpen(false);
    setCourseToDelete(null);
  };

  const applyFilters = (courses: Course[]) => {
    return courses.filter(course => {
      const matchesSearch = course.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           course.course_description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCourseType = filters.courseType === 'all' || course.course_type === filters.courseType;
      const matchesTargetRole = filters.targetRole === 'all' || course.target_role === filters.targetRole;
      const matchesMandatory = filters.isMandatory === 'all' || 
                              (filters.isMandatory === 'true' && course.is_mandatory) ||
                              (filters.isMandatory === 'false' && !course.is_mandatory);
      const matchesDifficulty = filters.difficultyLevel === 'all' || course.difficulty_level === filters.difficultyLevel;
      
      return matchesSearch && matchesCourseType && matchesTargetRole && matchesMandatory && matchesDifficulty;
    });
  };

  const filteredCourses = applyFilters(courses);

  const resetFilters = () => {
    setFilters({
      courseType: 'all',
      targetRole: 'all',
      isMandatory: 'all',
      difficultyLevel: 'all'
    });
    setSearchTerm('');
  };

  const canManageCourses = profile?.role?.role_name === 'Team Lead' || 
                          profile?.role?.role_name === 'HR' ||
                          profile?.role?.role_name === 'Management';

  // Calculate statistics
  const stats = {
    total: courses.length,
    enrolled: Array.from(enrollments.values()).filter(s => s === 'enrolled').length,
    completed: Array.from(enrollments.values()).filter(s => s === 'completed').length,
    mandatory: courses.filter(c => c.is_mandatory).length
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-3">Learning Hub</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Discover, enroll, and excel in training courses designed to enhance your skills and advance your career.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {canManageCourses && (
                <Button onClick={() => navigate('/courses/create')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          <CourseQuickActions
            totalCourses={stats.total}
            activeCourses={stats.enrolled}
            completedCourses={stats.completed}
            userRole={profile?.role?.role_name || 'Trainee'}
          />
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 border-0 shadow-lg bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search courses by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Enhanced Cards Toggle */}
              <Button
                variant={useEnhancedCards ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseEnhancedCards(!useEnhancedCards)}
              >
                ✨ Enhanced
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        <CourseFiltersComponent 
          filters={filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />

        {/* Course Grid/List */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            : "space-y-4"
          }>
            {filteredCourses.map((course) => {
              const CourseCardComponent = useEnhancedCards ? EnhancedCourseCard : CourseCard;
              const isNewCourse = new Date(course.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              
              return (
                <CourseCardComponent
                  key={course.id}
                  id={course.id}
                  title={course.course_name}
                  description={course.course_description}
                  type={course.course_type || 'Training'}
                  difficulty={course.difficulty_level}
                  duration={course.estimated_duration}
                  moduleCount={moduleCount.get(course.id) || 0}
                  estimatedTime={course.estimated_duration}
                  isMandatory={course.is_mandatory}
                  isEnrolled={enrollments.has(course.id)}
                  isAdmin={canManageCourses}
                  isNew={isNewCourse}
                  skillTags={course.skills_gained || []}
                  instructor={instructors.get(course.instructor_id)}
                  userRole={profile?.role?.role_name || 'Trainee'}
                  enrolledCount={Math.floor(Math.random() * 50) + 10} // Mock data
                  rating={4.2 + Math.random() * 0.8} // Mock data
                  progress={enrollments.has(course.id) ? Math.floor(Math.random() * 100) : undefined}
                  onEnroll={handleEnroll}
                  onViewDetails={handleViewDetails}
                  onEdit={canManageCourses ? handleEditCourse : undefined}
                  onDelete={canManageCourses ? openDeleteDialog : undefined}
                />
              );
            })}
          </div>
        )}

        {/* No Results */}
        {!loading && filteredCourses.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <Search className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {searchTerm || Object.values(filters).some(f => f !== 'all') 
                  ? 'No courses found' 
                  : 'No courses available'
                }
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchTerm || Object.values(filters).some(f => f !== 'all')
                  ? 'Try adjusting your search terms or filters to find relevant courses.'
                  : profile?.role?.role_name === 'Trainee'
                  ? "No courses have been assigned to you yet, and no optional courses are available."
                  : "Get started by creating your first course for your team."
                }
              </p>
              {(searchTerm || Object.values(filters).some(f => f !== 'all')) && (
                <Button onClick={resetFilters} variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
              {canManageCourses && !searchTerm && !Object.values(filters).some(f => f !== 'all') && (
                <Button onClick={() => navigate('/courses/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Course
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              <strong> {courseToDelete?.course_name}</strong> and all of its associated data including modules, enrollments, and progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCourse} className="bg-red-600 hover:bg-red-700">
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}