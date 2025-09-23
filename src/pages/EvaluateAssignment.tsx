import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Badge variant="success">Evaluation Complete</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">{evaluation.overall_score}/5</div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{evaluation.technical_score}/5</div>
            <div className="text-sm text-muted-foreground">Technical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{evaluation.quality_score}/5</div>
            <div className="text-sm text-muted-foreground">Quality</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">{evaluation.timeline_score}/5</div>
            <div className="text-sm text-muted-foreground">Timeline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{evaluation.communication_score}/5</div>
            <div className="text-sm text-muted-foreground">Communication</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600 mb-1">{evaluation.innovation_score}/5</div>
            <div className="text-sm text-muted-foreground">Innovation</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold text-success">Strengths</Label>
            <Card className="mt-2">
              <CardContent className="pt-4">
                <p className="text-sm">{evaluation.strengths}</p>
              </CardContent>
            </Card>
          </div>
          <div>
            <Label className="text-base font-semibold text-warning">Areas for Improvement</Label>
            <Card className="mt-2">
              <CardContent className="pt-4">
                <p className="text-sm">{evaluation.areas_for_improvement}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
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
                        <div className="flex-1">
                            <CardTitle className="flex items-center gap-2 mb-2">
                              Submission Details
                              {submission.project_evaluations && submission.project_evaluations.length > 0 && (
                                <Badge variant="success">Evaluated</Badge>
                              )}
                            </CardTitle>
                            <div className="text-sm text-muted-foreground mb-2">
                              Submitted on {new Date(submission.submitted_at).toLocaleDateString()} at {new Date(submission.submitted_at).toLocaleTimeString()}
                            </div>
                            {submission.submission_content && (
                              <CardDescription className="mt-2 whitespace-pre-wrap">{submission.submission_content}</CardDescription>
                            )}
                        </div>
                        {submission.file_url && 
                            <Button variant="outline" asChild className="ml-4">
                              <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                                View Submission
                              </a>
                            </Button>
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