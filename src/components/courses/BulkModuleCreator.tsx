import { useState, useEffect } from 'react';
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
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Fetch existing modules to determine next order number
  useEffect(() => {
    const fetchExistingModules = async () => {
      if (!courseId) return;
      
      try {
        const { data, error } = await supabase
          .from('course_modules')
          .select('module_order')
          .eq('course_id', courseId)
          .order('module_order', { ascending: false })
          .limit(1);

        if (error) throw error;
        
        const maxOrder = data && data.length > 0 ? data[0].module_order : 0;
        setNextOrderNumber(maxOrder + 1);
        
        // Initialize with first module if none exist
        if (modules.length === 0) {
          setModules([{
            module_name: '',
            module_description: '',
            content_type: 'mixed',
            content_url: '',
            estimated_duration_minutes: 60,
            module_order: maxOrder + 1
          }]);
        }
      } catch (error) {
        console.error('Error fetching existing modules:', error);
        setNextOrderNumber(1);
        if (modules.length === 0) {
          setModules([{
            module_name: '',
            module_description: '',
            content_type: 'mixed',
            content_url: '',
            estimated_duration_minutes: 60,
            module_order: 1
          }]);
        }
      }
    };

    fetchExistingModules();
  }, [courseId, modules.length]);

  const addModule = () => {
    setModules(prev => [...prev, {
      module_name: '',
      module_description: '',
      content_type: 'mixed',
      content_url: '',
      estimated_duration_minutes: 60,
      module_order: nextOrderNumber + prev.length
    }]);
  };

  const removeModule = (index: number) => {
    if (modules.length > 1) {
      setModules(prev => prev.filter((_, i) => i !== index).map((module, i) => ({
        ...module,
        module_order: nextOrderNumber + i
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
      '"Introduction to Programming","Learn basic programming concepts","mixed","https://example.com/intro",60',
      '"Variables and Data Types","Understanding variables and data types","video","https://example.com/variables",45',
      '"Control Structures","Learn about loops and conditionals","text","",90'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'module_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const csv = e.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const parsedModules: ModuleData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        
        if (values.length >= 5) {
          parsedModules.push({
            module_name: values[0] || '',
            module_description: values[1] || '',
            content_type: values[2] || 'mixed',
            content_url: values[3] || '',
            estimated_duration_minutes: parseInt(values[4]) || 60,
            module_order: nextOrderNumber + i - 1
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
      
      // Reset form with updated order number
      const newNextOrder = nextOrderNumber + validModules.length;
      setNextOrderNumber(newNextOrder);
      setModules([{
        module_name: '',
        module_description: '',
        content_type: 'mixed',
        content_url: '',
        estimated_duration_minutes: 60,
        module_order: newNextOrder
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
      {/* CSV Bulk Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            CSV Bulk Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={generateCsvTemplate} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                id="csv-upload"
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV File
                </label>
              </Button>
            </div>
          </div>
          {csvFile && (
            <p className="text-sm text-muted-foreground">
              Loaded file: {csvFile.name}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manual Bulk Creation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Manual Bulk Creation</span>
            <Button onClick={addModule} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {modules.map((module, index) => (
            <Card key={index} className="p-4">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-medium text-sm">Module {module.module_order}</h4>
                {modules.length > 1 && (
                  <Button
                    onClick={() => removeModule(index)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <RequiredLabel htmlFor={`module_name_${index}`}>
                    Module Name
                  </RequiredLabel>
                  <Input
                    id={`module_name_${index}`}
                    value={module.module_name}
                    onChange={(e) => updateModule(index, 'module_name', e.target.value)}
                    placeholder="Enter module name"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor={`content_type_${index}`} className="text-sm font-medium">
                    Content Type
                  </label>
                  <Select 
                    value={module.content_type} 
                    onValueChange={(value) => updateModule(index, 'content_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <RequiredLabel htmlFor={`module_description_${index}`}>
                    Module Description
                  </RequiredLabel>
                  <Textarea
                    id={`module_description_${index}`}
                    value={module.module_description}
                    onChange={(e) => updateModule(index, 'module_description', e.target.value)}
                    placeholder="Describe the module content and objectives"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor={`content_url_${index}`} className="text-sm font-medium">
                    Content URL (Optional)
                  </label>
                  <Input
                    id={`content_url_${index}`}
                    value={module.content_url}
                    onChange={(e) => updateModule(index, 'content_url', e.target.value)}
                    placeholder="https://example.com/content"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor={`duration_${index}`} className="text-sm font-medium">
                    Duration (minutes)
                  </label>
                  <Input
                    id={`duration_${index}`}
                    type="number"
                    value={module.estimated_duration_minutes}
                    onChange={(e) => updateModule(index, 'estimated_duration_minutes', parseInt(e.target.value) || 60)}
                    min={1}
                    max={600}
                  />
                </div>
              </div>
            </Card>
          ))}

          <Button 
            onClick={saveAllModules} 
            disabled={loading}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating Modules...' : `Create ${modules.filter(m => m.module_name.trim() && m.module_description.trim()).length} Modules`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkModuleCreator;