import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, FileText, Video, Link as LinkIcon, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { useToast } from '@/hooks/use-toast';

export default function ModuleViewer() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  
  const [module, setModule] = useState(null);
  const [course, setCourse] = useState(null);
  const [moduleContents, setModuleContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

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

        // Fetch module contents
        const { data: contentsData, error: contentsError } = await supabase
          .from('module_contents')
          .select('*')
          .eq('module_id', moduleId)
          .order('content_order');

        if (!contentsError && contentsData) {
          setModuleContents(contentsData);
        }

        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('course_name')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        // Fetch module progress
        const { data: progressData } = await supabase
          .from('module_progress')
          .select('completed')
          .eq('module_id', moduleId)
          .eq('employee_id', profile.id)
          .maybeSingle();

        setIsCompleted(progressData?.completed || false);
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

  const handleMarkComplete = async () => {
    if (!user || !moduleId || !courseId) return;
    
    try {
      setMarkingComplete(true);
      
      // Check if progress record exists
      const { data: existing } = await supabase
        .from('module_progress')
        .select('id')
        .eq('module_id', moduleId)
        .eq('employee_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('module_progress')
          .update({
            completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('module_progress')
          .insert({
            employee_id: user.id,
            module_id: moduleId,
            course_id: courseId,
            completed: true,
            completed_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }

      setIsCompleted(true);
      toast({
        title: "Module Completed!",
        description: "Your progress has been saved.",
      });
    } catch (error: any) {
      console.error('Error marking module complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark module as complete",
        variant: "destructive"
      });
    } finally {
      setMarkingComplete(false);
    }
  };

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

    // If module has multiple contents, show them
    if (moduleContents && moduleContents.length > 0) {
      return (
        <div className="space-y-4">
          {moduleContents.map((content, index) => (
            <Card key={content.id}>
              <CardHeader>
                 <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = getContentIcon(content.content_type);
                        return <Icon className="h-5 w-5" />;
                      })()}
                      <CardTitle className="text-xl">{content.content_title}</CardTitle>
                    </div>
                    {content.content_description && (
                      <p className="text-sm text-muted-foreground">{content.content_description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{content.content_type}</Badge>
                    {content.estimated_duration_minutes && (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {content.estimated_duration_minutes} min
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {content.content_type === 'Video' && content.content_url && (
                  <div className="aspect-video">
                    <iframe
                      src={getEmbedUrl(content.content_url)}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      title={content.content_title}
                    />
                  </div>
                )}
                {content.content_type !== 'Video' && content.content_url && (() => {
                  const urls = content.content_url.split('\n').filter(url => url.trim());
                  
                  if (urls.length === 0) {
                    return (
                      <p className="text-muted-foreground text-sm">No resources available</p>
                    );
                  }
                  
                  if (urls.length === 1) {
                    return (
                      <Button asChild className="w-full">
                        <a href={urls[0]} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open {content.content_type}
                        </a>
                      </Button>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground mb-3">
                        {urls.length} Resources Available
                      </p>
                      <div className="grid gap-2">
                        {urls.map((url, idx) => (
                          <Button
                            key={idx}
                            asChild
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Resource {idx + 1}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {content.content_type !== 'Video' && !content.content_url && (
                  <p className="text-muted-foreground text-sm">No resources available</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

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
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <LinkIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold text-lg">Primary Content</span>
                    <p className="text-sm text-muted-foreground">Click to access the main learning material</p>
                  </div>
                </div>
                <Button asChild size="lg" className="gap-2">
                  <a href={primaryUrl} target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="w-4 h-4" />
                    Open Content
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-16 bg-muted/50 rounded-lg border-2 border-dashed">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground text-lg font-medium">No primary content available</p>
            <p className="text-sm text-muted-foreground/70">Content will be added soon</p>
          </div>
        )}

        {additionalLinks.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-primary" />
              Additional Resources
            </h3>
            <div className="grid gap-3">
              {additionalLinks.map((link, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <LinkIcon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-base">{link.name}</span>
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <LinkIcon className="w-3 h-3" />
                        Open
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
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <MainNav />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/courses/${courseId}`)} 
          className="mb-6 gap-2 hover:gap-3 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {course.course_name}
        </Button>

        {/* Module Header */}
        <Card className="mb-8 border-none shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8">
            <div className="flex items-start justify-between gap-6 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    Module {module.module_order}
                  </Badge>
                  <Badge variant="secondary" className="text-sm gap-1 px-3 py-1">
                    <ContentIcon className="h-3 w-3" />
                    {module.content_type}
                  </Badge>
                  {module.estimated_duration_minutes && (
                    <Badge variant="outline" className="text-sm gap-1 px-3 py-1">
                      <Clock className="h-3 w-3" />
                      {module.estimated_duration_minutes} min
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {module.module_name}
                </CardTitle>
                {module.module_description && (
                  <p className="text-muted-foreground text-lg leading-relaxed">{module.module_description}</p>
                )}
              </div>
              <div className="p-4 rounded-2xl bg-primary/10 shrink-0">
                <ContentIcon className="h-10 w-10 text-primary" />
              </div>
            </div>
          </div>
        </Card>

        {/* Module Content */}
        <Card className="shadow-lg">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <ContentIcon className="h-6 w-6 text-primary" />
              </div>
              Module Content
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {renderContent()}
          </CardContent>
        </Card>

        {/* Mark as Complete Button */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-lg font-medium text-green-600">Module Completed</span>
                  </>
                ) : (
                  <span className="text-lg font-medium text-muted-foreground">
                    Finished reviewing this module?
                  </span>
                )}
              </div>
              {!isCompleted && (
                <Button 
                  onClick={handleMarkComplete}
                  disabled={markingComplete}
                  size="lg"
                  className="gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  {markingComplete ? 'Saving...' : 'Mark as Complete'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}