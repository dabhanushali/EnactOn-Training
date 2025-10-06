import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CourseModule } from '@/components/courses/CourseModule';
import { CourseEnrollment } from '@/components/courses/CourseEnrollment';
import { CourseAssessment } from '@/components/courses/CourseAssessment';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  BookOpen, 
  Award, 
  Edit, 
  UserPlus, 
  Settings, 
  CheckCircle, 
  Target, 
  FileText,
  Play,
  Calendar,
  Star,
  GraduationCap,
  TrendingUp
} from 'lucide-react';
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
  const [instructor, setInstructor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [courseStats, setCourseStats] = useState({ progress: 0, completedModules: 0, totalModules: 0 });

  const fetchCourseData = useCallback(async () => {
    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Fetch instructor info if available
      if (courseData.instructor_id) {
        const { data: instructorData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .eq('id', courseData.instructor_id)
          .single();
        setInstructor(instructorData);
      }

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

      const enrollment = enrollmentData?.[0] || null;
      setEnrollment(enrollment);

      // Fetch assessments (user's assessment results)
      const { data: assessmentsData } = await supabase
        .from('course_assessments')
        .select('*')
        .eq('course_id', courseId)
        .eq('employee_id', profile?.id);

      // Fetch assessment templates
      const { data: templateData } = await supabase
        .from('assessment_templates')
        .select('*')
        .eq('course_id', courseId);

      // Calculate course progress for trainees
      let progressStats = { progress: 0, completedModules: 0, totalModules: modulesData?.length || 0 };
      if (enrollment && modulesData) {
        // Mock progress calculation - you can implement real progress tracking
        const completedModules = Math.floor(Math.random() * modulesData.length);
        const progress = modulesData.length > 0 ? (completedModules / modulesData.length) * 100 : 0;
        progressStats = { progress, completedModules, totalModules: modulesData.length };
      }

      setCourse(courseData);
      setModules(modulesData || []);
      setAssessments(assessmentsData || []);
      setAssessmentTemplates(templateData || []);
      setIsCompleted(enrollment?.status === 'completed');
      setCourseStats(progressStats);

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
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-48 bg-muted rounded-lg"></div>
              <div className="h-48 bg-muted rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <MainNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-6 hover:bg-muted/50">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        {/* Enhanced Course Header */}
        <Card className="mb-8 overflow-hidden border-0 shadow-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
          <CardHeader className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                      <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-white mb-2">{course.course_name}</h1>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={course.is_mandatory ? 'destructive' : 'secondary'}
                          className="bg-white/20 border-white/30 text-white font-medium"
                        >
                          {course.is_mandatory ? '⚠️ Mandatory' : '✨ Optional'}
                        </Badge>
                        <Badge className="bg-white/20 border-white/30 text-white font-medium">
                          📚 {course.difficulty_level}
                        </Badge>
                        {course.course_type && (
                          <Badge className="bg-white/20 border-white/30 text-white font-medium">
                            🎯 {course.course_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Instructor Info */}
                  {instructor && (
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-10 h-10 ring-2 ring-white/30">
                        <AvatarImage src={instructor.avatar_url} />
                        <AvatarFallback className="bg-white/20 text-white font-semibold">
                          {instructor.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">Instructor: {instructor.full_name}</p>
                        <p className="text-white/80 text-sm">{instructor.email}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Course Stats for Trainees */}
                {isTrainee && enrollment && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 min-w-[280px]">
                    <div className="text-center mb-4">
                      <div className="text-3xl font-bold text-white mb-1">
                        {Math.round(courseStats.progress)}%
                      </div>
                      <p className="text-white/80 text-sm">Course Progress</p>
                    </div>
                    <Progress value={courseStats.progress} className="mb-4 bg-white/20" />
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {courseStats.completedModules}
                        </div>
                        <p className="text-white/70 text-xs">Completed</p>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {courseStats.totalModules}
                        </div>
                        <p className="text-white/70 text-xs">Total Modules</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Trainee Actions */}
                {isTrainee && !enrollment && (
                  <Button 
                    onClick={handleEnroll} 
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-white/90 font-semibold px-6"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Enroll in Course
                  </Button>
                )}
                {isTrainee && enrollment && (
                  <Button 
                    onClick={handleMarkCourseComplete} 
                    disabled={isCompleted} 
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-white/90 font-semibold px-6"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {isCompleted ? 'Completed ✓' : 'Mark as Complete'}
                  </Button>
                )}
                
                {/* Management Actions */}
                {canManageCourses && (
                  <>
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => navigate(`/courses/${courseId}/edit`)}
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30 font-semibold"
                    >
                      <Edit className="h-5 w-5 mr-2" />
                      Edit Course
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setShowAssignmentDialog(true)}
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30 font-semibold"
                    >
                      <UserPlus className="h-5 w-5 mr-2" />
                      Assign to Employees
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Course Description */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="prose max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                {course.course_description}
              </p>
              
              {course.learning_objectives && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center text-blue-900">
                    <Target className="w-5 h-5 mr-2" />Learning Objectives
                  </h3>
                  <p className="text-blue-800">{course.learning_objectives}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Course Content for Enrolled Trainees */}
        {enrollment && isTrainee && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Modules Section - Takes 2 columns */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <CardTitle className="flex items-center text-xl">
                    <BookOpen className="h-6 w-6 mr-3 text-green-600" />
                    Course Modules
                    <Badge variant="secondary" className="ml-3">
                      {courseStats.completedModules}/{courseStats.totalModules}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {modules.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-lg font-medium mb-2">No modules yet</h3>
                      <p className="text-sm text-muted-foreground">Modules for this course will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {modules.map((module, index) => (
                        <div key={module.id} className="group">
                          <CourseModule
                            id={module.id}
                            name={module.module_name}
                            description={module.module_description}
                            order={module.module_order}
                            contentType={module.content_type}
                            contentUrl={module.content_url}
                            contentPath={module.content_path}
                            estimatedDuration={module.estimated_duration_minutes}
                            onStartModule={handleStartModule}
                            onViewContent={handleViewContent}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Assessments Section - Takes 1 column */}
            <div>
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                  <CardTitle className="flex items-center text-xl">
                    <Award className="h-6 w-6 mr-3 text-amber-600" />
                    Assessments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {assessmentTemplates.length === 0 ? (
                    <div className="text-center py-8">
                      <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h4 className="font-medium mb-1">No assessments yet</h4>
                      <p className="text-sm text-muted-foreground">Assessments will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assessmentTemplates.map((template) => {
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
                            onRetakeAssessment={handleTakeAssessment}
                            onMarkAsComplete={handleMarkAsComplete}
                          />
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Management Overview for Admins */}
        {canManageCourses && (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12">
              <div className="text-center space-y-8">
                <div className="flex justify-center">
                  <div className="p-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                    <Settings className="h-16 w-16 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">Course Management Dashboard</h3>
                  <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                    This course is configured and ready for employee assignments. Use the tools above to manage content and track progress.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                    <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Modules</h4>
                    <p className="text-2xl font-bold text-blue-600 mb-1">{modules.length}</p>
                    <p className="text-sm text-blue-600/80">Available</p>
                  </div>
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                    <Award className="h-12 w-12 text-amber-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Assessments</h4>
                    <p className="text-2xl font-bold text-amber-600 mb-1">{assessmentTemplates.length}</p>
                    <p className="text-sm text-amber-600/80">Configured</p>
                  </div>
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                    <Users className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Access</h4>
                    <p className="text-2xl font-bold text-green-600 mb-1">Ready</p>
                    <p className="text-sm text-green-600/80">For Assignment</p>
                  </div>
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                    <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                    <h4 className="font-semibold mb-2">Status</h4>
                    <p className="text-2xl font-bold text-purple-600 mb-1">Active</p>
                    <p className="text-sm text-purple-600/80">Course Live</p>
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