import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface CourseEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  onSuccess: () => void;
}

interface Course {
  id: string;
  course_name: string;
  course_description: string | null;
}

export function CourseEnrollmentDialog({ open, onOpenChange, employeeId, onSuccess }: CourseEnrollmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([]);

  const fetchEnrolledCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('employee_id', employeeId);

      if (error) throw error;
      setEnrolledCourses(data?.map(e => e.course_id) || []);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCourses();
      fetchEnrolledCourses();
    }
  }, [open, employeeId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name, course_description')
        .order('course_name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };


  const handleEnroll = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    // Check if employee is already enrolled in this course
    if (enrolledCourses.includes(selectedCourse)) {
      toast.error('This employee is already assigned to this course.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          employee_id: employeeId,
          course_id: selectedCourse,
          status: 'enrolled'
        });

      if (error) throw error;

      toast.success('Employee enrolled successfully');
      onSuccess();
      setSelectedCourse('');
    } catch (error) {
      console.error('Error enrolling employee:', error);
      toast.error('Failed to enroll employee');
    } finally {
      setLoading(false);
    }
  };

  const availableCourses = courses.filter(course => !enrolledCourses.includes(course.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll in Course</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="course">Select Course *</Label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.length > 0 ? (
                  availableCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-courses" disabled>
                    No available courses
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {availableCourses.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Employee is already enrolled in all available courses
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEnroll} 
              disabled={loading || !selectedCourse || availableCourses.length === 0}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Enroll
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}