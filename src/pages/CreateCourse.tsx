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
import { EnhancedModuleCreator } from '@/components/courses/EnhancedModuleCreator';
import { AssessmentDialog } from '@/components/courses/AssessmentDialog';
import { MASTER_DATA } from '@/lib/masterData';
import { RequiredLabel } from '@/components/forms/RequiredLabel';

export default function CreateCourse() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'select' | 'manual' | 'auto'>('select');
  const [activeTab, setActiveTab] = useState('details');
  const [modules, setModules] = useState([]);
  const [assessments, setAssessments] = useState([]);
  
  // Auto-generation states
  const [extractionUrl, setExtractionUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

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

    // Validate required fields
    if (!formData.course_name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Course name is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.course_description?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Course description is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.course_type?.trim()) {
      toast({
        title: "Validation Error",
        description: "Course type is required", 
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

      setCourseId(data.id);
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
    if (!courseId) return;
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
    if (!courseId) return;
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
    navigate(`/courses/${courseId}`);
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
          {creationMode === 'select' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCreationMode('manual')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Edit className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Manual Creation</h3>
                  <p className="text-muted-foreground">
                    Create your course from scratch by entering details, adding modules, and assessments manually.
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setCreationMode('auto')}>
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold">Auto-Generate</h3>
                  <p className="text-muted-foreground">
                    Extract course content from URLs, ClickUp, Notion, CSV files, or let AI generate modules for you.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {creationMode === 'manual' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Manual Course Creation</h3>
                <Button variant="outline" onClick={() => setCreationMode('select')}>
                  Back to Options
                </Button>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Course Details</TabsTrigger>
              <TabsTrigger value="modules" disabled={!courseId}>Modules {courseId ? '' : '(Save first)'}</TabsTrigger>
              <TabsTrigger value="assessments" disabled={!courseId}>Assessments {courseId ? '' : '(Save first)'}</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <RequiredLabel htmlFor="course_name">Course Name</RequiredLabel>
                    <Input
                      id="course_name"
                      value={formData.course_name}
                      onChange={(e) => handleInputChange('course_name', e.target.value)}
                      placeholder="Enter course name"
                      required
                    />
                  </div>
                  <div>
                    <RequiredLabel htmlFor="course_description">Course Description</RequiredLabel>
                    <Textarea
                      id="course_description"
                      value={formData.course_description}
                      onChange={(e) => handleInputChange('course_description', e.target.value)}
                      placeholder="Describe the course content and objectives"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <RequiredLabel htmlFor="course_type">Course Type</RequiredLabel>
                    <Select 
                      value={formData.course_type} 
                      onValueChange={(value) => handleInputChange('course_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select course type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MASTER_DATA.courseTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="difficulty_level">Difficulty Level</Label>
                    <Select value={formData.difficulty_level} onValueChange={(value) => handleInputChange('difficulty_level', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        {MASTER_DATA.difficultyLevels.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="target_role">Target Role</Label>
                    <Select 
                      value={formData.target_role} 
                      onValueChange={(value) => handleInputChange('target_role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select target role" />
                      </SelectTrigger>
                      <SelectContent>
                        {MASTER_DATA.targetRoles.map(role => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="learning_objectives">Learning Objectives</Label>
                    <Textarea
                      id="learning_objectives"
                      value={formData.learning_objectives}
                      onChange={(e) => handleInputChange('learning_objectives', e.target.value)}
                      placeholder="List the key learning outcomes for this course"
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
                      <><Save className="mr-2 h-4 w-4" /> {courseId ? 'Update Course' : 'Create Course'}</>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="modules" className="mt-4">
              {!courseId ? (
                <p className="text-center text-muted-foreground">
                  Save course details first to add modules.
                </p>
              ) : (
                <div className="space-y-4">
                  <EnhancedModuleCreator courseId={courseId} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="assessments" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">COURSE ASSESSMENTS</h3>
                <Button onClick={handleAddAssessment} disabled={!courseId}>
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
                <Button onClick={handleFinishCourse} disabled={!courseId}>
                  Finish & View Course
                </Button>
              </div>
            </TabsContent>
              </Tabs>
            </>
          )}

          {creationMode === 'auto' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Auto-Generate Course from Link</h3>
                <Button variant="outline" onClick={() => {
                  setCreationMode('select');
                  setExtractionUrl('');
                  setExtractedData(null);
                }}>
                  Back to Options
                </Button>
              </div>
              
              {!extractedData ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Paste a URL from ClickUp, Notion, documentation sites, or any web content to automatically extract course details and modules.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="extraction_url">Content URL</Label>
                    <Input
                      id="extraction_url"
                      type="url"
                      value={extractionUrl}
                      onChange={(e) => setExtractionUrl(e.target.value)}
                      placeholder="https://example.com/course-content"
                      disabled={isExtracting}
                    />
                  </div>
                  <Button 
                    onClick={async () => {
                      if (!extractionUrl.trim()) {
                        toast({
                          title: "URL Required",
                          description: "Please enter a valid URL",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      setIsExtracting(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('extract-course-and-modules', {
                          body: { 
                            content: extractionUrl,
                            source: 'URL'
                          }
                        });
                        
                        if (error) throw error;
                        
                        if (!data.success) {
                          throw new Error(data.error || 'Failed to extract course data');
                        }
                        
                        setExtractedData(data);
                        toast({
                          title: "Success",
                          description: `Extracted course with ${data.modules?.length || 0} modules`
                        });
                      } catch (error) {
                        console.error('Error extracting course:', error);
                        toast({
                          title: "Extraction Failed",
                          description: error instanceof Error ? error.message : "Failed to extract course content",
                          variant: "destructive"
                        });
                      } finally {
                        setIsExtracting(false);
                      }
                    }}
                    disabled={isExtracting || !extractionUrl.trim()}
                  >
                    {isExtracting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Extracting Content...
                      </span>
                    ) : (
                      'Extract Course & Modules'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Extracted Course Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Course Name</Label>
                          <Input
                            value={extractedData.course?.course_name || ''}
                            onChange={(e) => setExtractedData(prev => ({
                              ...prev,
                              course: { ...prev.course, course_name: e.target.value }
                            }))}
                          />
                        </div>
                        <div>
                          <Label>Course Type</Label>
                          <Select
                            value={extractedData.course?.course_type || ''}
                            onValueChange={(value) => setExtractedData(prev => ({
                              ...prev,
                              course: { ...prev.course, course_type: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MASTER_DATA.courseTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Difficulty Level</Label>
                          <Select
                            value={extractedData.course?.difficulty_level || 'Intermediate'}
                            onValueChange={(value) => setExtractedData(prev => ({
                              ...prev,
                              course: { ...prev.course, difficulty_level: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MASTER_DATA.difficultyLevels.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Target Role</Label>
                          <Select
                            value={extractedData.course?.target_role || ''}
                            onValueChange={(value) => setExtractedData(prev => ({
                              ...prev,
                              course: { ...prev.course, target_role: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {MASTER_DATA.targetRoles.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={extractedData.course?.course_description || ''}
                            onChange={(e) => setExtractedData(prev => ({
                              ...prev,
                              course: { ...prev.course, course_description: e.target.value }
                            }))}
                            rows={3}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Learning Objectives</Label>
                          <Textarea
                            value={extractedData.course?.learning_objectives || ''}
                            onChange={(e) => setExtractedData(prev => ({
                              ...prev,
                              course: { ...prev.course, learning_objectives: e.target.value }
                            }))}
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Extracted Modules ({extractedData.modules?.length || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {extractedData.modules?.map((module, idx) => (
                          <Card key={idx}>
                            <CardContent className="p-4">
                              <h4 className="font-semibold">{module.module_name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{module.module_description}</p>
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Type: {module.content_type}</span>
                                <span>Duration: {module.estimated_duration_minutes}min</span>
                                {module.content_url && <span className="truncate">URL: {module.content_url}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExtractedData(null);
                        setExtractionUrl('');
                      }}
                    >
                      Extract Different URL
                    </Button>
                    <Button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          // Create course
                          const { data: courseData, error: courseError } = await supabase
                            .from('courses')
                            .insert({
                              course_name: extractedData.course.course_name,
                              course_description: extractedData.course.course_description,
                              course_type: extractedData.course.course_type,
                              difficulty_level: extractedData.course.difficulty_level || 'Intermediate',
                              target_role: extractedData.course.target_role || '',
                              learning_objectives: extractedData.course.learning_objectives || '',
                              is_mandatory: false,
                              completion_rule: 'pass_all_assessments',
                              minimum_passing_percentage: 70,
                              created_by: profile?.id
                            })
                            .select()
                            .single();

                          if (courseError) throw courseError;

                          // Create modules
                          if (extractedData.modules?.length > 0) {
                            const modulesToInsert = extractedData.modules.map((module, idx) => ({
                              course_id: courseData.id,
                              module_name: module.module_name,
                              module_description: module.module_description,
                              content_type: module.content_type,
                              content_url: module.content_url || '',
                              estimated_duration_minutes: module.estimated_duration_minutes,
                              module_order: idx + 1
                            }));

                            const { error: modulesError } = await supabase
                              .from('course_modules')
                              .insert(modulesToInsert);

                            if (modulesError) throw modulesError;
                          }

                          toast({
                            title: "Success",
                            description: `Course created with ${extractedData.modules?.length || 0} modules`
                          });
                          
                          navigate(`/courses/${courseData.id}`);
                        } catch (error) {
                          console.error('Error saving course:', error);
                          toast({
                            title: "Error",
                            description: "Failed to save course",
                            variant: "destructive"
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      {loading ? 'Creating Course...' : 'Save Course & Modules'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={showAssessmentDialog} onOpenChange={setShowAssessmentDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>{editingAssessment ? 'Edit Assessment' : 'Add New Assessment'}</DialogTitle>
          </DialogHeader>
          {courseId && (
            <AssessmentDialog
              courseId={courseId}
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