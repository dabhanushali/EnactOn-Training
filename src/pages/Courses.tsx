import { useState, useEffect, useCallback } from 'react';
import { MainNav } from '@/components/navigation/MainNav';
import { CourseCard } from '@/components/courses/CourseCard';
import { CourseFiltersComponent, type CourseFilters } from '@/components/courses/CourseFilters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

interface Course {
    id: string;
    course_name: string;
    course_description: string;
    course_type: string;
    target_role?: string;
    difficulty_level: string;
    is_mandatory: boolean;
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

      if (profile?.role?.role_name === 'Trainee') {
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
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        coursesData = data;
      }


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

      setCourses(coursesData || []);
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
  };

  const canManageCourses = profile?.role?.role_name === 'Team Lead' || 
                          profile?.role?.role_name === 'HR' ||
                          profile?.role?.role_name === 'Management';

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
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
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Enhanced Filters */}
        <CourseFiltersComponent 
          filters={filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />

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
                isMandatory={course.is_mandatory}
                isEnrolled={enrollments.has(course.id)}
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
              {profile?.role?.role_name === 'Trainee'
                ? "No courses assigned to you yet, and no optional courses are available."
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