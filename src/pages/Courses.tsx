import { useState, useEffect, useCallback } from 'react';
import { MainNav } from '@/components/navigation/MainNav';
import { CourseCard } from '@/components/courses/CourseCard';
import { type CourseFilters } from '@/components/courses/CourseFilters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
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
import { DEPARTMENTS } from '@/lib/masterData';

interface Course {
    id: string;
    course_name: string;
    course_description: string;
    course_type: string;
    target_role?: string;
    difficulty_level: string;
    is_mandatory: boolean;
    enrolledCount?: number;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CourseFilters>({
    courseType: 'all',
    targetRole: 'all',
    isMandatory: 'all',
    difficultyLevel: 'all'
  });
  const [enrollments, setEnrollments] = useState(new Map());
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      let coursesData: Course[] | null = [];

      if (profile?.role?.role_name === 'Intern') {
        // For trainees, only show courses they are enrolled in
        const { data: enrolledCourseIds, error: enrolledError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('employee_id', profile.id);

        if (enrolledError) throw enrolledError;

        const enrolledCourseIdsList = enrolledCourseIds?.map(e => e.course_id) || [];

        if (enrolledCourseIdsList.length > 0) {
          const { data: enrolledCoursesData, error: enrolledCoursesError } = await supabase
            .from('courses')
            .select('*')
            .in('id', enrolledCourseIdsList);

          if (enrolledCoursesError) throw enrolledCoursesError;
          coursesData = enrolledCoursesData;
        } else {
          coursesData = [];
        }

      } else if (profile?.role?.role_name === 'Team Lead') {
        // For Team Leads, show courses relevant to their department OR created by them
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .or(`target_role.eq.${profile.department},target_role.is.null,created_by.eq.${profile.id}`)
          .order('created_at', { ascending: false });
        if (error) throw error;
        coursesData = data;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        coursesData = data;
      }

      // Fetch enrollment counts for all courses
      const courseIds = coursesData?.map(c => c.id) || [];
      const { data: enrollmentCounts, error: countError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .in('course_id', courseIds);

      if (countError) {
        console.error('Error fetching enrollment counts:', countError);
      }

      // Count enrollments per course
      const enrollmentCountMap = new Map<string, number>();
      enrollmentCounts?.forEach(enrollment => {
        const currentCount = enrollmentCountMap.get(enrollment.course_id) || 0;
        enrollmentCountMap.set(enrollment.course_id, currentCount + 1);
      });

      // Add enrollment counts to courses
      const coursesWithCounts = coursesData?.map(course => ({
        ...course,
        enrolledCount: enrollmentCountMap.get(course.id) || 0
      })) || [];

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

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

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

  const openDeleteDialog = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        setCourseToDelete(course);
        setDeleteDialogOpen(true);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    const { data, error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseToDelete.id)
      .select();

    if (error) {
        toast.error(`Failed to delete course: ${error.message}`);
    } else if (!data || data.length === 0) {
        toast.error("Unable to delete course. You may not have permission.");
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
  };

  const canManageCourses = profile?.role?.role_name === 'Team Lead' || profile?.role?.role_name === 'Human Resources' || profile?.role?.role_name === 'Management';

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Courses</h1>
              <p className="text-muted-foreground">
                Discover and enroll in training courses to enhance your skills.
              </p>
            </div>
            {canManageCourses && (
              <Button onClick={() => navigate('/courses/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            )}
          </div>
          
        </div>

        {/* Search & Filter Section */}
        <Card className="mb-8 border-0 shadow-md bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50"
                />
              </div>

              <Select value={filters.courseType} onValueChange={(value) => setFilters({...filters, courseType: value})}>
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {['Technical', 'Soft skills', 'Informative', 'AI'].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.targetRole} onValueChange={(value) => setFilters({...filters, targetRole: value})}>
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {DEPARTMENTS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.isMandatory} onValueChange={(value) => setFilters({...filters, isMandatory: value})}>
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="true">Mandatory Only</SelectItem>
                  <SelectItem value="false">Optional Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.difficultyLevel} onValueChange={(value) => setFilters({...filters, difficultyLevel: value})}>
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  resetFilters();
                }}
                className="bg-white/50"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                title={course.course_name}
                description={course.course_description}
                type={course.course_type || 'Training'}
                difficulty={course.difficulty_level}
                enrolledCount={course.enrolledCount || 0}
                isMandatory={course.is_mandatory}
                isEnrolled={enrollments.has(course.id)}
                isCompleted={enrollments.get(course.id) === 'completed'}
                isAdmin={canManageCourses}
                onEnroll={handleEnroll}
                onViewDetails={handleViewDetails}
                onDelete={openDeleteDialog}
              />
            ))}
          </div>
        )}

        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {profile?.role?.role_name === 'Intern'
                ? "No courses have been assigned to you yet."
                : "No courses found matching your search."}
            </p>
          </div>
        )}
      </main>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              <strong> {courseToDelete?.course_name}</strong> and all of its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCourse}>Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
