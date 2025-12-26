import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { RequiredLabel } from '../forms/RequiredLabel';
import { QuestionManager } from './QuestionManager';

// Interfaces
interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
}

interface Question {
  id: string;
  assessment_template_id: string;
  question_text: string;
  question_type: string;
  points: number;
  question_order: number;
  explanation: string;
  options?: QuestionOption[];
}

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
}

interface AssessmentDialogProps {
  courseId: string;
  assessment: AssessmentTemplate | null;
  onAssessmentSave: (assessment: AssessmentTemplate) => void;
  onClose: () => void;
}

export function AssessmentDialog({ courseId, assessment, onAssessmentSave, onClose }: AssessmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(assessment?.id || null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assessment_type: 'quiz',
    passing_score: 70,
    time_limit_minutes: 60,
    is_mandatory: true,
    instructions: ''
  });

  useEffect(() => {
    if (assessment) {
      setForm({
        title: assessment.title,
        description: assessment.description || '',
        assessment_type: assessment.assessment_type,
        passing_score: assessment.passing_score,
        time_limit_minutes: assessment.time_limit_minutes || 60,
        is_mandatory: assessment.is_mandatory,
        instructions: assessment.instructions || ''
      });
      setCurrentAssessmentId(assessment.id);
    }
  }, [assessment]);

  const fetchQuestions = useCallback(async () => {
    if (!currentAssessmentId) return;
    try {
      setLoadingQuestions(true);
      const { data: qs, error } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_template_id', currentAssessmentId)
        .order('question_order');

      if (error) throw error;

      // Fetch options separately to avoid ambiguous relationship error
      let optionsByQuestion: Record<string, QuestionOption[]> = {};
      if (qs && qs.length > 0) {
        const { data: opts, error: optsError } = await supabase
          .from('question_options')
          .select('*')
          .in('question_id', qs.map((q: any) => q.id))
          .order('option_order');
        if (optsError) throw optsError;
        optionsByQuestion = (opts || []).reduce((acc: Record<string, QuestionOption[]>, opt: any) => {
          (acc[opt.question_id] ||= []).push(opt);
          return acc;
        }, {} as Record<string, QuestionOption[]>);
      }

      const questionsWithSortedOptions = (qs || []).map((q: any) => ({
        ...q,
        options: optionsByQuestion[q.id] || []
      }));
      setQuestions(questionsWithSortedOptions);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({ title: "Error", description: "Failed to load questions.", variant: "destructive" });
    } finally {
      setLoadingQuestions(false);
    }
  }, [currentAssessmentId, toast]);

  useEffect(() => {
    if (currentAssessmentId) {
      fetchQuestions();
    }
  }, [currentAssessmentId, fetchQuestions]);

  const handleSave = async () => {
    if (!user || !form.title.trim()) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const assessmentData = { ...form, course_id: courseId, created_by: user.id };

      let result;
      if (assessment) {
        const { data, error } = await supabase.from('assessment_templates').update(assessmentData).eq('id', assessment.id).select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.from('assessment_templates').insert(assessmentData).select().single();
        if (error) throw error;
        result = data;
        setCurrentAssessmentId(result.id);
      }

      toast({ title: "Success", description: `Assessment ${assessment ? 'updated' : 'created'} successfully.` });
      onAssessmentSave(result);

    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({ title: "Error", description: `Failed to ${assessment ? 'update' : 'create'} assessment.`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (form.assessment_type === 'quiz') {
      if (questions.length === 0) {
        toast({ title: "Validation Error", description: "A quiz must have at least one question.", variant: "destructive" });
        return;
      }
      for (const q of questions) {
        if (!q.options || q.options.length < 2) {
          toast({ title: "Validation Error", description: `Question "${q.question_text}" must have at least two options.`, variant: "destructive" });
          return;
        }
      }
    }
    onClose();
  };

  const getSecondTabLabel = () => {
    switch (form.assessment_type) {
      case 'quiz':
        return 'Questions';
      case 'assignment':
        return 'Deliverables';
      case 'project':
        return 'Project Details';
      default:
        return 'Requirements';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Assessment Details</TabsTrigger>
          <TabsTrigger value="questions" disabled={!currentAssessmentId}>
            {getSecondTabLabel()} {currentAssessmentId ? '' : '(Save first)'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          {/* Form fields... */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <RequiredLabel htmlFor="title">Assessment Title</RequiredLabel>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Module 1 Quiz" />
            </div>
            <div>
              <Label htmlFor="assessment_type">Assessment Type</Label>
              <Select value={form.assessment_type} onValueChange={(value) => setForm({ ...form, assessment_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="practical">Practical</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the assessment" rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passing_score">Passing Score (%)</Label>
              <Input id="passing_score" type="number" min="0" max="100" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: parseInt(e.target.value) || 70 })} />
            </div>
            <div>
              <Label htmlFor="time_limit">
                {form.assessment_type === 'project' ? 'Duration (days)' : 'Time Limit (minutes)'}
              </Label>
              <Input id="time_limit" type="number" min="1" value={form.time_limit_minutes} onChange={(e) => setForm({ ...form, time_limit_minutes: parseInt(e.target.value) || 60 })} />
            </div>
          </div>
          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea id="instructions" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Instructions for students..." rows={3} />
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="is_mandatory" checked={form.is_mandatory} onCheckedChange={(checked) => setForm({ ...form, is_mandatory: checked })} />
            <Label htmlFor="is_mandatory">Mandatory Assessment</Label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} aria-label="Save assessment">{saving ? 'Saving...' : assessment ? 'Update Assessment' : 'Create Assessment'}</Button>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          {currentAssessmentId && (
            <QuestionManager 
              assessmentId={currentAssessmentId} 
              assessmentType={form.assessment_type}
              questions={questions}
              onQuestionsChange={fetchQuestions}
              loading={loadingQuestions}
            />
          )}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>Done</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
