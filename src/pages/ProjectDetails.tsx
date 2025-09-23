import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/auth-utils';
import { AssignProjectDialogEnhanced } from '@/components/projects/AssignProjectDialogEnhanced';

// Interfaces for the new data structure
interface Project {
  id: string;
  project_name: string;
  project_description: string;
  instructions: string;
  deliverables: string;
  due_date: string;
}

interface Assignment {
  id: string;
  status: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const { profile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);

    // Fetch project details
    const projectPromise = supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Fetch assigned trainees
    const assignmentsPromise = supabase
      .from('project_assignments' as any)
      .select('id, status, profiles!assignee_id(id, first_name, last_name)')
      .eq('project_id', projectId);

    const [projectResult, assignmentsResult] = await Promise.all([projectPromise, assignmentsPromise]);

    if (projectResult.error) {
      console.error('Error fetching project details:', projectResult.error);
    } else {
      setProject(projectResult.data as any);
    }

    if (assignmentsResult.error) {
      console.error('Error fetching assignments:', assignmentsResult.error);
    } else {
      setAssignments(assignmentsResult.data as any);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const userRole = profile?.role?.role_name;
  
  // Role-based status display logic
  const getDisplayStatus = (assignment: Assignment) => {
    if (userRole === 'Trainee') {
      // Trainees see granular workflow: Not Started → Started → Submitted
      return assignment.status;
    } else {
      // Team Leads, HR, Management see high-level overview
      return assignment.status === 'Submitted' ? 'Submitted' : 'Not Submitted';
    }
  };

  const visibleAssignments = userRole === 'Team Lead'
    ? assignments.filter(assignment => assignment.profiles)
    : assignments;

  if (loading) {
    return <div className="p-8">Loading project details...</div>;
  }

  if (!project) {
    return <div className="p-8">Project not found.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">{project.project_name}</h1>
                <p className="text-muted-foreground">Project Dashboard</p>
            </div>
            <Button onClick={() => setAssignDialogOpen(true)}>Assign More Trainees</Button>
        </div>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Project Brief</CardTitle>
                <CardDescription>{project.project_description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold mb-2">Instructions</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.instructions}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Deliverables</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.deliverables}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Trainees</CardTitle>
            <CardDescription>The following trainees have been assigned to this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trainee Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAssignments.length > 0 ? visibleAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.profiles?.first_name} {assignment.profiles?.last_name || 'N/A'}</TableCell>
                    <TableCell><Badge variant="secondary">{getDisplayStatus(assignment)}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Link to={`/assignments/${assignment.id}/evaluate`}>
                        <Button variant="outline" size="sm">View & Evaluate</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No trainees have been assigned to this project yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <AssignProjectDialogEnhanced 
        projectId={projectId || null}
        open={isAssignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onProjectAssigned={fetchDetails}
      />
    </div>
  );
}