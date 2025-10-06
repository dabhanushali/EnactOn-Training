import { MainNav } from '@/components/navigation/MainNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProjectQuickActions } from '@/components/projects/ProjectQuickActions';
import { 
  FolderOpen, Calendar, Trash2, Plus, Clock, Users, 
  Target, TrendingUp, CheckCircle, PlayCircle, PauseCircle 
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { Link } from 'react-router-dom';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { AssignProjectDialog } from '@/components/projects/AssignProjectDialog';
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
import { toast } from 'sonner';

interface Project {
  id: string;
  project_name: string;
  project_description: string;
  status: string;
  duration_days?: number;
  created_at: string;
}

interface ProjectAssignment {
  id: string;
  status: string;
  projects: Project;
}

export default function Projects() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState<Project[] | ProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user || !profile) return;

    setLoading(true);
    try {
      if (profile.role?.role_name === 'Trainee') {
        // Fetch assignments for trainees
        const { data, error } = await supabase
          .from('project_assignments')
          .select('*, projects(*)')
          .eq('assignee_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } else {
        // Fetch all projects for managers/HR/team leads
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) throw error;

      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Not_Started':
        return { 
          icon: PauseCircle, 
          variant: 'secondary' as const, 
          label: 'Not Started',
          color: 'bg-slate-500/10 text-slate-600 border-slate-200'
        };
      case 'Started':
        return { 
          icon: PlayCircle, 
          variant: 'default' as const, 
          label: 'In Progress',
          color: 'bg-blue-500/10 text-blue-600 border-blue-200'
        };
      case 'Submitted':
        return { 
          icon: CheckCircle, 
          variant: 'outline' as const, 
          label: 'Submitted',
          color: 'bg-success/10 text-success border-success/20'
        };
      case 'Completed':
        return { 
          icon: CheckCircle, 
          variant: 'default' as const, 
          label: 'Completed',
          color: 'bg-success/10 text-success border-success/20'
        };
      default:
        return { 
          icon: Clock, 
          variant: 'secondary' as const, 
          label: status,
          color: 'bg-muted/10 text-muted-foreground border-muted/20'
        };
    }
  };

  const isManager = ['Team Lead', 'HR', 'Management'].includes(profile?.role?.role_name || '');

  // Stats for managers
  const totalProjects = isManager ? projects.length : 0;
  const activeProjects = isManager 
    ? (projects as Project[]).filter(p => p.status === 'Started').length 
    : 0;
  const completedProjects = isManager 
    ? (projects as Project[]).filter(p => p.status === 'Completed').length 
    : 0;

  // Stats for trainees
  const myAssignments = !isManager ? projects.length : 0;
  const inProgress = !isManager 
    ? (projects as ProjectAssignment[]).filter(p => p.status === 'Started').length 
    : 0;
  const submitted = !isManager 
    ? (projects as ProjectAssignment[]).filter(p => p.status === 'Submitted').length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <MainNav />
      
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Target className="w-8 h-8" />
                </div>
                {isManager ? 'Project Management' : 'My Projects'}
              </h1>
              <p className="text-muted-foreground text-lg">
                {isManager 
                  ? 'Oversee and manage organizational projects' 
                  : 'Track your assigned projects and submissions'
                }
              </p>
            </div>
            {isManager && <CreateProjectDialog onProjectCreated={fetchProjects} />}
          </div>

          {/* Enhanced Project Quick Actions */}
          <ProjectQuickActions
            totalProjects={isManager ? totalProjects : myAssignments}
            activeProjects={isManager ? activeProjects : inProgress}
            completedProjects={isManager ? completedProjects : submitted}
            pendingEvaluations={isManager ? (projects as Project[]).filter((p: Project) => p.status === 'Submitted').length : 0}
            userRole={profile?.role?.role_name || 'Trainee'}
          />
        </div>

        {/* Projects Grid */}
        <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              {isManager ? 'All Projects' : 'My Project Assignments'} ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-48"></div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  {isManager ? 'No projects created yet' : 'No projects assigned'}
                </h3>
                <p className="text-muted-foreground">
                  {isManager 
                    ? 'Create your first project to get started.' 
                    : 'Check back later for new project assignments.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((item) => {
                  const project = 'projects' in item ? item.projects : item;
                  const status = 'projects' in item ? item.status : project.status;
                  const statusConfig = getStatusConfig(status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card key={project.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/90 hover:bg-white">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                              {project.project_name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {project.project_description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <Badge className={`${statusConfig.color} font-medium flex items-center gap-1`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </Badge>
                            {project.duration_days && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 mr-1" />
                                {project.duration_days} days
                              </div>
                            )}
                          </div>

                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-2" />
                            Created {new Date(project.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <Separator className="mb-4" />

                        <div className="flex justify-between items-center">
                          <Link 
                            to={isManager ? `/projects/${project.id}` : `/assignments/${'projects' in item ? item.id : project.id}`}
                          >
                            <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground">
                              <Target className="w-4 h-4" />
                              {isManager ? 'Manage' : 'View Details'}
                            </Button>
                          </Link>

                          <div className="flex gap-2">
                            {isManager && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProjectId(project.id);
                                    setAssignDialogOpen(true);
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <Users className="w-4 h-4" />
                                  Assign
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setProjectToDelete(project);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Project Dialog */}
      {selectedProjectId && (
        <AssignProjectDialog
          projectId={selectedProjectId}
          open={isAssignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          onProjectAssigned={fetchProjects}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.project_name}"? 
              This action cannot be undone and will remove all associated assignments and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}