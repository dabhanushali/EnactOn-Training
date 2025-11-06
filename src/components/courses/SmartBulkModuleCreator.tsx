import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RequiredLabel } from '@/components/forms/RequiredLabel';
import { Upload, FileText, Link2, Sparkles, Edit, CheckCircle, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ModuleData {
  module_name: string;
  module_description: string;
  content_type: string;
  content_url: string;
  estimated_duration_minutes: number;
  module_order: number;
  edited?: boolean;
}

interface SmartBulkModuleCreatorProps {
  courseId: string;
  onModulesCreated: () => void;
  isAutoGeneration?: boolean;
  onCourseGenerated?: (courseData: any, modulesData: any[]) => void;
}

const CONTENT_TYPES = ['mixed', 'link', 'video', 'pdf', 'text'];

export const SmartBulkModuleCreator = ({ courseId, onModulesCreated, isAutoGeneration, onCourseGenerated }: SmartBulkModuleCreatorProps) => {
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [nextOrderNumber, setNextOrderNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contentInput, setContentInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [inputType, setInputType] = useState<'url' | 'file' | 'text'>('url');
  const [extractedData, setExtractedData] = useState<any | null>(null);

  useEffect(() => {
    fetchNextOrderNumber();
  }, [courseId]);

  const fetchNextOrderNumber = async () => {
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
    } catch (error) {
      console.error('Error fetching modules:', error);
      setNextOrderNumber(1);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.md')) {
      toast.error('Please upload a PDF, TXT, MD, or CSV file');
      return;
    }

    setLoading(true);
    try {
      let content = '';
      
      if (file.type === 'application/pdf') {
        toast.info('Processing PDF... this may take a moment');
        // For PDFs, we'll read as text or use a simple extraction
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result as string;
          await processContent(text || 'PDF content uploaded', file.name);
        };
        reader.readAsText(file);
      } else {
        // For text files, read directly
        const reader = new FileReader();
        reader.onload = async (e) => {
          content = e.target?.result as string;
          await processContent(content, file.name);
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
      setLoading(false);
    }
  };

  const handleUrlProcess = async () => {
    if (!contentInput.trim()) {
      toast.error('Please enter a URL or paste content');
      return;
    }

    setLoading(true);
    try {
      // Check if it's a URL
      if (contentInput.startsWith('http://') || contentInput.startsWith('https://')) {
        await processContent(contentInput, 'URL Content');
      } else {
        // Treat as plain text content
        await processContent(contentInput, 'Text Content');
      }
    } catch (error) {
      console.error('Error processing content:', error);
      toast.error('Failed to process content');
      setLoading(false);
    }
  };

  const processContent = async (content: string, source: string) => {
    try {
      // Use hierarchical extractor that returns modules with sub-modules
      const { data, error } = await supabase.functions.invoke('extract-course-and-modules', {
        body: { content, source }
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to extract course content');
      }

      // Show hierarchical preview (do not save yet)
      setExtractedData(data);
      toast.success(`Extracted ${data.modules?.length || 0} modules. Review and click Save to persist.`);
    } catch (error) {
      console.error('Error extracting content:', error);
      toast.error(`Failed to extract content: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateModule = (index: number, field: keyof ModuleData, value: string | number) => {
    setModules(prev => prev.map((module, i) => 
      i === index ? { ...module, [field]: value, edited: true } : module
    ));
  };

  const deleteModule = (index: number) => {
    setModules(prev => prev.filter((_, i) => i !== index).map((module, i) => ({
      ...module,
      module_order: nextOrderNumber + i
    })));
  };

  const saveModules = async () => {
    if (modules.length === 0) {
      toast.error('No modules to save');
      return;
    }

    const validModules = modules.filter(m => m.module_name.trim() && m.module_description.trim());
    if (validModules.length === 0) {
      toast.error('Please ensure all modules have names and descriptions');
      return;
    }

    setSaving(true);
    try {
      // Helper function to validate external URLs
      const isExternalURL = (url: string): boolean => {
        if (!url) return false;
        try {
          const urlObj = new URL(url.trim());
          const externalDomains = [
            'youtube.com', 'youtu.be', 'vimeo.com', 'loom.com',
            'figma.com', 'drive.google.com', 'docs.google.com',
            'notion.so', 'notion.site', 'clickup.com', 'trello.com',
            'miro.com', 'dropbox.com', 'github.com'
          ];
          return urlObj.protocol.startsWith('http') && 
                 externalDomains.some(domain => urlObj.hostname.includes(domain));
        } catch {
          return false;
        }
      };

      // Helper function to map content types
      const mapContentType = (type: string, contentUrl: string): string => {
        if (!type) return isExternalURL(contentUrl) ? 'External Link' : 'Text';
        
        const lowerType = type.toLowerCase();
        
        // If there's a URL and it's external, prefer External Link
        if (contentUrl && isExternalURL(contentUrl)) {
          return 'External Link';
        }
        
        // Map common variations to standard types
        const typeMap: Record<string, string> = {
          'link': 'External Link',
          'external link': 'External Link',
          'video': 'Video',
          'document': 'Document',
          'pdf': 'Document',
          'assessment': 'Assessment',
          'mixed': 'External Link',
          'text': 'Text'
        };
        
        return typeMap[lowerType] || (contentUrl ? 'External Link' : 'Text');
      };

      const modulesToInsert = validModules.map(module => {
        const contentType = mapContentType(module.content_type, module.content_url);
        
        return {
          course_id: courseId,
          module_name: module.module_name.trim(),
          module_description: module.module_description.trim(),
          content_type: contentType,
          content_url: module.content_url?.trim() || null,
          estimated_duration_minutes: module.estimated_duration_minutes,
          module_order: module.module_order
        };
      });

      const { error } = await supabase
        .from('course_modules')
        .insert(modulesToInsert);

      if (error) throw error;

      toast.success(`Successfully created ${validModules.length} modules!`);
      onModulesCreated();
      
      // Reset
      setModules([]);
      setContentInput('');
      await fetchNextOrderNumber();
    } catch (error) {
      console.error('Error saving modules:', error);
      toast.error(`Failed to save modules: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Module Extractor
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a PDF, paste a Notion link, or enter content - AI will structure it into course modules
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={inputType === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputType('url')}
            >
              <Link2 className="w-4 h-4 mr-2" />
              URL/Link
            </Button>
            <Button
              variant={inputType === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputType('file')}
            >
              <Upload className="w-4 h-4 mr-2" />
              File Upload
            </Button>
            <Button
              variant={inputType === 'text' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setInputType('text')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Text Content
            </Button>
          </div>

          {inputType === 'file' ? (
            <div className="space-y-2">
              <RequiredLabel>Upload File (PDF, TXT, MD, CSV)</RequiredLabel>
              <Input
                type="file"
                accept=".pdf,.txt,.md,.csv,text/plain,text/markdown,application/pdf"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <RequiredLabel>
                {inputType === 'url' ? 'Enter URL (Notion, Google Docs, etc.)' : 'Paste Content'}
              </RequiredLabel>
              <Textarea
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder={
                  inputType === 'url'
                    ? 'https://notion.so/your-page or any URL...'
                    : 'Paste your course content here...'
                }
                rows={6}
                disabled={loading}
              />
              <Button 
                onClick={handleUrlProcess} 
                disabled={loading || !contentInput.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Extract Modules with AI
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hierarchical Preview (Weeks as Modules + Sub-modules) */}
      {extractedData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Extracted Structure</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review the weeks and sub-modules. Click save to add them to this course.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setExtractedData(null)}
              >
                Reset
              </Button>
              <Button onClick={async () => {
                setSaving(true);
                try {
                  // Helper to pack resources and primary URL into a JSON string
                  const packContentUrl = (primaryUrl?: string, resourcesText?: string) => {
                    const links: { name: string; url: string }[] = [];
                    if (resourcesText) {
                      const urlRegex = /(https?:\/\/[^\s)]+)+/gi;
                      const found = resourcesText.match(urlRegex) || [];
                      found.forEach((u: string, i: number) => {
                        try {
                          const host = new URL(u).hostname.replace('www.', '');
                          links.push({ name: host || `Resource ${i + 1}`, url: u });
                        } catch {
                          links.push({ name: `Resource ${i + 1}`, url: u });
                        }
                      });
                    }
                    if (primaryUrl || links.length) {
                      return JSON.stringify({ url: primaryUrl || undefined, links });
                    }
                    return null;
                  };

                  // Determine starting order to append to existing modules
                  const startOrder = nextOrderNumber;

                  // Insert parent modules (weeks)
                  const mainModules = (extractedData.modules || []).map((module: any, idx: number) => ({
                    course_id: courseId,
                    module_name: module.module_name,
                    module_description: module.module_description,
                    content_type: module.content_type,
                    content_url: (module.content_url && module.content_url.trim()) ? module.content_url.trim() : null,
                    estimated_duration_minutes: module.estimated_duration_minutes,
                    module_order: startOrder + idx,
                  }));

                  const { data: insertedParents, error: parentsErr } = await supabase
                    .from('course_modules')
                    .insert(mainModules)
                    .select('id');
                  if (parentsErr) throw parentsErr;

                  // Prepare sub-modules with parent ids
                  const allSubmodules: any[] = [];
                  const baseOrder = startOrder + (extractedData.modules || []).length;
                  let subCounter = 0;
                  (extractedData.modules || []).forEach((module: any, idx: number) => {
                    const parentId = insertedParents?.[idx]?.id;
                    if (!parentId) return;
                    if (module.sub_modules?.length > 0) {
                      module.sub_modules.forEach((sub: any) => {
                        allSubmodules.push({
                          course_id: courseId,
                          parent_module_id: parentId,
                          module_name: sub.sub_module_name,
                          module_description: sub.sub_module_description,
                          content_type: sub.content_type,
                          content_url: packContentUrl(sub.content_url || '', sub.resources || ''),
                          estimated_duration_minutes: sub.estimated_duration_minutes,
                          module_order: baseOrder + (++subCounter),
                        });
                      });
                    }
                  });

                  if (allSubmodules.length > 0) {
                    const { error: subsErr } = await supabase.from('course_modules').insert(allSubmodules);
                    if (subsErr) {
                      // Rollback parents on failure
                      const ids = (insertedParents || []).map((p: any) => p.id);
                      await supabase.from('course_modules').delete().in('id', ids);
                      throw subsErr;
                    }
                  }

                  toast.success(`Saved ${(extractedData.modules?.length || 0)} modules and ${allSubmodules.length} sub-modules`);
                  setExtractedData(null);
                  setModules([]);
                  setContentInput('');
                  await fetchNextOrderNumber();
                  onModulesCreated();
                } catch (err) {
                  console.error('Error saving extracted structure:', err);
                  toast.error(`Failed to save: ${(err as Error).message}`);
                } finally {
                  setSaving(false);
                }
              }} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Modules & Sub-modules'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {extractedData.modules?.map((module: any, idx: number) => (
                <Card key={idx}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-primary">{module.module_name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{module.module_description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Type: {module.content_type}</span>
                      <span>Duration: {module.estimated_duration_minutes}min</span>
                      {module.content_url && <span className="truncate">URL: {module.content_url}</span>}
                    </div>
                    {module.sub_modules?.length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-muted space-y-2">
                        {module.sub_modules.map((sub: any, sidx: number) => (
                          <div key={sidx} className="bg-muted/30 p-3 rounded">
                            <h5 className="font-medium text-sm">{sub.sub_module_name}</h5>
                            <p className="text-xs text-muted-foreground mt-1">{sub.sub_module_description}</p>
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              <span>Type: {sub.content_type}</span>
                              <span>Duration: {sub.estimated_duration_minutes}min</span>
                            </div>
                            {sub.content_url && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">URL: {sub.content_url}</p>
                            )}
                            {sub.resources && (
                              <p className="text-xs text-muted-foreground mt-1">Resources: {sub.resources.slice(0, 120)}...</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview and Edit Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Extracted Modules</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Review and edit the extracted modules before saving
              </p>
            </div>
            <Button onClick={saveModules} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : `Save ${modules.length} Modules`}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {modules.map((module, index) => (
              <Card key={index} className={`p-4 ${module.edited ? 'border-warning' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Module {module.module_order}</h4>
                    {module.edited && (
                      <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">
                        Edited
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    >
                      {editingIndex === index ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Edit className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteModule(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <RequiredLabel>Module Name</RequiredLabel>
                    {editingIndex === index ? (
                      <Input
                        value={module.module_name}
                        onChange={(e) => updateModule(index, 'module_name', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium">{module.module_name}</p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <RequiredLabel>Description</RequiredLabel>
                    {editingIndex === index ? (
                      <Textarea
                        value={module.module_description}
                        onChange={(e) => updateModule(index, 'module_description', e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{module.module_description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Content Type</label>
                    {editingIndex === index ? (
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
                    ) : (
                      <p className="text-sm capitalize">{module.content_type}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration (minutes)</label>
                    {editingIndex === index ? (
                      <Input
                        type="number"
                        value={module.estimated_duration_minutes}
                        onChange={(e) => updateModule(index, 'estimated_duration_minutes', parseInt(e.target.value) || 60)}
                        min={1}
                      />
                    ) : (
                      <p className="text-sm">{module.estimated_duration_minutes} min</p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Content URL (Optional)</label>
                    {editingIndex === index ? (
                      <Input
                        value={module.content_url}
                        onChange={(e) => updateModule(index, 'content_url', e.target.value)}
                        placeholder="https://..."
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground truncate">
                        {module.content_url || 'No URL'}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
