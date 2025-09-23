import { useState, useEffect,useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, FileText, Video, Link as LinkIcon, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { useToast } from '@/hooks/use-toast';

export default function ModuleViewer() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [module, setModule] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchModuleData = useCallback(async () => {
    if (courseId && moduleId && profile?.id) {
      try {
        // Fetch module details
        const { data: moduleData, error: moduleError } = await supabase
          .from('course_modules')
          .select('*')
          .eq('id', moduleId)
          .eq('course_id', courseId)
          .single();

        if (moduleError) throw moduleError;

        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('course_name')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        setModule(moduleData);
        setCourse(courseData);
      } catch (error: any) {
        console.error('Error fetching module data:', error);
        toast({
          title: "Error",
          description: "Failed to load module content",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  }, [courseId, moduleId, profile?.id, toast]);

  useEffect(() => {
    fetchModuleData();
  }, [fetchModuleData]);

  const getContentIcon = (contentType: string) => {
    switch (contentType?.toLowerCase()) {
      case 'video':
        return Video;
      case 'document':
      case 'pdf':
        return FileText;
      case 'link':
      case 'url':
        return LinkIcon;
      default:
        return FileText;
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('watch')) {
        const videoId = urlObj.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }
      if (urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.pathname.slice(1);
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      }
    } catch (error) {
      console.error("Invalid URL for embedding:", error);
      return url;
    }
    return url;
  };

  const renderContent = () => {
    if (!module) return null;

    const { content_type, content_url, content_path } = module;

    let primaryUrl = '';
    let additionalLinks: { name: string; url: string }[] = [];

    if (content_type === 'mixed' && content_url) {
      try {
        const parsed = JSON.parse(content_url);
        primaryUrl = parsed.url;
        additionalLinks = parsed.links || [];
      } catch {
        primaryUrl = content_url; // Fallback for non-JSON
      }
    } else if (['link', 'url', 'video', 'pdf'].includes(content_type)) {
      primaryUrl = content_url;
    }

    const embedUrl = getEmbedUrl(primaryUrl);

    return (
      <div className="space-y-6">
        {primaryUrl ? (
          <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Module Content"
            />
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">No primary content for this module.</p>
          </div>
        )}

        {additionalLinks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Additional Resources</h3>
            <div className="space-y-2">
              {additionalLinks.map((link, index) => (
                <Card key={index}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{link.name}</span>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        Open Link
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {content_path && (() => {
            try {
              const parsed = JSON.parse(content_path);
              return parsed.files && parsed.files.length > 0 ? (
                <div className="pt-2">
                  <h3 className="text-lg font-semibold mb-3">Downloads</h3>
                  <div className="space-y-2">
                    {parsed.files.map((file: any, i: number) => (
                      <Card key={i}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Download className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{file.name}</span>
                          </div>
                          {/* In a real app, this would trigger a download, not open a URL */}
                          <Button variant="outline" size="sm" disabled>
                            Download
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null;
            } catch { return null; }
        })()}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!module || !course) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(`/courses/${courseId}`)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Module not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const ContentIcon = getContentIcon(module.content_type);

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(`/courses/${courseId}`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {course.course_name}
        </Button>

        {/* Module Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{module.module_name}</CardTitle>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">
                    Module {module.module_order}
                  </Badge>
                  <Badge variant="secondary">
                    <ContentIcon className="h-3 w-3 mr-1" />
                    {module.content_type}
                  </Badge>
                  {module.estimated_duration_minutes && (
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {module.estimated_duration_minutes} min
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {module.module_description && (
              <p className="text-muted-foreground mb-6">{module.module_description}</p>
            )}
          </CardContent>
        </Card>

        {/* Module Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ContentIcon className="h-5 w-5 mr-2" />
              Module Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}