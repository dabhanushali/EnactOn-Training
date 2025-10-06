import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CourseModule } from '@/components/courses/CourseModule';
import { CourseEnrollment } from '@/components/courses/CourseEnrollment';
import { CourseAssessment } from '@/components/courses/CourseAssessment';
import { ArrowLeft, Clock, Users, BookOpen, Award, Edit, UserPlus, Settings, CheckCircle, Target, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { useToast } from '@/hooks/use-toast';
import { CourseAssignmentDialog } from '@/components/courses/CourseAssignmentDialog';

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [assessmentTemplates, setAssessmentTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const fetchCourseData = useCallback(async () => {
    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Fetch modules
      const { data: modulesData } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('module_order');

      // Fetch enrollment status
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('employee_id', profile?.id);

      if (enrollmentError) throw enrollmentError;

      console.log('enrollmentData', enrollmentData);

      const enrollment = enrollmentData?.[0] || null;

      setEnrollment(enrollment);

      // Fetch assessments (user's assessment results)
      const { data: assessmentsData } = await supabase
        .from('course_assessments')
        .select('*')
        .eq('course_id', courseId)
        .eq('employee_id', profile?.id);

      // Fetch assessment templates (available assessments for the course)
      const { data: templateData } = await supabase
        .from('assessment_templates')
        .select('*')
        .eq('course_id', courseId);

      setCourse(courseData);
      setModules(modulesData || []);
      setEnrollment(enrollmentData);
      setAssessments(assessmentsData || []);
      setAssessmentTemplates(templateData || []);
      setIsCompleted(enrollmentData?.[0]?.status === 'completed');

    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "Failed to load course details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, profile?.id, toast]);

  useEffect(() => {
    if (courseId && profile?.id) {
      fetchCourseData();
    }
  }, [courseId, profile?.id, fetchCourseData]);

  const handleEnroll = async () => {
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          employee_id: profile?.id,
          course_id: courseId,
          status: 'enrolled'
        });

      if (error) throw error;

      await fetchCourseData();
      toast({
        title: "Success",
        description: "Successfully enrolled in course"
      });
    } catch (error) {
      console.error('Error enrolling:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in course",
        variant: "destructive"
      });
    }
  };

  const handleMarkCourseComplete = async () => {
    if (!user || !courseId) return;

    try {
      const { error } = await supabase
        .from('course_enrollments')
        .update({ status: 'completed', completion_date: new Date().toISOString() })
        .eq('employee_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;

      setIsCompleted(true);
      toast({ title: "Success", description: "Course marked as complete." });

    } catch (error) {
      console.error('Error marking course as complete:', error);
      toast({ title: "Error", description: "Failed to mark course as complete.", variant: "destructive" });
    }
  };

  const handleStartModule = (moduleId: string) => {
    navigate(`/courses/${courseId}/modules/${moduleId}`);
  };

  const handleViewContent = (moduleId: string) => {
    navigate(`/courses/${courseId}/modules/${moduleId}`);
  };

  const handleTakeAssessment = (assessmentId: string) => {
    const template = assessmentTemplates.find(t => t.id === assessmentId);
    if (!template) return;

    if (template.assessment_type === 'quiz') {
      navigate(`/courses/${courseId}/assessments/${template.id}`);
    } else {
      toast({
        title: "Coming Soon!",
        description: `The '${template.assessment_type}' assessment type is not yet implemented.`,
        variant: "default",
      });
    }
  };

  const handleMarkAsComplete = async (assessmentId: string) => {
    try {
      const { error } = await supabase
        .from('course_assessments')
        .update({ status: 'Completed', completion_date: new Date().toISOString() })
        .eq('assessment_template_id', assessmentId)
        .eq('employee_id', profile?.id);

      if (error) throw error;

      await fetchCourseData();
      toast({
        title: "Success",
        description: "Assessment marked as complete."
      });
    } catch (error) {
      console.error('Error marking as complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark assessment as complete.",
        variant: "destructive"
      });
    }
  };

  // Check if user can manage courses
  const canManageCourses = profile?.role?.role_name === 'Team Lead' || 
                          profile?.role?.role_name === 'HR' ||
                          profile?.role?.role_name === 'Management';

  // Check if user is a trainee
  const isTrainee = profile?.role?.role_name === 'Trainee';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Course not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <MainNav />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        {/* Course Header */}
        <Card className="mb-8 shadow-lg bg-gradient-to-r from-primary to-primary/90 text-primary-foreground animate-fade-in">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{course.course_name}</CardTitle>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={course.is_mandatory ? 'destructive' : 'secondary'}>
                    {course.is_mandatory ? 'Mandatory' : 'Optional'}
                  </Badge>
                  <Badge variant="secondary">{course.difficulty_level}</Badge>
                  {course.course_type && (
                    <Badge variant="secondary">{course.course_type}</Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Only show trainee-specific actions for trainees */}
                {enrollment && isTrainee && (
                  <Button onClick={handleMarkCourseComplete} disabled={isCompleted} variant="secondary">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isCompleted ? 'Completed' : 'Mark as Complete'}
                  </Button>
                )}
                {/* Management actions for admins */}
                {canManageCourses && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/courses/${courseId}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Course
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAssignmentDialog(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign to Employees
                    </Button>
                  </>
                )}
                <BookOpen className="h-8 w-8 text-secondary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-background text-foreground">
            <p className="text-muted-foreground mb-6">{course.course_description}</p>
            
            {course.learning_objectives && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 flex items-center"><Target className="w-5 h-5 mr-2 text-primary"/>Learning Objectives</h3>
                <p className="text-sm text-muted-foreground">{course.learning_objectives}</p>
              </div>
            )}

            {/* Show different actions based on role */}
            {!enrollment && isTrainee ? (
              <Button onClick={handleEnroll} size="lg">
                Enroll in Course
              </Button>
            ) : !enrollment && canManageCourses ? (
              <Button 
                onClick={() => setShowAssignmentDialog(true)} 
                size="lg"
                variant="default"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to Employees
              </Button>
            ) : enrollment && isTrainee && (
              <div className="space-y-4">
                  <CourseEnrollment
                    course={course}
                    completedAssessments={assessments.filter(a => a.status === 'completed').length}
                    totalAssessments={assessments.length}
                    isCompleted={enrollment[0]?.status === 'completed'}
                    isEnrolled={true}
                    onViewModules={() => {}} // Scroll to modules section
                    onTakeAssessment={() => {}} // Handle assessment
                    onMarkComplete={handleMarkCourseComplete}
                  />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Show course content for trainees or enrolled admins */}
        {enrollment && isTrainee ? (
          <>
            {/* Modules Section */}
            <Card className="mb-8 bg-muted/20 border-l-4 border-primary transition-all hover:shadow-md animate-fade-in-delay-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Course Modules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-primary/50" />
                    <p className="font-semibold">No modules yet</p>
                    <p className="text-sm">Modules for this course will appear here.</p>
                  </div>
                ) : (
                  modules.map((module) => (
                    <CourseModule
                      key={module.id}
                      id={module.id}
                      name={module.module_name}
                      description={module.module_description}
                      order={module.module_order}
                      contentType={module.content_type}
                      contentUrl={module.content_url}
                      contentPath={module.content_path}
                      estimatedDuration={module.estimated_duration_minutes}
                      onStartModule={isTrainee ? handleStartModule : handleViewContent}
                      onViewContent={handleViewContent}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Assessments Section */}
            <Card className="bg-muted/20 border-l-4 border-primary transition-all hover:shadow-md animate-fade-in-delay-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Assessments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  {assessmentTemplates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Award className="w-12 h-12 mx-auto mb-4 text-primary/50" />
                      <p className="font-semibold">No assessments yet</p>
                      <p className="text-sm">Assessments for this course will appear here.</p>
                    </div>
                  ) : (
                    assessmentTemplates.map((template) => {
                      // Find user's assessment result for this template
                      const userAssessment = assessments.find(a => a.assessment_template_id === template.id);
                      
                      return (
                        <CourseAssessment
                          key={template.id}
                          id={template.id}
                          courseId={courseId!}
                          employeeId={profile?.id}
                          assessmentType={template.assessment_type}
                          status={userAssessment?.status}
                          totalScore={userAssessment?.total_score}
                          percentage={userAssessment?.percentage}
                          passingScore={template.passing_score}
                          isMandatory={template.is_mandatory}
                          grade={userAssessment?.grade}
                          feedback={userAssessment?.feedback}
                          certificateUrl={userAssessment?.certificate_url}
                          completionDate={userAssessment?.completion_date}
                          title={template.title}
                          description={template.description}
                          instructions={template.instructions}
                          timeLimit={template.time_limit_minutes}
                          onRetakeAssessment={isTrainee ? handleTakeAssessment : undefined}
                          onMarkAsComplete={isTrainee ? handleMarkAsComplete : undefined}
                        />
                      );
                    })
                  )}
              </CardContent>
            </Card>
          </>
        ) : canManageCourses && (
          /* Management Overview */
          <Card className="bg-muted/20">
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Settings className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Course Management</h3>
                  <p className="text-muted-foreground mb-6">
                    This course is configured and ready for employee assignments.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                  <div className="text-center p-4 rounded-lg bg-background border">
                    <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h4 className="font-medium mb-1">Modules</h4>
                    <p className="text-sm text-muted-foreground">{modules.length} available</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background border">
                    <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h4 className="font-medium mb-1">Assessments</h4>
                    <p className="text-sm text-muted-foreground">{assessmentTemplates.length} configured</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-background border">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <h4 className="font-medium mb-1">Access</h4>
                    <p className="text-sm text-muted-foreground">Ready for assignment</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assignment Dialog */}
        <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Course to Employees</DialogTitle>
            </DialogHeader>
            {course && (
              <CourseAssignmentDialog
                courseId={course.id}
                courseName={course.course_name}
                onClose={() => setShowAssignmentDialog(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}