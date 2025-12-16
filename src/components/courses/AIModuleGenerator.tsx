import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RequiredLabel } from '@/components/forms/RequiredLabel';
import { Sparkles, Eye, Trash2, Save, Edit, Clock, Target, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { COURSE_TYPES, TARGET_ROLES } from '@/lib/masterData';

interface AIGeneratedModule {
  module_name: string;
  module_description: string;
  content_type: string;
  estimated_duration_minutes: number;
  learning_objectives: string[];
  suggested_activities: string[];
  module_order: number;
  edited?: boolean;
}

interface AIModuleGeneratorProps {
  courseId: string;
  courseType?: string;
  targetRole?: string;
  difficultyLevel?: string;
  onModulesCreated: () => void;
}

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const CONTENT_TYPES = ['External Link', 'Video', 'PDF', 'Text', 'Document', 'Presentation', 'Assignment'];

export const AIModuleGenerator = ({ 
  courseId, 
  courseType: initialCourseType, 
  targetRole: initialTargetRole,
  difficultyLevel: initialDifficultyLevel,
  onModulesCreated 
}: AIModuleGeneratorProps) => {
  const [prompt, setPrompt] = useState('');
  const [courseType, setCourseType] = useState(initialCourseType || '');
  const [targetRole, setTargetRole] = useState(initialTargetRole || '');
  const [difficultyLevel, setDifficultyLevel] = useState(initialDifficultyLevel || 'Beginner');
  const [generatedModules, setGeneratedModules] = useState<AIGeneratedModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const generateModules = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description for the course modules');
      return;
    }

    if (prompt.trim().length < 10) {
      toast.error('Please provide a more detailed description (at least 10 characters)');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-course-modules', {
        body: {
          prompt: prompt.trim(),
          courseType,
          targetRole,
          difficultyLevel
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate modules');
      }

      setGeneratedModules(data.modules || []);
      setShowPreview(true);
      toast.success(`Generated ${data.modules?.length || 0} course modules!`);

    } catch (error) {
      console.error('Error generating modules:', error);
      toast.error(`Failed to generate modules: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateModule = (index: number, field: keyof AIGeneratedModule, value: any) => {
    setGeneratedModules(prev => prev.map((module, i) => 
      i === index ? { ...module, [field]: value, edited: true } : module
    ));
  };

  const deleteModule = (index: number) => {
    setGeneratedModules(prev => prev.filter((_, i) => i !== index).map((module, i) => ({
      ...module,
      module_order: i + 1
    })));
  };

  const saveModules = async () => {
    if (generatedModules.length === 0) {
      toast.error('No modules to save');
      return;
    }

    setSaving(true);

    try {
      const modulesToInsert = generatedModules.map(module => ({
        course_id: courseId,
        module_name: module.module_name,
        module_description: module.module_description,
        content_type: module.content_type,
        estimated_duration_minutes: module.estimated_duration_minutes,
        module_order: module.module_order
      }));

      const { error } = await supabase
        .from('course_modules')
        .insert(modulesToInsert);

      if (error) throw error;

      toast.success(`Successfully created ${generatedModules.length} AI-generated modules!`);
      onModulesCreated();
      
      // Reset form
      setGeneratedModules([]);
      setShowPreview(false);
      setPrompt('');
    } catch (error) {
      console.error('Error saving modules:', error);
      toast.error(`Failed to save modules: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const ModulePreviewCard = ({ module, index }: { module: AIGeneratedModule; index: number }) => (
    <Card className={`transition-all duration-200 ${module.edited ? 'border-warning' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">
            {editingIndex === index ? (
              <Input
                value={module.module_name}
                onChange={(e) => updateModule(index, 'module_name', e.target.value)}
                className="font-semibold"
              />
            ) : (
              module.module_name
            )}
          </CardTitle>
          {module.edited && <Badge variant="secondary" className="text-xs bg-warning/10 text-warning border-warning">Edited</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingIndex(editingIndex === index ? null : index)}
          >
            {editingIndex === index ? <CheckCircle className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteModule(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Description</label>
          {editingIndex === index ? (
            <Textarea
              value={module.module_description}
              onChange={(e) => updateModule(index, 'module_description', e.target.value)}
              rows={3}
              className="mt-1"
            />
          ) : (
            <p className="text-sm text-muted-foreground mt-1">{module.module_description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Content Type</label>
            {editingIndex === index ? (
              <Select 
                value={module.content_type} 
                onValueChange={(value) => updateModule(index, 'content_type', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground mt-1 capitalize">
                {module.content_type.replace('_', ' ')}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Duration
            </label>
            {editingIndex === index ? (
              <Input
                type="number"
                min="15"
                max="300"
                value={module.estimated_duration_minutes}
                onChange={(e) => updateModule(index, 'estimated_duration_minutes', parseInt(e.target.value) || 60)}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-1">{module.estimated_duration_minutes} minutes</p>
            )}
          </div>
        </div>

        {module.learning_objectives && module.learning_objectives.length > 0 && (
          <div>
            <label className="text-sm font-medium flex items-center gap-1">
              <Target className="h-3 w-3" />
              Learning Objectives
            </label>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              {module.learning_objectives.map((objective, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}

        {module.suggested_activities && module.suggested_activities.length > 0 && (
          <div>
            <label className="text-sm font-medium">Suggested Activities</label>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              {module.suggested_activities.map((activity, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {activity}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* AI Generation Form */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Course Module Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <RequiredLabel>Course Type</RequiredLabel>
              <Select value={courseType} onValueChange={setCourseType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <RequiredLabel>Target Role</RequiredLabel>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLES.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <RequiredLabel>Difficulty Level</RequiredLabel>
              <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <RequiredLabel htmlFor="ai-prompt">
              Course Description & Requirements
            </RequiredLabel>
            <Textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Create modules for an introductory Python programming course covering variables, functions, loops, data structures, and a final project. Include practical exercises and real-world examples."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be specific about topics, skills, and learning outcomes you want to include.
            </p>
          </div>

          <Button 
            onClick={generateModules} 
            disabled={loading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? 'Generating Modules...' : 'Generate AI Modules'}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Modules Preview */}
      {showPreview && generatedModules.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                AI Generated Modules Preview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review, edit, and customize the AI-generated modules before saving
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={saveModules} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : `Save ${generatedModules.length} Modules`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedModules.map((module, index) => (
                <ModulePreviewCard key={index} module={module} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};