import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkModuleCreator } from "./BulkModuleCreator";
import { AIModuleGenerator } from "./AIModuleGenerator";
import { SmartBulkModuleCreator } from "./SmartBulkModuleCreator";
import { ModuleDialog } from "./ModuleDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, BookOpen, Sparkles, Upload, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
  content_type?: string;
  content_url?: string;
  content_path?: string;
  course_id?: string;
  estimated_duration_minutes?: number;
  module_order: number;
}
interface ModuleContentData {
  id: string;
  content_title: string;
  content_type: string;
  content_url?: string;
  estimated_duration_minutes: number;
}

// NEW: Interface for the parent module holding the content
interface ModuleWithContents {
  id: string;
  module_name: string;
  module_description: string;
  module_order: number;
  content_type?: string;
  estimated_duration_minutes?: number;
  module_contents: ModuleContentData[]; // Array of child content
}

interface EnhancedModuleCreatorProps {
  courseId: string;
}

export const EnhancedModuleCreator = ({
  courseId,
}: EnhancedModuleCreatorProps) => {
  const [modules, setModules] = useState<ModuleWithContents[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  // Use the correct, nested interface for the selected module
  const [selectedModule, setSelectedModule] =
    useState<ModuleWithContents | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<CourseModuleData | null>(
    null
  );

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      // (Around line 51)
      const { data, error } = await supabase
        .from("course_modules")
        .select(
          `
          id,
          module_name,
          module_description,
          module_order,
          module_contents ( * )
          `
        )
        .eq("course_id", courseId)
        .order("module_order", { ascending: true });
      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast.error("Failed to fetch course modules");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      fetchModules();
    }
  }, [fetchModules, courseId]);

  const handleEditModule = (module: ModuleWithContents) => {
    setSelectedModule(module);
    setIsModuleDialogOpen(true);
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;

    try {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleToDelete.id);

      if (error) throw error;

      toast.success("Module deleted successfully");
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

  const moveModule = async (
    module: CourseModuleData,
    direction: "up" | "down"
  ) => {
    const index = modules.findIndex((m) => m.id === module.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= modules.length) return;

    const other = modules[swapIndex];

    try {
      // Use a temporary negative value to avoid unique constraint violations
      const tempOrder = -Math.abs(module.module_order);

      // Step 1: Set first module to temporary order
      await supabase
        .from("course_modules")
        .update({ module_order: tempOrder })
        .eq("id", module.id);

      // Step 2: Set second module to first module's original order
      await supabase
        .from("course_modules")
        .update({ module_order: module.module_order })
        .eq("id", other.id);

      // Step 3: Set first module to second module's original order
      await supabase
        .from("course_modules")
        .update({ module_order: other.module_order })
        .eq("id", module.id);

      await fetchModules();
      toast.success("Module order updated");
    } catch (error) {
      console.error("Error reordering modules:", error);
      toast.error("Failed to reorder modules");
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
            <div className="space-y-4">
              {modules.map((module) => (
                <Card key={module.id} className="w-full">
                  <CardHeader className="bg-muted/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-md">
                          {module.module_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {module.module_description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" disabled>
                          ↑
                        </Button>{" "}
                        {/* Reordering is more complex, disable for now */}
                        <Button variant="ghost" size="sm" disabled>
                          ↓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditModule(module)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(module)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <h5 className="text-sm font-medium">
                      Content Items ({module.module_contents.length})
                    </h5>
                    {module.module_contents.length > 0 ? (
                      module.module_contents.map((content) => (
                        <div
                          key={content.id}
                          className="flex items-center justify-between p-2 border rounded-md"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {content.content_title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {content.content_url || "No URL"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <Badge variant="outline">
                              {content.content_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {content.estimated_duration_minutes} min
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled
                              title="Editing individual content items coming soon"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No content items in this module.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Creation Tabs */}
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Single
          </TabsTrigger>
          <TabsTrigger value="smart" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Smart Extract
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            CSV Bulk
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

        <TabsContent value="smart" className="mt-6">
          <SmartBulkModuleCreator
            courseId={courseId}
            onModulesCreated={fetchModules}
          />
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
          <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{selectedModule ? 'Edit Module' : 'Create Module'}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsModuleDialogOpen(false);
                  setSelectedModule(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
            <ModuleDialog
              courseId={courseId}
              module={
                selectedModule
                  ? {
                      // Adapt the new structure back to the old one for the dialog
                      id: selectedModule.id,
                      module_name: selectedModule.module_name,
                      module_description: selectedModule.module_description,
                      module_order: selectedModule.module_order,
                      course_id: courseId,
                      // Provide default values for fields that exist on the old type
                      content_type: selectedModule.content_type || "",
                      content_url: "",
                      content_path: "",
                      estimated_duration_minutes: selectedModule.estimated_duration_minutes || 0,
                    }
                  : null
              }
              moduleOrder={modules.length + 1}
              onSave={handleModuleCreated}
              onClose={() => {
                setIsModuleDialogOpen(false);
                setSelectedModule(null);
              }}
            />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
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
            <AlertDialogAction onClick={handleDeleteModule}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
