import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Clock } from 'lucide-react';

interface ProjectEvaluationStatusProps {
  assignmentId: string;
  status: string;
  userRole?: string;
}

interface EvaluationInfo {
  count: number;
  daysPending: number;
}

export const ProjectEvaluationStatus = ({ assignmentId, status, userRole }: ProjectEvaluationStatusProps) => {
  const [evaluationInfo, setEvaluationInfo] = useState<EvaluationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvaluationInfo = async () => {
      if (status !== 'Submitted' || !['Management', 'Human Resources', 'Team Lead'].includes(userRole || '')) {
        setLoading(false);
        return;
      }

      try {
        const { data: submissions, error } = await supabase
          .from('project_milestone_submissions')
          .select('id, submitted_at, project_evaluations(id)')
          .eq('assignment_id', assignmentId);

        if (error) throw error;

        const pendingCount = submissions?.filter(
          s => !s.project_evaluations || s.project_evaluations.length === 0
        ).length || 0;

        if (pendingCount > 0 && submissions && submissions.length > 0) {
          const oldestSubmission = submissions
            .filter(s => !s.project_evaluations || s.project_evaluations.length === 0)
            .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())[0];

          if (oldestSubmission) {
            const daysPending = Math.floor(
              (Date.now() - new Date(oldestSubmission.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            setEvaluationInfo({ count: pendingCount, daysPending });
          }
        }
      } catch (error) {
        console.error('Error fetching evaluation info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluationInfo();
  }, [assignmentId, status, userRole]);

  if (loading) {
    return <Badge variant="secondary">{status}</Badge>;
  }

  if (evaluationInfo && evaluationInfo.count > 0) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="destructive" className="w-fit">
          {evaluationInfo.count} Pending Evaluation{evaluationInfo.count > 1 ? 's' : ''}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {evaluationInfo.daysPending} day{evaluationInfo.daysPending !== 1 ? 's' : ''} pending
        </span>
      </div>
    );
  }

  return <Badge variant="secondary">{status}</Badge>;
};
