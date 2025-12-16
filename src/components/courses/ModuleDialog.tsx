import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ModuleContentManager } from './ModuleContentManager';

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

interface ModuleDialogProps {
  courseId: string;
  module: Module | null;
  moduleOrder: number;
  onSave: (module: Module) => void;
  onClose: () => void;
}

export function ModuleDialog({ courseId, module, moduleOrder, onSave, onClose }: ModuleDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    module_name: '',
    module_description: '',
    content_type: 'mixed_content',
    content_url: '',
    content_path: '',
    estimated_duration_minutes: 60
  });

  useEffect(() => {
    if (module) {
      setForm({
        module_name: module.module_name,
        module_description: module.module_description || '',
        content_type: module.content_type || 'mixed_content',
        content_url: module.content_url || '',
        content_path: module.content_path || '',
        estimated_duration_minutes: module.estimated_duration_minutes || 60
      });
    }
  }, [module]);

  const handleSave = async () => {
    if (!user || !form.module_name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const moduleData = {
        ...form,
        course_id: courseId,
        module_order: module ? module.module_order : moduleOrder
      };

      let result;
      if (module) {
        // Update existing module
        const { data, error } = await supabase
          .from('course_modules')
          .update(moduleData)
          .eq('id', module.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new module
        const { data, error } = await supabase
          .from('course_modules')
          .insert(moduleData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      toast({
        title: "Success",
        description: `Module ${module ? 'updated' : 'created'} successfully.`,
      });

      onSave(result);
      onClose();

    } catch (error) {
      console.error('Error saving module:', error);
      toast({
        title: "Error",
        description: `Failed to ${module ? 'update' : 'create'} module. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="contents" disabled={!module}>Content Items</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        <div>
          <Label htmlFor="module_name">Module Name *</Label>
        <Input
          id="module_name"
          value={form.module_name}
          onChange={(e) => setForm({ ...form, module_name: e.target.value })}
          placeholder="e.g., Introduction to React"
        />
      </div>

      <div>
        <Label htmlFor="module_description">Description</Label>
        <Textarea
          id="module_description"
          value={form.module_description}
          onChange={(e) => setForm({ ...form, module_description: e.target.value })}
          placeholder="Brief description of the module"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="content_type">Content Type</Label>
          <Select
            value={form.content_type}
            onValueChange={(value) => setForm({ ...form, content_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mixed_content">Mixed Content</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="link">External Link</SelectItem>
              <SelectItem value="presentation">Presentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="estimated_duration">Duration (minutes)</Label>
          <Input
            id="estimated_duration"
            type="number"
            min="1"
            value={form.estimated_duration_minutes}
            onChange={(e) => setForm({ ...form, estimated_duration_minutes: parseInt(e.target.value) || 60 })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="content_url">Content URL</Label>
        <Input
          id="content_url"
          value={form.content_url}
          onChange={(e) => setForm({ ...form, content_url: e.target.value })}
          placeholder="URL to content (video, document, etc.)"
        />
      </div>

      <div>
        <Label htmlFor="content_path">Content Path</Label>
        <Input
          id="content_path"
          value={form.content_path}
          onChange={(e) => setForm({ ...form, content_path: e.target.value })}
          placeholder="Local path to content file"
        />
      </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : module ? 'Update Module' : 'Add Module'}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="contents">
        {module && (
          <ModuleContentManager 
            moduleId={module.id} 
            onContentsChange={() => {}}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}