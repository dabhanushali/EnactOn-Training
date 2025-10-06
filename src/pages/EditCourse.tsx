import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/navigation/MainNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Users, 
  Settings,
  Upload,
  X,
  GripVertical,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth-utils';
import { EnhancedModuleDialog } from '@/components/courses/EnhancedModuleDialog';

interface Course {
  id: string;
  course_name: string;
  course_description: string;
  course_type: string;
  difficulty_level: string;
  is_mandatory: boolean;
  target_role?: string;
  estimated_duration?: string;
  prerequisites?: string[];
  learning_objectives?: string[];
  skills_gained?: string[];
  instructor_id?: string;
}

interface Module {
  id: string;
  course_id: string;
  module_name: string;
  module_description?: string;
  content?: string;
  module_order: number;
  estimated_time?: string;
  module_type: 'text' | 'video' | 'quiz' | 'assignment' | 'interactive';
  is_required: boolean;
  resources?: string[];
}

export default function EditCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form states
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseType, setCourseType] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [learningObjectives, setLearningObjectives] = useState<string[]>([]);
  const [skillsGained, setSkillsGained] = useState<string[]>([]);
  const [instructorId, setInstructorId] = useState('');
  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
      fetchInstructors();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      
      setCourse(courseData);
      setCourseName(courseData.course_name);
      setCourseDescription(courseData.course_description);
      setCourseType(courseData.course_type);
      setDifficultyLevel(courseData.difficulty_level);
      setIsMandatory(courseData.is_mandatory);
      setTargetRole(courseData.target_role || '');
      setEstimatedDuration(courseData.estimated_duration || '');
      setPrerequisites(courseData.prerequisites || []);
      setLearningObjectives(courseData.learning_objectives || []);
      setSkillsGained(courseData.skills_gained || []);
      setInstructorId(courseData.instructor_id || '');

      // Fetch course modules
      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('module_order');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

    } catch (error) {
      console.error('Error fetching course data:', error);
      toast.error('Failed to load course data');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role_id', '1'); // Assuming instructors have role_id 1

      if (error) throw error;
      setInstructors(data || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!courseName.trim()) errors.courseName = 'Course name is required';
    if (!courseDescription.trim()) errors.courseDescription = 'Course description is required';
    if (!courseType) errors.courseType = 'Course type is required';
    if (!difficultyLevel) errors.difficultyLevel = 'Difficulty level is required';
    if (learningObjectives.length === 0) errors.learningObjectives = 'At least one learning objective is required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCourse = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    try {
      setSaving(true);
      
      const updatedCourse = {
        course_name: courseName,
        course_description: courseDescription,
        course_type: courseType,
        difficulty_level: difficultyLevel,
        is_mandatory: isMandatory,
        target_role: targetRole || null,
        estimated_duration: estimatedDuration || null,
        prerequisites: prerequisites.length > 0 ? prerequisites : null,
        learning_objectives: learningObjectives.length > 0 ? learningObjectives : null,
        skills_gained: skillsGained.length > 0 ? skillsGained : null,
        instructor_id: instructorId || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('courses')
        .update(updatedCourse)
        .eq('id', courseId);

      if (error) throw error;
      
      toast.success('Course updated successfully!');
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrerequisite = () => {
    if (newPrerequisite.trim() && !prerequisites.includes(newPrerequisite)) {
      setPrerequisites([...prerequisites, newPrerequisite.trim()]);
      setNewPrerequisite('');
    }
  };

  const handleAddObjective = () => {
    if (newObjective.trim() && !learningObjectives.includes(newObjective)) {
      setLearningObjectives([...learningObjectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skillsGained.includes(newSkill)) {
      setSkillsGained([...skillsGained, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemovePrerequisite = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index));
  };

  const handleRemoveObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const handleRemoveSkill = (index: number) => {
    setSkillsGained(skillsGained.filter((_, i) => i !== index));
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setIsModuleDialogOpen(true);
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      
      setModules(modules.filter(m => m.id !== moduleId));
      toast.success('Module deleted successfully');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const handleModuleSaved = () => {
    fetchCourseData(); // Refresh modules
    setIsModuleDialogOpen(false);
    setEditingModule(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-lg font-medium">Loading course...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/courses')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Edit Course</h1>
              <p className="text-muted-foreground mt-1">
                Update course details and manage modules
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
              <BookOpen className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSaveCourse} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Course Details
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Modules ({modules.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Advanced Settings
            </TabsTrigger>
          </TabsList>

          {/* Course Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="courseName">Course Name *</Label>
                    <Input
                      id="courseName"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="Enter course name"
                      className={validationErrors.courseName ? 'border-red-500' : ''}
                    />
                    {validationErrors.courseName && (
                      <p className="text-sm text-red-500">{validationErrors.courseName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="courseDescription">Description *</Label>
                    <Textarea
                      id="courseDescription"
                      value={courseDescription}
                      onChange={(e) => setCourseDescription(e.target.value)}
                      placeholder="Describe what this course covers"
                      rows={4}
                      className={validationErrors.courseDescription ? 'border-red-500' : ''}
                    />
                    {validationErrors.courseDescription && (
                      <p className="text-sm text-red-500">{validationErrors.courseDescription}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="courseType">Course Type *</Label>
                      <Select value={courseType} onValueChange={setCourseType}>
                        <SelectTrigger className={validationErrors.courseType ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pre-joining">Pre-joining</SelectItem>
                          <SelectItem value="Onboarding">Onboarding</SelectItem>
                          <SelectItem value="Technical">Technical</SelectItem>
                          <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                          <SelectItem value="Leadership">Leadership</SelectItem>
                          <SelectItem value="Certification">Certification</SelectItem>
                        </SelectContent>
                      </Select>
                      {validationErrors.courseType && (
                        <p className="text-sm text-red-500">{validationErrors.courseType}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="difficultyLevel">Difficulty Level *</Label>
                      <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                        <SelectTrigger className={validationErrors.difficultyLevel ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      {validationErrors.difficultyLevel && (
                        <p className="text-sm text-red-500">{validationErrors.difficultyLevel}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetRole">Target Role</Label>
                      <Input
                        id="targetRole"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estimatedDuration">Estimated Duration</Label>
                      <Input
                        id="estimatedDuration"
                        value={estimatedDuration}
                        onChange={(e) => setEstimatedDuration(e.target.value)}
                        placeholder="e.g., 2 weeks, 40 hours"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isMandatory"
                      checked={isMandatory}
                      onCheckedChange={setIsMandatory}
                    />
                    <Label htmlFor="isMandatory">This is a mandatory course</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Learning Objectives Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Learning Objectives *</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      placeholder="Add learning objective"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddObjective()}
                    />
                    <Button onClick={handleAddObjective} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {learningObjectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="flex-1">{objective}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveObjective(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {learningObjectives.length === 0 && (
                      <p className="text-sm text-muted-foreground">No learning objectives added yet</p>
                    )}
                  </div>
                  {validationErrors.learningObjectives && (
                    <p className="text-sm text-red-500">{validationErrors.learningObjectives}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Prerequisites and Skills Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prerequisites Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Prerequisites</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newPrerequisite}
                      onChange={(e) => setNewPrerequisite(e.target.value)}
                      placeholder="Add prerequisite"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPrerequisite()}
                    />
                    <Button onClick={handleAddPrerequisite} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {prerequisites.map((prerequisite, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {prerequisite}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => handleRemovePrerequisite(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {prerequisites.length === 0 && (
                      <p className="text-sm text-muted-foreground">No prerequisites required</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Skills Gained Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills Gained</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add skill"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    />
                    <Button onClick={handleAddSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {skillsGained.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => handleRemoveSkill(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {skillsGained.length === 0 && (
                      <p className="text-sm text-muted-foreground">No skills specified</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Course Modules</CardTitle>
                  <Button onClick={() => setIsModuleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {modules.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No modules yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your course by adding modules
                    </p>
                    <Button onClick={() => setIsModuleDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Module
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {modules.map((module, index) => (
                      <Card key={module.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="outline">Module {index + 1}</Badge>
                                </div>
                                <h4 className="font-medium">{module.module_name}</h4>
                                {module.is_required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {module.module_description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Type: {module.module_type}</span>
                                {module.estimated_time && (
                                  <span>Duration: {module.estimated_time}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditModule(module)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteModule(module.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Instructor Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instructor">Course Instructor</Label>
                  <Select value={instructorId} onValueChange={setInstructorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an instructor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No instructor assigned</SelectItem>
                      {instructors.map((instructor) => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.full_name} ({instructor.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Module Dialog */}
      <EnhancedModuleDialog
        open={isModuleDialogOpen}
        onOpenChange={setIsModuleDialogOpen}
        courseId={courseId!}
        module={editingModule}
        onSaved={handleModuleSaved}
      />
    </div>
  );
}