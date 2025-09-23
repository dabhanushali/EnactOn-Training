import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BulkModuleCreator } from './BulkModuleCreator';
import { AIModuleGenerator } from './AIModuleGenerator';
import { ModuleDialog } from './ModuleDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, BookOpen, Sparkles, Upload, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CourseModuleData {
  id: string;
  module_name: string;
  module_description: string;
  content_type: string;
  content_url?: string;
  content_path?: string;
  course_id?: string;
  estimated_duration_minutes: number;
  module_order: number;
}

interface EnhancedModuleCreatorProps {
  courseId: string;
}

export const EnhancedModuleCreator = ({ courseId }: EnhancedModuleCreatorProps) => {
  const [modules, setModules] = useState<CourseModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModuleData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModuleData | null>(null);

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('module_order', { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to fetch course modules');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchModules();
    }
  }, [fetchModules, courseId]);

  const handleEditModule = (module: CourseModuleData) => {
    setSelectedModule(module);
    setIsModuleDialogOpen(true);
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;

    try {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleToDelete.id);

      if (error) throw error;
      
      toast.success('Module deleted successfully');
      fetchModules();
    } catch (error) {
      toast.error(`Failed to delete module: ${(error as Error).message}`);
    } finally {
      setIsDeleteDialogOpen(false);
      setModuleToDelete(null);
    }
  };

  const openDeleteDialog = (module: CourseModuleData) => {
    setModuleToDelete(module);
    setIsDeleteDialogOpen(true);
  };

  const handleModuleCreated = () => {
    fetchModules();
    setIsModuleDialogOpen(false);
    setSelectedModule(null);
  };

  const moveModule = async (module: CourseModuleData, direction: 'up' | 'down') => {
    const index = modules.findIndex(m => m.id === module.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= modules.length) return;
    const other = modules[swapIndex];
    try {
      // Swap orders in DB
      await supabase.from('course_modules').update({ module_order: other.module_order }).eq('id', module.id);
      await supabase.from('course_modules').update({ module_order: module.module_order }).eq('id', other.id);
      await fetchModules();
      toast.success('Module order updated');
    } catch (e) {
      toast.error('Failed to reorder modules');
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Modules Overview */}
      {modules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Current Course Modules ({modules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => (
                <Card key={module.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">{module.module_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          Order: {module.module_order}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => moveModule(module, 'up')}
                          disabled={module.module_order === 1}
                        >
                          ↑
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => moveModule(module, 'down')}
                          disabled={module.module_order === modules.length}
                        >
                          ↓
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditModule(module)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openDeleteDialog(module)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {module.module_description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className="capitalize">{module.content_type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{module.estimated_duration_minutes} min</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Creation Tabs */}
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Single Module
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Creation
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Generator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Single Module</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsModuleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Module
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <BulkModuleCreator 
            courseId={courseId} 
            onModulesCreated={fetchModules}
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIModuleGenerator
            courseId={courseId}
            onModulesCreated={fetchModules}
          />
        </TabsContent>
      </Tabs>

      {/* Module Dialog - Use traditional dialog pattern */}
      {isModuleDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-2xl w-full mx-4">
            <ModuleDialog
              courseId={courseId}
              module={selectedModule ? {
                ...selectedModule,
                course_id: courseId,
                content_url: selectedModule.content_url || '',
                content_path: selectedModule.content_path || ''
              } as any : null}
              moduleOrder={modules.length + 1}
              onSave={handleModuleCreated}
              onClose={() => {
                setIsModuleDialogOpen(false);
                setSelectedModule(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{moduleToDelete?.module_name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteModule}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
