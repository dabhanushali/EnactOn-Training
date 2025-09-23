import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredLabel } from '@/components/forms/RequiredLabel';
import { Plus, Trash2, Download, Upload, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ModuleData {
  module_name: string;
  module_description: string;
  content_type: string;
  content_url: string;
  estimated_duration_minutes: number;
  module_order: number;
}

interface BulkModuleCreatorProps {
  courseId: string;
  onModulesCreated: () => void;
}

const CONTENT_TYPES = ['mixed', 'link', 'video', 'pdf', 'text'];

export const BulkModuleCreator = ({ courseId, onModulesCreated }: BulkModuleCreatorProps) => {
  const [modules, setModules] = useState<ModuleData[]>([
    {
      module_name: '',
      module_description: '',
      content_type: 'mixed',
      content_url: '',
      estimated_duration_minutes: 60,
      module_order: 1
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const addModule = () => {
    setModules(prev => [...prev, {
      module_name: '',
      module_description: '',
      content_type: 'mixed',
      content_url: '',
      estimated_duration_minutes: 60,
      module_order: prev.length + 1
    }]);
  };

  const removeModule = (index: number) => {
    if (modules.length > 1) {
      setModules(prev => prev.filter((_, i) => i !== index).map((module, i) => ({
        ...module,
        module_order: i + 1
      })));
    }
  };

  const updateModule = (index: number, field: keyof ModuleData, value: string | number) => {
    setModules(prev => prev.map((module, i) => 
      i === index ? { ...module, [field]: value } : module
    ));
  };

  const generateCsvTemplate = () => {
    const csvContent = [
      'module_name,module_description,content_type,content_url,estimated_duration_minutes',
      'Introduction to React,Learn the basics of React framework,mixed,https://example.com/video1,90',
      'React Components,Understanding React components,mixed,https://example.com/article,60',
      'State Management,Learn about state in React,mixed,https://example.com/guide.pdf,120'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'module_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCsvFile(file);
    }
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      if (!headers.includes('module_name')) {
        toast.error('Invalid CSV format. Please use the provided template.');
        return;
      }

      const parsedModules: ModuleData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3 && values[0]) {
          parsedModules.push({
            module_name: values[0] || '',
            module_description: values[1] || '',
            content_type: values[2] || 'mixed',
            content_url: values[3] || '',
            estimated_duration_minutes: parseInt(values[4]) || 60,
            module_order: i
          });
        }
      }

      if (parsedModules.length > 0) {
        setModules(parsedModules);
        toast.success(`Loaded ${parsedModules.length} modules from CSV`);
      }
    };
    reader.readAsText(file);
  };

  const saveAllModules = async () => {
    if (!courseId) {
      toast.error('No course selected');
      return;
    }

    const validModules = modules.filter(module => 
      module.module_name.trim() && module.module_description.trim()
    );

    if (validModules.length === 0) {
      toast.error('Please add at least one valid module');
      return;
    }

    setLoading(true);

    try {
      const modulesToInsert = validModules.map(module => ({
        course_id: courseId,
        module_name: module.module_name.trim(),
        module_description: module.module_description.trim(),
        content_type: module.content_type,
        content_url: module.content_url.trim() || null,
        estimated_duration_minutes: module.estimated_duration_minutes,
        module_order: module.module_order
      }));

      const { error } = await supabase
        .from('course_modules')
        .insert(modulesToInsert);

      if (error) throw error;

      toast.success(`Successfully created ${validModules.length} modules!`);
      onModulesCreated();
      
      // Reset form
      setModules([{
        module_name: '',
        module_description: '',
        content_type: 'mixed',
        content_url: '',
        estimated_duration_minutes: 60,
        module_order: 1
      }]);
    } catch (error) {
      console.error('Error creating modules:', error);
      toast.error(`Failed to create modules: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CSV Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CSV Bulk Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={generateCsvTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <div className="flex-1">
              <Input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="cursor-pointer"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Download the CSV template, fill it with your module data, then upload it back to bulk create modules.
          </p>
        </CardContent>
      </Card>

      {/* Manual Bulk Creation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Bulk Module Creation
          </CardTitle>
          <Button onClick={addModule} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {modules.map((module, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Module {index + 1}</h3>
                {modules.length > 1 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeModule(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <RequiredLabel htmlFor={`name-${index}`}>
                    Module Name
                  </RequiredLabel>
                  <Input
                    id={`name-${index}`}
                    value={module.module_name}
                    onChange={(e) => updateModule(index, 'module_name', e.target.value)}
                    placeholder="e.g., Introduction to React"
                  />
                </div>

                <div className="space-y-2">
                  <RequiredLabel htmlFor={`type-${index}`}>
                    Content Type
                  </RequiredLabel>
                  <Select
                    value={module.content_type}
                    onValueChange={(value) => updateModule(index, 'content_type', value)}
                  >
                    <SelectTrigger id={`type-${index}`}>
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
                </div>

                <div className="space-y-2 md:col-span-2">
                  <RequiredLabel htmlFor={`desc-${index}`}>
                    Module Description
                  </RequiredLabel>
                  <Textarea
                    id={`desc-${index}`}
                    value={module.module_description}
                    onChange={(e) => updateModule(index, 'module_description', e.target.value)}
                    placeholder="Describe what this module covers..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <RequiredLabel htmlFor={`url-${index}`}>
                    Content URL (Optional)
                  </RequiredLabel>
                  <Input
                    id={`url-${index}`}
                    value={module.content_url}
                    onChange={(e) => updateModule(index, 'content_url', e.target.value)}
                    placeholder="https://example.com/content"
                  />
                </div>

                <div className="space-y-2">
                  <RequiredLabel htmlFor={`duration-${index}`}>
                    Duration (minutes)
                  </RequiredLabel>
                  <Input
                    id={`duration-${index}`}
                    type="number"
                    min="1"
                    value={module.estimated_duration_minutes}
                    onChange={(e) => updateModule(index, 'estimated_duration_minutes', parseInt(e.target.value) || 60)}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={saveAllModules} disabled={loading} size="lg">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating Modules...' : `Create ${modules.filter(m => m.module_name.trim()).length} Modules`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};