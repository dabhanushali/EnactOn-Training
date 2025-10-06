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
        <Card className="mb-8 shadow-xl border-2 overflow-hidden">
          <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold mb-3">{course.course_name}</CardTitle>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge className={course.is_mandatory ? 'bg-error text-error-foreground' : 'bg-secondary text-secondary-foreground'}>
                    {course.is_mandatory ? 'MANDATORY' : 'OPTIONAL'}
                  </Badge>
                  <Badge className="bg-background/20 text-primary-foreground border-0">
                    {course.difficulty_level}
                  </Badge>
                  {course.course_type && (
                    <Badge className="bg-background/20 text-primary-foreground border-0">
                      {course.course_type}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {enrollment && isTrainee && (
                  <Button 
                    onClick={handleMarkCourseComplete} 
                    disabled={isCompleted}
                    className="bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {isCompleted ? 'Completed' : 'Complete'}
                  </Button>
                )}
                {canManageCourses && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/courses/${courseId}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAssignmentDialog(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <CardContent className="p-6">
            <p className="text-muted-foreground mb-6 text-base leading-relaxed">{course.course_description}</p>
            
            {course.learning_objectives && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                <h3 className="font-semibold mb-2 flex items-center text-foreground">
                  <Target className="w-5 h-5 mr-2 text-primary"/>
                  Learning Objectives
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{course.learning_objectives}</p>
              </div>
            )}

            {!enrollment && isTrainee ? (
              <Button onClick={handleEnroll} size="lg" className="w-full sm:w-auto">
                <BookOpen className="w-4 h-4 mr-2" />
                Enroll in Course
              </Button>
            ) : !enrollment && canManageCourses ? (
              <Button 
                onClick={() => setShowAssignmentDialog(true)} 
                size="lg"
                className="w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Assign to Employees
              </Button>
            ) : enrollment && isTrainee && (
              <CourseEnrollment
                course={course}
                completedAssessments={assessments.filter(a => a.status === 'completed').length}
                totalAssessments={assessments.length}
                isCompleted={enrollment[0]?.status === 'completed'}
                isEnrolled={true}
                onViewModules={() => {}}
                onTakeAssessment={() => {}}
                onMarkComplete={handleMarkCourseComplete}
              />
            )}
          </CardContent>
        </Card>

        {/* Show course content for trainees or enrolled admins */}
        {enrollment && isTrainee ? (
          <>
            {/* Modules Section */}
            <Card className="mb-8 border-2 hover:border-primary/50 transition-all">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center text-xl font-bold">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  Course Modules
                  {modules.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {modules.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {modules.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                    <p className="font-semibold text-lg">No modules yet</p>
                    <p className="text-sm">Modules for this course will appear here.</p>
                  </div>
                ) : (
                  modules.map((module, index) => (
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
            <Card className="border-2 hover:border-primary/50 transition-all">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center text-xl font-bold">
                  <Award className="h-5 w-5 mr-2 text-primary" />
                  Assessments
                  {assessmentTemplates.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {assessmentTemplates.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {assessmentTemplates.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <Award className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                    <p className="font-semibold text-lg">No assessments yet</p>
                    <p className="text-sm">Assessments for this course will appear here.</p>
                  </div>
                ) : (
                  assessmentTemplates.map((template) => {
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