import { MainNav } from '@/components/navigation/MainNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Calendar, Trash2 } from 'lucide-react';
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

// Updated interfaces to match the new schema
interface Project {
  id: string;
  project_name: string;
  project_description: string;
  status: string;
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
    let response;

    if (profile.role?.role_name === 'Trainee') {
      response = await supabase
        .from('project_assignments' as any)
        .select('id, status, projects (*)')
        .eq('assignee_id', user.id);
    } else {
      response = await supabase.from('projects').select('*');
    }

    const { data, error } = response;

    if (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    fetchProjects();
  }, [user, profile, fetchProjects]);

  const handleProjectCreated = (projectId: string) => {
    setSelectedProjectId(projectId);
    setAssignDialogOpen(true);
  };

  const handleProjectAssigned = () => {
    fetchProjects();
  };

  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectToDelete.id);

    if (error) {
      toast.error(`Failed to delete project: ${error.message}`);
      console.error("Delete error:", error);
    } else {
      toast.success(`Project "${projectToDelete.project_name}" deleted.`);
      fetchProjects();
    }
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const isAdmin = ['Team Lead', 'HR', 'Management'].includes(profile?.role?.role_name || '');

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Projects</h1>
            <p className="text-muted-foreground">
              Manage and track your training projects and assignments.
            </p>
          </div>
          {isAdmin && (
            <CreateProjectDialog onProjectCreated={handleProjectCreated} />
          )}
        </div>

        {loading ? (
          <p>Loading projects...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((item) => {
              const project = profile?.role?.role_name === 'Trainee' ? (item as ProjectAssignment).projects : (item as Project);
              const assignmentStatus = profile?.role?.role_name === 'Trainee' ? (item as ProjectAssignment).status : project.status;
              const linkId = profile?.role?.role_name === 'Trainee' ? (item as ProjectAssignment).id : project.id;
              const linkPath = isAdmin ? `/projects/${linkId}` : `/assignments/${linkId}`;

              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FolderOpen className="h-8 w-8 text-primary" />
              {profile?.role?.role_name === 'Trainee' && (
                <Badge variant="secondary">{
                  assignmentStatus === 'Not_Started' ? 'Not Started' :
                  assignmentStatus === 'Started' ? 'In Progress' :
                  assignmentStatus === 'Submitted' ? 'Submitted' :
                  assignmentStatus
                }</Badge>
              )}
                    </div>
                    <CardTitle className="text-lg pt-2">{project.project_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-between">
                    <p className="text-muted-foreground mb-4 h-12 overflow-hidden">
                      {project.project_description}
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                        <Link to={linkPath} className="w-full">
                            <Button variant="outline" className="w-full">View Details</Button>
                        </Link>
                        {isAdmin && (
                            <Button variant="destructive" size="icon" onClick={() => openDeleteDialog(project)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <AssignProjectDialog 
        projectId={selectedProjectId}
        open={isAssignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onProjectAssigned={handleProjectAssigned}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              <strong> {projectToDelete?.project_name}</strong> and all of its assignments and submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>Confirm Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
