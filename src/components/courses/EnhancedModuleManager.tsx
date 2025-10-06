import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  GripVertical, 
  Play, 
  Clock, 
  FileText, 
  Video, 
  HelpCircle, 
  Clipboard,
  Monitor,
  BookOpen,
  Upload,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  completion_criteria?: string;
  points_value?: number;
}

interface EnhancedModuleManagerProps {
  courseId: string;
  modules: Module[];
  onModulesChange: (modules: Module[]) => void;
  canEdit?: boolean;
}

export const EnhancedModuleManager = ({ 
  courseId, 
  modules, 
  onModulesChange, 
  canEdit = true 
}: EnhancedModuleManagerProps) => {
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for module creation/editing
  const [moduleName, setModuleName] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [content, setContent] = useState('');
  const [moduleType, setModuleType] = useState<'text' | 'video' | 'quiz' | 'assignment' | 'interactive'>('text');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [completionCriteria, setCompletionCriteria] = useState('');
  const [pointsValue, setPointsValue] = useState('');
  const [resources, setResources] = useState<string[]>([]);
  const [newResource, setNewResource] = useState('');

  const getModuleTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4 text-purple-500" />;
      case 'assignment':
        return <Clipboard className="w-4 h-4 text-orange-500" />;
      case 'interactive':
        return <Monitor className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getModuleTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'quiz':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'assignment':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'interactive':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const resetForm = () => {
    setModuleName('');
    setModuleDescription('');
    setContent('');
    setModuleType('text');
    setEstimatedTime('');
    setIsRequired(true);
    setCompletionCriteria('');
    setPointsValue('');
    setResources([]);
    setNewResource('');
  };

  const populateForm = (module: Module) => {
    setModuleName(module.module_name);
    setModuleDescription(module.module_description || '');
    setContent(module.content || '');
    setModuleType(module.module_type);
    setEstimatedTime(module.estimated_time || '');
    setIsRequired(module.is_required);
    setCompletionCriteria(module.completion_criteria || '');
    setPointsValue(module.points_value?.toString() || '');
    setResources(module.resources || []);
  };

  const handleCreateModule = () => {
    resetForm();
    setIsCreating(true);
    setEditingModule(null);
  };

  const handleEditModule = (module: Module) => {
    populateForm(module);
    setEditingModule(module);
    setIsCreating(true);
  };

  const handleSaveModule = async () => {
    if (!moduleName.trim()) {
      toast.error('Module name is required');
      return;
    }

    try {
      setLoading(true);
      
      const moduleData = {
        course_id: courseId,
        module_name: moduleName.trim(),
        module_description: moduleDescription.trim() || null,
        content: content.trim() || null,
        module_type: moduleType,
        estimated_time: estimatedTime.trim() || null,
        is_required: isRequired,
        completion_criteria: completionCriteria.trim() || null,
        points_value: pointsValue ? parseInt(pointsValue) : null,
        resources: resources.length > 0 ? resources : null,
        module_order: editingModule ? editingModule.module_order : modules.length + 1
      };

      if (editingModule) {
        // Update existing module
        const { error } = await supabase
          .from('course_modules')
          .update(moduleData)
          .eq('id', editingModule.id);

        if (error) throw error;
        
        const updatedModules = modules.map(m => 
          m.id === editingModule.id 
            ? { ...m, ...moduleData } 
            : m
        );
        onModulesChange(updatedModules);
        toast.success('Module updated successfully');
      } else {
        // Create new module
        const { data, error } = await supabase
          .from('course_modules')
          .insert(moduleData)
          .select()
          .single();

        if (error) throw error;
        
        onModulesChange([...modules, data]);
        toast.success('Module created successfully');
      }
      
      setIsCreating(false);
      resetForm();
      setEditingModule(null);
    } catch (error) {
      console.error('Error saving module:', error);
      toast.error('Failed to save module');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;

    try {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      
      const updatedModules = modules.filter(m => m.id !== moduleId);
      onModulesChange(updatedModules);
      toast.success('Module deleted successfully');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const handleReorderModules = async (fromIndex: number, toIndex: number) => {
    const updatedModules = [...modules];
    const [movedModule] = updatedModules.splice(fromIndex, 1);
    updatedModules.splice(toIndex, 0, movedModule);

    // Update module orders
    const modulesToUpdate = updatedModules.map((module, index) => ({
      ...module,
      module_order: index + 1
    }));

    try {
      // Update all module orders in the database
      for (const module of modulesToUpdate) {
        await supabase
          .from('course_modules')
          .update({ module_order: module.module_order })
          .eq('id', module.id);
      }
      
      onModulesChange(modulesToUpdate);
      toast.success('Module order updated');
    } catch (error) {
      console.error('Error updating module order:', error);
      toast.error('Failed to update module order');
    }
  };

  const handleAddResource = () => {
    if (newResource.trim() && !resources.includes(newResource.trim())) {
      setResources([...resources, newResource.trim()]);
      setNewResource('');
    }
  };

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const sortedModules = [...modules].sort((a, b) => a.module_order - b.module_order);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Course Modules</h3>
          <p className="text-sm text-muted-foreground">
            {modules.length} modules • {modules.filter(m => m.is_required).length} required
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleCreateModule}>
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        )}
      </div>

      {/* Module Creation/Editing Form */}
      {isCreating && (
        <Card className="border-2 border-dashed border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editingModule ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingModule ? 'Edit Module' : 'Create New Module'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="moduleName">Module Name *</Label>
                    <Input
                      id="moduleName"
                      value={moduleName}
                      onChange={(e) => setModuleName(e.target.value)}
                      placeholder="Enter module name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="moduleType">Module Type *</Label>
                    <Select value={moduleType} onValueChange={(value: any) => setModuleType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">📄 Text Content</SelectItem>
                        <SelectItem value="video">🎥 Video</SelectItem>
                        <SelectItem value="quiz">❓ Quiz</SelectItem>
                        <SelectItem value="assignment">📝 Assignment</SelectItem>
                        <SelectItem value="interactive">🖥️ Interactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="moduleDescription">Description</Label>
                  <Textarea
                    id="moduleDescription"
                    value={moduleDescription}
                    onChange={(e) => setModuleDescription(e.target.value)}
                    placeholder="Describe what this module covers"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedTime">Estimated Time</Label>
                    <Input
                      id="estimatedTime"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="e.g., 30 minutes, 1 hour"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pointsValue">Points Value</Label>
                    <Input
                      id="pointsValue"
                      type="number"
                      value={pointsValue}
                      onChange={(e) => setPointsValue(e.target.value)}
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="content" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Module Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter the main content for this module"
                    rows={10}
                    className="font-mono"
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Resources</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newResource}
                      onChange={(e) => setNewResource(e.target.value)}
                      placeholder="Add resource URL or description"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddResource()}
                    />
                    <Button onClick={handleAddResource} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {resources.map((resource, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <span className="flex-1 text-sm">{resource}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveResource(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRequired"
                      checked={isRequired}
                      onCheckedChange={setIsRequired}
                    />
                    <Label htmlFor="isRequired">This module is required for course completion</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="completionCriteria">Completion Criteria</Label>
                    <Textarea
                      id="completionCriteria"
                      value={completionCriteria}
                      onChange={(e) => setCompletionCriteria(e.target.value)}
                      placeholder="Describe what learners need to do to complete this module"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveModule} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : editingModule ? 'Update Module' : 'Create Module'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module List */}
      <div className="space-y-4">
        {sortedModules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No modules yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your course by adding modules
              </p>
              {canEdit && (
                <Button onClick={handleCreateModule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Module
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedModules.map((module, index) => {
            const isExpanded = expandedModules.has(module.id);
            
            return (
              <Card key={module.id} className={cn(
                "hover:shadow-md transition-all duration-200",
                isExpanded && "ring-2 ring-primary/20"
              )}>
                <CardContent className="p-0">
                  {/* Module Header */}
                  <div 
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleModuleExpansion(module.id)}
                  >
                    <div className="flex items-center gap-3">
                      {canEdit && (
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Module {index + 1}
                        </Badge>
                        {getModuleTypeIcon(module.module_type)}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{module.module_name}</h4>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getModuleTypeColor(module.module_type))}
                        >
                          {module.module_type}
                        </Badge>
                        {module.is_required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {module.module_description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {module.estimated_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {module.estimated_time}
                        </div>
                      )}
                      
                      {canEdit && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditModule(module)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteModule(module.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded Module Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t bg-muted/20">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                        {/* Content Preview */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-sm">Content Preview</h5>
                          <div className="bg-white rounded border p-3 max-h-32 overflow-y-auto">
                            <p className="text-sm text-muted-foreground">
                              {module.content || 'No content available'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Module Details */}
                        <div className="space-y-3">
                          <h5 className="font-medium text-sm">Module Details</h5>
                          <div className="space-y-2 text-sm">
                            {module.points_value && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Points:</span>
                                <span>{module.points_value}</span>
                              </div>
                            )}
                            {module.completion_criteria && (
                              <div>
                                <span className="text-muted-foreground block mb-1">Completion Criteria:</span>
                                <p className="text-xs bg-white rounded border p-2">
                                  {module.completion_criteria}
                                </p>
                              </div>
                            )}
                            {module.resources && module.resources.length > 0 && (
                              <div>
                                <span className="text-muted-foreground block mb-1">Resources:</span>
                                <div className="space-y-1">
                                  {module.resources.map((resource, idx) => (
                                    <div key={idx} className="text-xs bg-white rounded border p-2">
                                      {resource}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};