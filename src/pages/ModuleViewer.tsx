import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  ArrowRight,
  Clock, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Download,
  Play,
  BookOpen,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ModuleViewer() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [module, setModule] = useState(null);
  const [course, setCourse] = useState(null);
  const [allModules, setAllModules] = useState([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [readingTime, setReadingTime] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());

  const fetchModuleData = useCallback(async () => {
    if (courseId && moduleId && profile?.id) {
      try {
        // Fetch current module details
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
          .select('*')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        // Fetch all modules for navigation
        const { data: allModulesData, error: modulesError } = await supabase
          .from('course_modules')
          .select('id, module_name, module_order, module_type, estimated_duration_minutes')
          .eq('course_id', courseId)
          .order('module_order');

        if (modulesError) throw modulesError;

        const currentIndex = allModulesData.findIndex(m => m.id === moduleId);
        
        setModule(moduleData);
        setCourse(courseData);
        setAllModules(allModulesData);
        setCurrentModuleIndex(currentIndex);
        setStartTime(Date.now());

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

  // Track reading time
  useEffect(() => {
    const interval = setInterval(() => {
      setReadingTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleMarkComplete = async () => {
    try {
      // Here you would implement module completion tracking
      // For now, we'll just show a success message
      setIsCompleted(true);
      toast({
        title: "Module Completed!",
        description: "Great job! You've completed this module."
      });
    } catch (error) {
      console.error('Error marking module complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark module as complete",
        variant: "destructive"
      });
    }
  };

  const handleNextModule = () => {
    if (currentModuleIndex < allModules.length - 1) {
      const nextModule = allModules[currentModuleIndex + 1];
      navigate(`/courses/${courseId}/modules/${nextModule.id}`);
    }
  };

  const handlePreviousModule = () => {
    if (currentModuleIndex > 0) {
      const prevModule = allModules[currentModuleIndex - 1];
      navigate(`/courses/${courseId}/modules/${prevModule.id}`);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m ${seconds % 60}s`;
  };

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

    const { content_type, content_url, content_path, content } = module;

    // If there's text content, show it
    if (content) {
      return (
        <div className="prose max-w-none">
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {content}
          </div>
        </div>
      );
    }

    let primaryUrl = '';
    let additionalLinks: { name: string; url: string }[] = [];

    if (content_type === 'mixed' && content_url) {
      try {
        const parsed = JSON.parse(content_url);
        primaryUrl = parsed.url;
        additionalLinks = parsed.links || [];
      } catch {
        primaryUrl = content_url;
      }
    } else if (['link', 'url', 'video', 'pdf'].includes(content_type)) {
      primaryUrl = content_url;
    }

    const embedUrl = getEmbedUrl(primaryUrl);

    return (
      <div className="space-y-8">
        {/* Primary Content */}
        {primaryUrl && (
          <div className="space-y-4">
            {content_type === 'video' && embedUrl !== primaryUrl ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={embedUrl}
                  title={module.module_name}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="p-8 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-4 rounded-full bg-primary/10">
                      <LinkIcon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">External Content</h3>
                  <p className="text-muted-foreground mb-4">Click the button below to access the module content</p>
                  <Button asChild size="lg" className="font-semibold">
                    <a href={primaryUrl} target="_blank" rel="noopener noreferrer">
                      <Play className="w-5 h-5 mr-2" />
                      Open Content
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Additional Resources */}
        {additionalLinks.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Download className="w-5 h-5 mr-2 text-primary" />
              Additional Resources
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {additionalLinks.map((link, index) => (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <LinkIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{link.name}</h4>
                          <p className="text-xs text-muted-foreground">External Resource</p>
                        </div>
                      </div>
                      <Button asChild variant="outline" className="group-hover:bg-primary group-hover:text-white transition-all">
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* File Downloads */}
        {content_path && (() => {
            try {
              const parsed = JSON.parse(content_path);
              return parsed.files && parsed.files.length > 0 ? (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Download className="w-5 h-5 mr-2 text-primary" />
                    Downloads
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {parsed.files.map((file: any, i: number) => (
                      <Card key={i} className="group hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
                                <Download className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{file.name}</h4>
                                <p className="text-xs text-muted-foreground">Downloadable File</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null;
            } catch { return null; }
        })()}

        {/* If no external content, show text content nicely formatted */}
        {!content_url && !content_path && module.content && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none">
                <div className="text-foreground leading-relaxed space-y-6">
                  {module.content.split('\n\n').map((paragraph: string, index: number) => (
                    <p key={index} className="text-base leading-7">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Content Message */}
        {!content_url && !content_path && !module.content && (
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No Content Available</h3>
              <p className="text-muted-foreground">This module doesn't have any content yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-48 bg-muted rounded-lg"></div>
              <div className="h-48 bg-muted rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!module || !course) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <MainNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(`/courses/${courseId}`)} className="mb-6 hover:bg-muted/50">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {course.course_name}
        </Button>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Module Header */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                        <ContentIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold">{module.module_name}</CardTitle>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="bg-white/20 border-white/30 text-white">
                            Module {module.module_order}
                          </Badge>
                          <Badge variant="secondary" className="bg-white/20 border-white/30 text-white">
                            {module.content_type}
                          </Badge>
                          {module.estimated_duration_minutes && (
                            <Badge variant="secondary" className="bg-white/20 border-white/30 text-white">
                              <Clock className="h-3 w-3 mr-1" />
                              {module.estimated_duration_minutes} min
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {module.module_description && (
                      <p className="text-white/90 leading-relaxed">{module.module_description}</p>
                    )}
                  </div>
                  
                  {/* Reading Stats */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[200px] text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {formatTime(readingTime)}
                    </div>
                    <p className="text-white/80 text-sm">Time Spent</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Module Content */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <ContentIcon className="h-6 w-6 mr-3 text-primary" />
                  Module Content
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {renderContent()}
              </CardContent>
            </Card>

            {/* Module Navigation and Completion */}
            <Card className="border-0 shadow-xl sticky bottom-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* Module Navigation */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousModule}
                        disabled={currentModuleIndex <= 0}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                      <div className="px-3 py-2 bg-muted rounded-lg">
                        <span className="text-sm font-medium">
                          Module {currentModuleIndex + 1} of {allModules.length}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextModule}
                        disabled={currentModuleIndex >= allModules.length - 1}
                      >
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>

                  {/* Completion Button */}
                  <Button
                    onClick={handleMarkComplete}
                    disabled={isCompleted}
                    className={cn(
                      "font-semibold px-6",
                      isCompleted 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {isCompleted ? 'Completed ✓' : 'Mark as Complete'}
                  </Button>
                </div>

                {/* Module Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Course Progress</span>
                    <span>{currentModuleIndex + 1} / {allModules.length} modules</span>
                  </div>
                  <Progress value={((currentModuleIndex + 1) / allModules.length) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Module Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-8">
              <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white">
                <CardTitle className="flex items-center text-lg">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Course Modules
                </CardTitle>
              </CardHeader>
              <ScrollArea className="h-96">
                <CardContent className="p-0">
                  <div className="space-y-1 p-2">
                    {allModules.map((mod, index) => {
                      const ModuleIcon = getContentIcon(mod.module_type);
                      const isCurrent = mod.id === moduleId;
                      
                      return (
                        <Button
                          key={mod.id}
                          variant={isCurrent ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start h-auto p-3 transition-all duration-200",
                            isCurrent && "bg-primary text-white shadow-md"
                          )}
                          onClick={() => navigate(`/courses/${courseId}/modules/${mod.id}`)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className={cn(
                              "p-1.5 rounded-md flex-shrink-0",
                              isCurrent ? "bg-white/20" : "bg-muted"
                            )}>
                              <ModuleIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-sm truncate">
                                {index + 1}. {mod.module_name}
                              </div>
                              {mod.estimated_duration_minutes && (
                                <div className="text-xs opacity-70 mt-1">
                                  {mod.estimated_duration_minutes} min
                                </div>
                              )}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}