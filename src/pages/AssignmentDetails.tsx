
import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { SubmitWorkDialog } from '@/components/projects/SubmitWorkDialog';

// Define complex types for the nested data
interface Evaluation {
    id: string;
    overall_score: number;
    strengths: string;
    areas_for_improvement: string;
}

interface Submission {
    id: string;
    submission_content: string;
    file_url: string;
    submitted_at: string;
    project_evaluations: Evaluation[];
}

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
    projects: Project;
    project_milestone_submissions: Submission[];
}

export default function AssignmentDetails() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('project_assignments')
      .select('*, projects(*), project_milestone_submissions(*, project_evaluations(*))')
      .eq('id', assignmentId)
      .single();

    if (error) {
      console.error('Error fetching assignment details:', error);
      setAssignment(null);
    } else {
      setAssignment(data as Assignment);
    }

    setLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return <div className="p-8">Loading assignment details...</div>;
  }

  if (!assignment) {
    return <div className="p-8">Assignment not found.</div>;
  }

  const { projects: project, status, project_milestone_submissions: submissions } = assignment;

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">{project.project_name}</h1>
                <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">Assignment Status:</p> 
                    <Badge>{status}</Badge>
                </div>
            </div>
            {status !== 'Submitted' && status !== 'Evaluated' && (
                <SubmitWorkDialog assignmentId={assignment.id} onSubmited={fetchDetails} />
            )}
        </div>

        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Project Brief</CardTitle>
                <CardDescription>{project.project_description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
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
            <CardTitle>Your Submissions</CardTitle>
            <CardDescription>A history of your work for this project.</CardDescription>
          </CardHeader>
          <CardContent>
            {submissions && submissions.length > 0 ? submissions.map(submission => (
                <div key={submission.id} className="border rounded-lg p-4 mb-4">
                    <h4 className="font-semibold">Submission on {new Date(submission.submitted_at).toLocaleDateString()}</h4>
                    <p className="text-sm text-muted-foreground my-2">{submission.submission_content}</p>
                    {submission.file_url && <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">View Submission Link/File</a>}
                    
                    {submission.project_evaluations && submission.project_evaluations.length > 0 && (
                        <div className="mt-4 border-t pt-4">
                            <h5 className="font-bold">Evaluation</h5>
                            {submission.project_evaluations.map(evalItem => (
                                <div key={evalItem.id} className="mt-2">
                                    <p className="font-semibold">Overall Score: {evalItem.overall_score}/5</p>
                                    <p><span className="font-semibold">Strengths:</span> {evalItem.strengths}</p>
                                    <p><span className="font-semibold">Areas for Improvement:</span> {evalItem.areas_for_improvement}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )) : (
                <p className="text-center text-muted-foreground">You have not made any submissions for this project yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
