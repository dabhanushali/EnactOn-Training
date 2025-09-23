import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { EvaluationDialog } from '@/components/projects/EvaluationDialog';

// Define complex types for the nested data
interface Evaluation {
    id: string;
    overall_score: number;
    strengths: string;
    areas_for_improvement: string;
    technical_score: number;
    quality_score: number;
    timeline_score: number;
    communication_score: number;
    innovation_score: number;
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
}

interface Profile {
    id: string;
    first_name: string;
    last_name: string;
}

interface Assignment {
    id: string;
    status: string;
    assignee_id: string;
    projects: Project;
    profiles: Profile;
    project_milestone_submissions: Submission[];
}

export default function EvaluateAssignment() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('project_assignments' as any)
      .select('*, projects(*), profiles!assignee_id(*), project_milestone_submissions(*, project_evaluations(*))')
      .eq('id', assignmentId)
      .single();

    if (error) {
      console.error('Error fetching assignment details:', error);
      setAssignment(null);
    } else {
      setAssignment(data as any);
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

  const { projects: project, profiles: trainee, project_milestone_submissions: submissions } = assignment;

  const EvaluationDetails = ({ evaluation }: { evaluation: Evaluation }) => (
    <div className="mt-4 border-t pt-4">
        <h5 className="font-bold">Evaluation Results</h5>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm">
            <p><strong>Overall Score:</strong> {evaluation.overall_score}/5</p>
            <p><strong>Technical:</strong> {evaluation.technical_score}/5</p>
            <p><strong>Quality:</strong> {evaluation.quality_score}/5</p>
            <p><strong>Timeline:</strong> {evaluation.timeline_score}/5</p>
            <p><strong>Communication:</strong> {evaluation.communication_score}/5</p>
            <p><strong>Innovation:</strong> {evaluation.innovation_score}/5</p>
        </div>
        <div className="mt-4">
            <p className="font-semibold">Strengths:</p>
            <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">{evaluation.strengths}</p>
        </div>
        <div className="mt-2">
            <p className="font-semibold">Areas for Improvement:</p>
            <p className="text-sm text-muted-foreground p-2 bg-secondary rounded-md">{evaluation.areas_for_improvement}</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">Evaluate Submission</h1>
            <p className="text-muted-foreground">
                Project: <strong>{project.project_name}</strong> | Trainee: <strong>{trainee.first_name} {trainee.last_name}</strong>
            </p>
        </div>

        {submissions && submissions.length > 0 ? submissions.map(submission => (
            <Card key={submission.id} className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Submission on {new Date(submission.submitted_at).toLocaleString()}</CardTitle>
                            <CardDescription className="mt-2">{submission.submission_content || "No comments provided."}</CardDescription>
                        </div>
                        {submission.file_url && 
                            <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline">View Submission</Button>
                            </a>
                        }
                    </div>
                </CardHeader>
                <CardContent>
                    {submission.project_evaluations && submission.project_evaluations.length > 0 ? (
                        <EvaluationDetails evaluation={submission.project_evaluations[0]} />
                    ) : (
                        <EvaluationDialog 
                            submissionId={submission.id}
                            projectId={project.id}
                            assignmentId={assignment.id}
                            employeeId={assignment.assignee_id}
                            onEvaluated={fetchDetails}
                        />
                    )}
                </CardContent>
            </Card>
        )) : (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">This trainee has not made any submissions for this project yet.</p>
                </CardContent>
            </Card>
        )}
      </main>
    </div>
  );
}