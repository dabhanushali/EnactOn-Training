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
        // Fetch current module details - using correct column names
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

        // Fetch all modules for navigation - using correct column names
        const { data: allModulesData, error: modulesError } = await supabase
          .from('course_modules')
          .select('id, module_name, module_order, content_type, estimated_duration_minutes')
          .eq('course_id', courseId)
          .order('module_order');

        if (modulesError) throw modulesError;

        const currentIndex = allModulesData?.findIndex(m => m.id === moduleId) || 0;
        
        setModule(moduleData);
        setCourse(courseData);
        setAllModules(allModulesData || []);
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

  const renderContent = () => {
    if (!module) return null;

    const { content_type, content_url, content_path, content } = module;

    // If there's text content, show it
    if (content) {
      return (
        <Card className="border shadow-sm">
          <CardContent className="p-8">
            <div className="prose prose-lg max-w-none">
              <div className="text-foreground leading-relaxed space-y-6">
                {content.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="text-base leading-7">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Handle external URLs
    if (content_url) {
      return (
        <Card className="border shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 rounded-full bg-primary/10">
                <LinkIcon className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">External Content</h3>
            <p className="text-muted-foreground mb-4">Click the button below to access the module content</p>
            <Button asChild size="lg">
              <a href={content_url} target="_blank" rel="noopener noreferrer">
                <Play className="w-5 h-5 mr-2" />
                Open Content
              </a>
            </Button>
          </CardContent>
        </Card>
      );
    }

    // No content available
    return (
      <Card className="border shadow-sm">
        <CardContent className="py-16 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No Content Available</h3>
          <p className="text-muted-foreground">This module doesn't have any content yet.</p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
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
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(`/courses/${courseId}`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {course.course_name}
        </Button>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Module Header */}
            <Card className="border shadow-sm">
              <CardHeader className="bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded bg-primary/10">
                        <ContentIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold">{module.module_name}</CardTitle>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline">
                            Module {module.module_order}
                          </Badge>
                          <Badge variant="outline">
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
                    {module.module_description && (
                      <p className="text-muted-foreground">{module.module_description}</p>
                    )}
                  </div>
                  
                  {/* Reading Stats */}
                  <div className="bg-background border rounded-lg p-4 text-center">
                    <div className="text-xl font-semibold text-primary mb-1">
                      {formatTime(readingTime)}
                    </div>
                    <p className="text-xs text-muted-foreground">Time Spent</p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Module Content */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ContentIcon className="h-5 w-5 mr-2 text-primary" />
                  Module Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderContent()}
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousModule}
                      disabled={currentModuleIndex <= 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Module {currentModuleIndex + 1} of {allModules.length}
                    </span>
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

                  <Button
                    onClick={handleMarkComplete}
                    disabled={isCompleted}
                    className={isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {isCompleted ? 'Completed' : 'Mark Complete'}
                  </Button>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Course Progress</span>
                    <span>{currentModuleIndex + 1} / {allModules.length}</span>
                  </div>
                  <Progress value={((currentModuleIndex + 1) / allModules.length) * 100} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Module Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border shadow-sm sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  All Modules
                </CardTitle>
              </CardHeader>
              <ScrollArea className="h-96">
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {allModules.map((mod, index) => {
                      const ModuleIcon = getContentIcon(mod.content_type);
                      const isCurrent = mod.id === moduleId;
                      
                      return (
                        <Button
                          key={mod.id}
                          variant={isCurrent ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start h-auto p-3"
                          onClick={() => navigate(`/courses/${courseId}/modules/${mod.id}`)}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={cn(
                              "p-1 rounded",
                              isCurrent ? "bg-primary-foreground/20" : "bg-muted"
                            )}>
                              <ModuleIcon className="w-3 h-3" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-xs font-medium truncate">
                                {index + 1}. {mod.module_name}
                              </div>
                              {mod.estimated_duration_minutes && (
                                <div className="text-xs opacity-70">
                                  {mod.estimated_duration_minutes}m
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