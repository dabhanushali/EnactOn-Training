import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Save, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { useToast } from '@/hooks/use-toast';
import { ModuleDialog } from '@/components/courses/ModuleDialog';
import { EnhancedModuleDialog } from '@/components/courses/EnhancedModuleDialog';
import { AssessmentDialog } from '@/components/courses/AssessmentDialog';

export default function CreateCourse() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [modules, setModules] = useState([]);
  const [assessments, setAssessments] = useState([]);

  // Dialog states
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [editingAssessment, setEditingAssessment] = useState(null);

  const [formData, setFormData] = useState({
    course_name: '',
    course_description: '',
    course_type: '',
    difficulty_level: 'Beginner',
    target_role: '',
    learning_objectives: '',
    is_mandatory: false,
    completion_rule: 'pass_all_assessments',
    minimum_passing_percentage: 70
  });

  const canCreateCourse = profile?.role?.role_name === 'Team Lead' || profile?.role?.role_name === 'HR' || profile?.role?.role_name === 'Management';

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateCourse) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create courses",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({ ...formData, created_by: profile?.id })
        .select()
        .single();

      if (error) throw error;

      setCurrentCourseId(data.id);
      toast({
        title: "Success",
        description: "Course created successfully. Now you can add modules and assessments."
      });
      // Switch to modules tab after course creation
      setActiveTab('modules');
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: "Failed to create course",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = () => {
    setEditingModule(null);
    setShowModuleDialog(true);
  };

  const handleEditModule = (module: any) => {
    setEditingModule(module);
    setShowModuleDialog(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!currentCourseId) return;
    try {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      setModules(prev => prev.filter(m => m.id !== moduleId));
      toast({
        title: "Success",
        description: "Module deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Error",
        description: "Failed to delete module",
        variant: "destructive",
      });
    }
  };

  const handleModuleSave = (module: any) => {
    if (editingModule) {
      setModules(prev => prev.map(m => m.id === module.id ? module : m));
    } else {
      setModules(prev => [...prev, module]);
    }
  };

  const handleAddAssessment = () => {
    setEditingAssessment(null);
    setShowAssessmentDialog(true);
  };

  const handleEditAssessment = (assessment: any) => {
    setEditingAssessment(assessment);
    setShowAssessmentDialog(true);
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!currentCourseId) return;
    try {
      const { error } = await supabase
        .from('assessment_templates')
        .delete()
        .eq('id', assessmentId);

      if (error) throw error;

      setAssessments(prev => prev.filter(a => a.id !== assessmentId));
      toast({
        title: "Success",
        description: "Assessment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      });
    }
  };

  const handleFinishCourse = () => {
    navigate(`/courses/${currentCourseId}`);
  };

  if (!canCreateCourse) {
    return (
      <div className="container mx-auto py-10">
        <Button variant="outline" onClick={() => navigate('/courses')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don't have permission to create courses</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <MainNav />
      <Button variant="outline" onClick={() => navigate('/courses')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create New Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Course Details</TabsTrigger>
              <TabsTrigger value="modules" disabled={!currentCourseId}>Modules {currentCourseId ? '' : '(Save first)'}</TabsTrigger>
              <TabsTrigger value="assessments" disabled={!currentCourseId}>Assessments {currentCourseId ? '' : '(Save first)'}</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="course_name">Course Name</Label>
                    <Input
                      id="course_name"
                      value={formData.course_name}
                      onChange={(e) => handleInputChange('course_name', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="course_description">Course Description</Label>
                    <Textarea
                      id="course_description"
                      value={formData.course_description}
                      onChange={(e) => handleInputChange('course_description', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="course_type">Course Type</Label>
                    <Input
                      id="course_type"
                      value={formData.course_type}
                      onChange={(e) => handleInputChange('course_type', e.target.value)}
                      placeholder="e.g., Technical, Soft Skills"
                    />
                  </div>
                  <div>
                    <Label htmlFor="difficulty_level">Difficulty Level</Label>
                    <Select value={formData.difficulty_level} onValueChange={(value) => handleInputChange('difficulty_level', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
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
                    <Input
                      id="target_role"
                      value={formData.target_role}
                      onChange={(e) => handleInputChange('target_role', e.target.value)}
                      placeholder="e.g., Developer, Manager"
                    />
                  </div>
                  <div>
                    <Label htmlFor="learning_objectives">Learning Objectives</Label>
                    <Textarea
                      id="learning_objectives"
                      value={formData.learning_objectives}
                      onChange={(e) => handleInputChange('learning_objectives', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_mandatory"
                    checked={formData.is_mandatory}
                    onCheckedChange={(checked) => handleInputChange('is_mandatory', checked)}
                  />
                  <Label htmlFor="is_mandatory">Mandatory Course</Label>
                </div>
                <div>
                  <Label htmlFor="completion_rule">Completion Rule</Label>
                  <Select value={formData.completion_rule} onValueChange={(value) => handleInputChange('completion_rule', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select completion rule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass_all_assessments">Pass All Assessments</SelectItem>
                      <SelectItem value="pass_minimum_percentage">Pass Minimum Percentage</SelectItem>
                      <SelectItem value="pass_mandatory_only">Pass Mandatory Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.completion_rule === 'pass_minimum_percentage' && (
                  <div>
                    <Label htmlFor="minimum_passing_percentage">Minimum Passing Percentage</Label>
                    <Input
                      id="minimum_passing_percentage"
                      type="number"
                      value={formData.minimum_passing_percentage}
                      onChange={(e) => handleInputChange('minimum_passing_percentage', parseInt(e.target.value))}
                    />
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" type="button" onClick={() => navigate('/courses')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> {currentCourseId ? 'Update Course' : 'Create Course'}</>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="modules" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">COURSE MODULES</h3>
                <Button onClick={handleAddModule} disabled={!currentCourseId}>
                  <Plus className="mr-2 h-4 w-4" /> Add Module
                </Button>
              </div>
              {modules.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No modules added yet. Click "Add Module" to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {modules.map((module, index) => (
                    <Card key={module.id || index}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{module.module_name}</h4>
                          <p className="text-sm text-muted-foreground">{module.module_description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Order: {module.module_order} Type: {module.content_type} Duration: {module.estimated_duration_minutes}min
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleEditModule(module)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteModule(module.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-6">
                <Button onClick={() => setActiveTab('assessments')} disabled={!currentCourseId}>
                  Continue to Course
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="assessments" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">COURSE ASSESSMENTS</h3>
                <Button onClick={handleAddAssessment} disabled={!currentCourseId}>
                  <Plus className="mr-2 h-4 w-4" /> Add Assessment
                </Button>
              </div>
              {assessments.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  No assessments added yet. Click "Add Assessment" to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {assessments.map((assessment) => (
                    <Card key={assessment.id}>
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold">{assessment.title}</h4>
                          <p className="text-sm text-muted-foreground">{assessment.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Type: {assessment.assessment_type} Passing: {assessment.passing_score}% Time: {assessment.time_limit_minutes}min {assessment.is_mandatory && <span className="font-medium text-red-500">Mandatory</span>}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="icon" onClick={() => handleEditAssessment(assessment)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteAssessment(assessment.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-6">
                <Button onClick={handleFinishCourse} disabled={!currentCourseId}>
                  Finish & View Course
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Edit Module' : 'Add New Module'}</DialogTitle>
          </DialogHeader>
          {currentCourseId && (
            <EnhancedModuleDialog
              courseId={currentCourseId}
              module={editingModule}
              moduleOrder={modules.length + 1}
              onSave={handleModuleSave}
              onClose={() => setShowModuleDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAssessmentDialog} onOpenChange={setShowAssessmentDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{editingAssessment ? 'Edit Assessment' : 'Add New Assessment'}</DialogTitle>
          </DialogHeader>
          {currentCourseId && (
            <AssessmentDialog
              courseId={currentCourseId}
              assessment={editingAssessment}
              onAssessmentSave={(newAssessment) => {
                if (editingAssessment) {
                  setAssessments(prev => prev.map(a => a.id === newAssessment.id ? newAssessment : a));
                } else {
                  setAssessments(prev => [...prev, newAssessment]);
                }
                setShowAssessmentDialog(false);
              }}
               onClose={() => setShowAssessmentDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}