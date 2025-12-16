import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, ExternalLink, Video, FileText, File, X } from 'lucide-react';

interface ModuleContent {
  id?: string;
  module_id: string;
  content_title: string;
  content_description: string;
  content_url: string;
  content_type: string;
  content_order: number;
  estimated_duration_minutes: number;
}

interface ModuleContentManagerProps {
  moduleId: string;
  onContentsChange?: () => void;
}

export function ModuleContentManager({ moduleId, onContentsChange }: ModuleContentManagerProps) {
  const { toast } = useToast();
  const [contents, setContents] = useState<ModuleContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchContents();
  }, [moduleId]);

  const fetchContents = async () => {
    try {
      const { data, error } = await supabase
        .from('module_contents')
        .select('*')
        .eq('module_id', moduleId)
        .order('content_order');

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
    }
  };

  const addNewContent = () => {
    const newContent: ModuleContent = {
      module_id: moduleId,
      content_title: '',
      content_description: '',
      content_url: '',
      content_type: 'External Link',
      content_order: contents.length + 1,
      estimated_duration_minutes: 15
    };
    setContents([...contents, newContent]);
    setEditingIndex(contents.length);
  };

  const updateContent = (index: number, field: keyof ModuleContent, value: any) => {
    const updated = [...contents];
    updated[index] = { ...updated[index], [field]: value };
    setContents(updated);
  };

  const saveContent = async (index: number) => {
    const content = contents[index];
    
    if (!content.content_title || !content.content_url) {
      toast({
        title: "Error",
        description: "Title and URL are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      if (content.id) {
        // Update existing
        const { error } = await supabase
          .from('module_contents')
          .update({
            content_title: content.content_title,
            content_description: content.content_description,
            content_url: content.content_url,
            content_type: content.content_type,
            content_order: content.content_order,
            estimated_duration_minutes: content.estimated_duration_minutes
          })
          .eq('id', content.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('module_contents')
          .insert([content])
          .select()
          .single();

        if (error) throw error;
        
        // Update with the new ID
        const updated = [...contents];
        updated[index] = data;
        setContents(updated);
      }

      toast({
        title: "Success",
        description: "Content saved successfully.",
      });
      
      setEditingIndex(null);
      onContentsChange?.();
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Error",
        description: "Failed to save content.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteContent = async (index: number) => {
    const content = contents[index];
    
    if (content.id) {
      try {
        const { error } = await supabase
          .from('module_contents')
          .delete()
          .eq('id', content.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Content deleted successfully.",
        });
      } catch (error) {
        console.error('Error deleting content:', error);
        toast({
          title: "Error",
          description: "Failed to delete content.",
          variant: "destructive",
        });
        return;
      }
    }

    const updated = contents.filter((_, i) => i !== index);
    setContents(updated);
    onContentsChange?.();
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'Video': return <Video className="h-4 w-4" />;
      case 'PDF': return <FileText className="h-4 w-4" />;
      case 'External Link': return <ExternalLink className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Content Items</h3>
        <Button onClick={addNewContent} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Content
        </Button>
      </div>

      {contents.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No content items yet. Click "Add Content" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contents.map((content, index) => (
            <Card key={content.id || index}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {getContentIcon(content.content_type)}
                    <CardTitle className="text-base">
                      {content.content_title || 'New Content'}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteContent(index)}
                      title="Delete content"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {editingIndex === index ? (
                      <>
                        <Button 
                          onClick={() => {
                            // If new content (no id), just remove it from array
                            if (!content.id) {
                              const updated = contents.filter((_, i) => i !== index);
                              setContents(updated);
                            }
                            setEditingIndex(null);
                          }} 
                          variant="ghost" 
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => saveContent(index)} 
                          size="sm"
                          disabled={loading}
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          onClick={() => setEditingIndex(index)} 
                          variant="outline" 
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button 
                          onClick={() => deleteContent(index)} 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              {editingIndex === index && (
                <CardContent className="space-y-4">
                  <div>
                    <Label>Content Title *</Label>
                    <Input
                      value={content.content_title}
                      onChange={(e) => updateContent(index, 'content_title', e.target.value)}
                      placeholder="e.g., Introduction Video"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={content.content_description}
                      onChange={(e) => updateContent(index, 'content_description', e.target.value)}
                      placeholder="Brief description of this content"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Content Type</Label>
                      <Select
                        value={content.content_type}
                        onValueChange={(value) => updateContent(index, 'content_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="External Link">External Link</SelectItem>
                          <SelectItem value="Video">Video</SelectItem>
                          <SelectItem value="PDF">PDF</SelectItem>
                          <SelectItem value="Text">Text</SelectItem>
                          <SelectItem value="Document">Document</SelectItem>
                          <SelectItem value="Presentation">Presentation</SelectItem>
                          <SelectItem value="Assignment">Assignment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={content.estimated_duration_minutes}
                        onChange={(e) => updateContent(index, 'estimated_duration_minutes', parseInt(e.target.value) || 15)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Content URL *</Label>
                    <Input
                      value={content.content_url}
                      onChange={(e) => updateContent(index, 'content_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
