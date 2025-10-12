import { MainNav } from '@/components/navigation/MainNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth-utils';
import { SubmitWorkDialog } from '@/components/projects/SubmitWorkDialog';
import { ArrowLeft, CheckCircle, Clock, PlayCircle, FileText, Upload, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  project_name: string;
  project_description: string;
  instructions: string;
  deliverables: string;
  due_date?: string;
}

interface Assignment {
  id: string;
  status: string;
  projects: Project;
}

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Not_Started':
        return { variant: 'secondary' as const, icon: Clock, label: 'Not Started' };
      case 'Started':
        return { variant: 'outline' as const, icon: PlayCircle, label: 'In Progress' };
      case 'Submitted':
        return { variant: 'default' as const, icon: CheckCircle, label: 'Submitted' };
      default:
        return { variant: 'secondary' as const, icon: FileText, label: status };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <IconComponent className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};

export default function AssignmentDetails() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const fetchDetails = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('project_assignments' as any)
      .select('*, projects(*)')
      .eq('id', assignmentId)
      .single();

    if (error) {
      console.error('Error fetching assignment details:', error);
      setAssignment(null);
    } else {
      setAssignment(data as any);

      // Fetch submissions
      const { data: subs } = await supabase
        .from('project_milestone_submissions' as any)
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });
      setSubmissions(subs || []);
    }

    setLoading(false);
  }, [assignmentId]);

  const [evaluations, setEvaluations] = useState<any[]>([]);

  const fetchEvaluations = useCallback(async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_evaluations')
        .select('*')
        .eq('project_id', projectId)
        .eq('employee_id', profile?.id || '');

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    if (assignment?.projects?.id && profile?.id) {
      fetchEvaluations(assignment.projects.id);
    }
  }, [assignment?.projects?.id, profile?.id, fetchEvaluations]);

  const handleStatusChange = async (newStatus: string) => {
    if (!assignmentId) return;

    try {
      const { error } = await supabase
        .from('project_assignments' as any)
        .update({ status: newStatus })
        .eq('id', assignmentId);

      if (error) throw error;

      await fetchDetails();
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getNextAction = (currentStatus: string) => {
    switch (currentStatus) {
      case 'Not_Started':
        return {
          label: 'Start Working',
          action: () => handleStatusChange('Started'),
          variant: 'default' as const
        };
      case 'Started':
        return {
          label: 'Submit Work',
          action: () => {}, // Will be handled by SubmitWorkDialog
          variant: 'default' as const
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Assignment not found</p>
              <Button onClick={() => navigate('/projects')} className="mt-4">
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { projects: project } = assignment;
  const nextAction = getNextAction(assignment.status);

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Button>
          
          <div className="flex items-center gap-4">
            <StatusBadge status={assignment.status} />
            {nextAction && (
              <Button onClick={nextAction.action} variant={nextAction.variant}>
                {nextAction.label === 'Submit Work' && <Upload className="w-4 h-4 mr-2" />}
                {nextAction.label}
              </Button>
            )}
          </div>
        </div>

        {/* Project Overview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{project.project_name}</CardTitle>
                <p className="text-muted-foreground">{project.project_description}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardHeader>
        </Card>

        {/* Project Details */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {project.instructions ? (
                  <div className="whitespace-pre-wrap text-sm">{project.instructions}</div>
                ) : (
                  <p className="text-muted-foreground">No specific instructions provided.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deliverables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {project.deliverables ? (
                  <div className="whitespace-pre-wrap text-sm">{project.deliverables}</div>
                ) : (
                  <p className="text-muted-foreground">No specific deliverables listed.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className={`flex items-center space-x-2 ${
                  ['Not_Started', 'Started', 'Submitted'].includes(assignment.status) 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    ['Not_Started', 'Started', 'Submitted'].includes(assignment.status)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}></div>
                  <span className="text-sm font-medium">Assigned</span>
                </div>
                
                <div className={`flex items-center space-x-2 ${
                  ['Started', 'Submitted'].includes(assignment.status)
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    ['Started', 'Submitted'].includes(assignment.status)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}></div>
                  <span className="text-sm font-medium">In Progress</span>
                </div>
                
                <div className={`flex items-center space-x-2 ${
                  assignment.status === 'Submitted'
                    ? 'text-success'
                    : 'text-muted-foreground'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    assignment.status === 'Submitted'
                      ? 'bg-success'
                      : 'bg-muted'
                  }`}></div>
                  <span className="text-sm font-medium">Submitted</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Evaluations */}
        {evaluations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Project Evaluations ({evaluations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {evaluations.map((evaluation, index) => (
                  <div key={evaluation.id} className="border rounded-lg p-4 bg-muted/5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">Evaluation #{index + 1}</h4>
                      <Badge variant="secondary">
                        Score: {evaluation.overall_score}/10
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-success mb-1">Strengths:</h5>
                        <p className="text-muted-foreground">{evaluation.strengths || 'No strengths noted'}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-warning mb-1">Areas for Improvement:</h5>
                        <p className="text-muted-foreground">{evaluation.areas_for_improvement || 'No areas noted'}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Evaluation Date: {new Date(evaluation.evaluation_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submitted Works */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Submitted Works ({submissions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {submissions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded border">
                    <div className="space-y-1">
                      <p className="text-sm">{new Date(s.submitted_at).toLocaleString()}</p>
                      {s.submission_content && (
                        <p className="text-xs text-muted-foreground">{s.submission_content}</p>
                      )}
                    </div>
                    {s.file_url && (
                      <Button asChild size="sm" variant="outline">
                        <a href={s.file_url} target="_blank" rel="noopener noreferrer">Open</a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <SubmitWorkDialog
          assignmentId={assignmentId || ''}
          projectId={assignment.projects.id}
          assignmentStatus={assignment.status}
          onSubmited={() => {
            fetchDetails();
          }}
        />
      </main>
    </div>
  );
}