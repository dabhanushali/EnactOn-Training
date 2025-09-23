import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Clock, Target, BookOpen, FileQuestion } from 'lucide-react';
import { AssessmentDialog } from './AssessmentDialog';

interface AssessmentTemplate {
  id: string;
  course_id: string;
  title: string;
  description: string;
  assessment_type: string;
  passing_score: number;
  time_limit_minutes: number;
  is_mandatory: boolean;
  instructions: string;
  created_by: string;
  created_at: string;
  question_count?: number;
}

interface AssessmentTemplateManagerProps {
  courseId: string;
  onQuestionManagement?: (assessmentId: string) => void; // Add callback for redirecting to questions
}

export function AssessmentTemplateManager({ courseId, onQuestionManagement }: AssessmentTemplateManagerProps) {
  const [assessments, setAssessments] = useState<AssessmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentTemplate | null>(null);
  const { toast } = useToast();

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch assessment templates
      const { data, error } = await supabase
        .from('assessment_templates')
        .select('*')
        .eq('course_id', courseId);

      if (error) throw error;

      // Fetch question counts for each assessment
      const assessmentsWithCount = await Promise.all(
        (data || []).map(async (assessment) => {
          const { count } = await supabase
            .from('assessment_questions')
            .select('*', { count: 'exact', head: true })
            .eq('assessment_template_id', assessment.id);
          
          return {
            ...assessment,
            question_count: count || 0
          };
        })
      );

      setAssessments(assessmentsWithCount);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast({
        title: "Error",
        description: "Failed to load assessments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const handleDeleteAssessment = async (assessmentId: string) => {
    try {
      const { error } = await supabase
        .from('assessment_templates')
        .delete()
        .eq('id', assessmentId);

      if (error) throw error;

      await fetchAssessments();
      toast({
        title: "Success",
        description: "Assessment deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assessment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getAssessmentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'quiz':
        return <FileQuestion className="w-4 h-4" />;
      case 'project':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <FileQuestion className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'quiz':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'project':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'practical':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Assessment Templates</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingAssessment(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}
              </DialogTitle>
            </DialogHeader>
            <AssessmentDialog
              courseId={courseId}
              assessment={editingAssessment}
              onAssessmentSave={(assessment: AssessmentTemplate) => {
                setDialogOpen(false);
                setEditingAssessment(null);
                fetchAssessments();
                
                // Auto-redirect to questions tab for new assessments
                if (!editingAssessment && onQuestionManagement) {
                  onQuestionManagement(assessment.id);
                }
              }}
              onClose={() => {
                setDialogOpen(false);
                setEditingAssessment(null);
                fetchAssessments();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No assessments created yet</p>
            <p className="text-sm">Create your first assessment to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <Card key={assessment.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getAssessmentIcon(assessment.assessment_type)}
                      <div>
                        <h4 className="font-medium">{assessment.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {assessment.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Badge className={getTypeColor(assessment.assessment_type)}>
                        {assessment.assessment_type}
                      </Badge>
                      {assessment.is_mandatory && (
                        <Badge variant="destructive">Mandatory</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{assessment.time_limit_minutes}min</span>
                      <Target className="w-4 h-4 ml-2" />
                      <span>{assessment.passing_score}%</span>
                      <FileQuestion className="w-4 h-4 ml-2" />
                      <span>{assessment.question_count} questions</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAssessment(assessment);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAssessment(assessment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}