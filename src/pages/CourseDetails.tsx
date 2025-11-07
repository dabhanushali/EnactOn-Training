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
import { CourseProgressTracker } from '@/components/courses/CourseProgressTracker';
import { ArrowLeft, Clock, Users, BookOpen, Award, Edit, UserPlus, Settings, CheckCircle, Target, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  const [moduleContentCounts, setModuleContentCounts] = useState({});
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

      // Fetch content counts for each module
      if (modulesData && modulesData.length > 0) {
        const counts = {};
        for (const module of modulesData) {
          const { count } = await supabase
            .from('module_contents')
            .select('*', { count: 'exact', head: true })
            .eq('module_id', module.id);
          counts[module.id] = count || 0;
        }
        setModuleContentCounts(counts);
      }

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
        <Card className="mb-8 shadow-lg border-none overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-4 flex-1">
                <div>
                  <CardTitle className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {course.course_name}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge 
                      variant={course.is_mandatory ? 'destructive' : 'secondary'}
                      className="text-xs px-3 py-1"
                    >
                      {course.is_mandatory ? 'Mandatory' : 'Optional'}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-3 py-1">{course.difficulty_level}</Badge>
                    {course.course_type && (
                      <Badge variant="outline" className="text-xs px-3 py-1">{course.course_type}</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {enrollment && isTrainee && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        disabled={isCompleted} 
                        size="lg"
                        className="gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {isCompleted ? 'Completed' : 'Mark Complete'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Marking this course as complete is final. You may not be able to take the assessments again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkCourseComplete}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {canManageCourses && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/courses/${courseId}/edit`)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowAssignmentDialog(true)}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">{course.course_description}</p>
            
            {course.learning_objectives && (
              <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 border">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-primary"/>
                  Learning Objectives
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{course.learning_objectives}</p>
              </div>
            )}
          </div>

          <CardContent className="pt-6">
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
                  <CourseProgressTracker
                    completedModules={modules.filter(m => m.completed).length}
                    totalModules={modules.length}
                    completedAssessments={assessments.filter(a => a.status === 'completed').length}
                    totalAssessments={assessmentTemplates.length}
                    averageScore={assessments.length > 0 ? assessments.reduce((acc, a) => acc + (a.percentage || 0), 0) / assessments.length : undefined}
                    status={enrollment[0]?.status === 'completed' ? 'completed' : 'in_progress'}
                    enrollmentDate={enrollment[0]?.enrolled_date}
                    completionDate={enrollment[0]?.completion_date}
                  />
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
            <Card className="mb-8 border-l-4 border-l-primary">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  Course Modules
                  <Badge variant="secondary" className="ml-2">{modules.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {modules.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 bg-muted/30 rounded-lg">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="font-semibold text-lg mb-1">No modules yet</p>
                    <p className="text-sm">Course modules will appear here once added.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {modules.map((module, index) => (
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
                        contentCount={moduleContentCounts[module.id] || 0}
                        onStartModule={isTrainee ? handleStartModule : handleViewContent}
                        onViewContent={handleViewContent}
                      />
                    ))}
                  </div>
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
                          isCourseCompleted={isCompleted}
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