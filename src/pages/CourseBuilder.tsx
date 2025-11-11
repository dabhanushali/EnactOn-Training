import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MainNav } from '@/components/navigation/MainNav';
import { AssessmentTemplateManager } from '@/components/courses/AssessmentTemplateManager';
import { EnhancedModuleCreator } from '@/components/courses/EnhancedModuleCreator';
import { MASTER_DATA } from '@/lib/masterData';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical, 
  FileText, 
  Video, 
  Link as LinkIcon,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';

interface Course {
  id: string;
  course_name: string;
  course_description: string;
  difficulty_level: string;
  course_type: string;
  target_role?: string;
  is_mandatory: boolean;
  completion_rule: string;
  minimum_passing_percentage: number;
  learning_objectives: string;
}

interface Module {
  id: string;
  course_id: string;
  module_name: string;
  module_description: string;
  module_order: number;
  content_type: string;
  content_url: string;
  content_path: string;
  estimated_duration_minutes: number;
}

interface Assessment {
  id: string;
  course_id: string;
  employee_id: string;
  assessment_type: string;
  passing_score: number;
  is_mandatory: boolean;
  status: string;
}

export default function CourseBuilder() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [activeTab, setActiveTab] = useState("details"); // Add controlled tab state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('module_order');

      if (modulesError) throw modulesError;

      // Fetch assessment count
      const { count: assessmentCount } = await supabase
        .from('assessment_templates')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      setCourse(courseData);
      setModules(modulesData || []);
      setAssessmentCount(assessmentCount || 0);

    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "Failed to load course data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, fetchCourseData]);

  // Check permissions - using Supabase function to get user role
  const canManageCourses = useCallback(async () => {
    if (!user) return false;
    try {
      const { data, error } = await supabase.rpc('get_user_role', { user_id: user.id });
      if (error) throw error;
      return ['Team Lead', 'HR', 'Management'].includes(data);
    } catch (error) {
      console.error('Error checking user role:', error);
      return false;
    }
  }, [user]);

  const [hasManagePermission, setHasManagePermission] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      const canManage = await canManageCourses();
      setHasManagePermission(canManage);
    };
    checkPermissions();
  }, [canManageCourses]);

  const handleSaveCourse = async () => {
    if (!course) return;

    const { id, ...updateData } = course;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', course.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course updated successfully.",
      });

    } catch (error) {
      console.error('Error updating course:', error);
      toast({
        title: "Error",
        description: "Failed to update course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModule = async (moduleData: Module) => {
    await fetchCourseData();
    setModuleDialogOpen(false);
    setEditingModule(null);
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      await fetchCourseData();
      toast({
        title: "Success",
        description: "Module deleted successfully.",
      });

    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Error",
        description: "Failed to delete module. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'document':
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'link':
      case 'url':
        return <LinkIcon className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!hasManagePermission) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">You don't have permission to manage courses.</p>
              <Button onClick={() => navigate('/courses')} className="mt-4">
                Back to Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Course not found</p>
              <Button onClick={() => navigate('/courses')} className="mt-4">
                Back to Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/courses')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Course Builder</h1>
              <p className="text-muted-foreground">{course.course_name}</p>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate(`/courses/${courseId}`)}
            variant="outline"
          >
            Preview Course
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Course Details</TabsTrigger>
            <TabsTrigger value="modules">Modules ({modules.length})</TabsTrigger>
            <TabsTrigger value="assessments">Assessments ({assessmentCount})</TabsTrigger>
          </TabsList>

          {/* Course Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="course_name">Course Name</Label>
                    <Input
                      id="course_name"
                      value={course.course_name}
                      onChange={(e) => setCourse({...course, course_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="course_type">Course Type</Label>
                    <Select
                      value={course.course_type}
                      onValueChange={(value) => {
                        setCourse({...course, course_type: value});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MASTER_DATA.courseTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="difficulty_level">Difficulty Level</Label>
                    <Select
                      value={course.difficulty_level}
                      onValueChange={(value) => {
                        setCourse({...course, difficulty_level: value});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="target_role">Target Role</Label>
                    <Select
                      value={course.target_role || 'all'}
                      onValueChange={(value) => {
                        setCourse({...course, target_role: value === 'all' ? undefined : value});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {MASTER_DATA.departments.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="course_description">Description</Label>
                  <Textarea
                    id="course_description"
                    value={course.course_description || ''}
                    onChange={(e) => setCourse({...course, course_description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="learning_objectives">Learning Objectives</Label>
                  <Textarea
                    id="learning_objectives"
                    value={course.learning_objectives || ''}
                    onChange={(e) => setCourse({...course, learning_objectives: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_mandatory"
                    checked={course.is_mandatory}
                    onCheckedChange={(checked) => {
                      setCourse({...course, is_mandatory: checked});
                    }}
                  />
                  <Label htmlFor="is_mandatory">Mandatory Course</Label>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button onClick={handleSaveCourse} disabled={saving}>
                    {saving ? 'Updating...' : 'Update Course'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Module Creator */}
          <TabsContent value="modules" className="space-y-6">
            <EnhancedModuleCreator courseId={courseId!} />
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments" className="space-y-6">
            <AssessmentTemplateManager 
              courseId={courseId!} 
              onQuestionManagement={(assessmentId) => {
                // Auto-redirect functionality: switch to assessments tab and scroll to the specific assessment
                setActiveTab("assessments");
                toast({
                  title: "Assessment Created!",
                  description: "You can now add questions to your assessment.",
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
