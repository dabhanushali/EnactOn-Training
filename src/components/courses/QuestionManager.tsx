import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, X, FileText, Target, CheckCircle } from 'lucide-react';

interface QuestionOption {
  id?: string;
  question_id?: string;
  option_text: string;
  is_correct: boolean;
  option_order?: number;
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

interface QuestionManagerProps {
  assessmentId: string;
  assessmentType: string;
  questions: Question[];
  onQuestionsChange: () => void;
  loading: boolean;
}

export function QuestionManager({ assessmentId, assessmentType, questions, onQuestionsChange, loading }: QuestionManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const { toast } = useToast();

  // Different default form based on assessment type
  const getDefaultForm = () => {
    if (assessmentType === 'quiz') {
      return {
        question_text: '',
        question_type: 'multiple_choice',
        points: 1,
        explanation: '',
        options: [
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false }
        ]
      };
    } else if (assessmentType === 'assignment') {
      return {
        question_text: '',
        question_type: 'deliverable',
        points: 10,
        explanation: '',
        options: []
      };
    } else {
      return {
        question_text: '',
        question_type: 'milestone',
        points: 20,
        explanation: '',
        options: []
      };
    }
  };

  const [questionForm, setQuestionForm] = useState(getDefaultForm());

  const resetForm = () => {
    setQuestionForm(getDefaultForm());
  };

  const handleEditClick = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      explanation: question.explanation || '',
      options: question.options?.map(opt => ({ ...opt })) || []
    });
    setDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      toast({ title: "Error", description: getItemLabel() + " text is required.", variant: "destructive" });
      return;
    }

    // Only validate options for quiz-type questions
    if (assessmentType === 'quiz' && ['multiple_choice', 'true_false'].includes(questionForm.question_type)) {
      const validOptions = questionForm.options.filter(opt => opt.option_text.trim());
      if (validOptions.length < 2) {
        toast({ title: "Error", description: "At least 2 options are required.", variant: "destructive" });
        return;
      }
      const correctCount = validOptions.filter(opt => opt.is_correct).length;
      if (correctCount !== 1) {
        toast({ title: "Error", description: "Exactly one option must be marked correct.", variant: "destructive" });
        return;
      }
    }

    try {
      const questionData = {
        assessment_template_id: assessmentId,
        question_text: questionForm.question_text,
        question_type: questionForm.question_type,
        points: questionForm.points,
        explanation: questionForm.explanation,
        question_order: editingQuestion ? editingQuestion.question_order : questions.length + 1
      };

      let questionId = editingQuestion?.id;
      if (editingQuestion) {
        const { error } = await supabase.from('assessment_questions').update(questionData).eq('id', editingQuestion.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('assessment_questions').insert(questionData).select().single();
        if (error) throw error;
        questionId = data.id;
      }

      // Only handle options for quiz questions
      if (questionId && assessmentType === 'quiz' && ['multiple_choice', 'true_false'].includes(questionForm.question_type)) {
        await supabase.from('question_options').delete().eq('question_id', questionId);
        const validOptions = questionForm.options.filter(opt => opt.option_text.trim()).map((opt, index) => ({
          question_id: questionId,
          option_text: opt.option_text.trim(),
          is_correct: opt.is_correct,
          option_order: index + 1
        }));
        if (validOptions.length > 0) {
          const { error: optionsError } = await supabase.from('question_options').insert(validOptions);
          if (optionsError) throw optionsError;
        }
      }

      await onQuestionsChange();
      setDialogOpen(false);
      setEditingQuestion(null);
      resetForm();
      toast({ title: "Success", description: `${getItemLabel()} ${editingQuestion ? 'updated' : 'saved'} successfully.` });

    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error", description: `Failed to save ${getItemLabel().toLowerCase()}.`, variant: "destructive" });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase.from('assessment_questions').delete().eq('id', questionId);
      if (error) throw error;
      await onQuestionsChange();
      toast({ title: "Success", description: `${getItemLabel()} deleted successfully.` });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Error", description: `Failed to delete ${getItemLabel().toLowerCase()}.`, variant: "destructive" });
    }
  };

  // Helper functions for labels based on assessment type
  const getItemLabel = () => {
    switch (assessmentType) {
      case 'quiz': return 'Question';
      case 'assignment': return 'Deliverable';
      case 'project': return 'Milestone';
      default: return 'Requirement';
    }
  };

  const getItemIcon = () => {
    switch (assessmentType) {
      case 'quiz': return FileText;
      case 'assignment': return CheckCircle;
      case 'project': return Target;
      default: return FileText;
    }
  };

  const addOption = () => setQuestionForm(prev => ({ ...prev, options: [...prev.options, { option_text: '', is_correct: false }] }));
  const removeOption = (index: number) => {
    if (questionForm.options.length > 2) {
      setQuestionForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
    }
  };
  const updateOption = (index: number, field: string, value: unknown) => {
    const newOptions = [...questionForm.options];
    if (field === 'is_correct') {
      if (value) {
        for (let i = 0; i < newOptions.length; i++) {
          newOptions[i] = { ...newOptions[i], is_correct: i === index };
        }
      } else {
        newOptions[index] = { ...newOptions[index], is_correct: false };
      }
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value } as QuestionOption;
    }
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const ItemIcon = getItemIcon();

  // Render Quiz Questions UI
  const renderQuizForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question_text">Question *</Label>
        <Textarea id="question_text" value={questionForm.question_text} onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} placeholder="Enter question..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="question_type">Question Type</Label>
          <Select value={questionForm.question_type} onValueChange={(value) => setQuestionForm({ ...questionForm, question_type: value, options: value === 'true_false' ? [{ option_text: 'True', is_correct: false }, { option_text: 'False', is_correct: false }] : questionForm.options })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
              <SelectItem value="true_false">True/False</SelectItem>
              <SelectItem value="essay">Essay</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="points">Points</Label>
          <Input id="points" type="number" min="0.5" step="0.5" value={questionForm.points} onChange={(e) => setQuestionForm({ ...questionForm, points: parseFloat(e.target.value) || 1 })} />
        </div>
      </div>
      {['multiple_choice', 'true_false'].includes(questionForm.question_type) && (
        <div>
          <Label>Answer Options</Label>
          <div className="space-y-2 mt-2">
            {questionForm.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Switch checked={option.is_correct} onCheckedChange={(checked) => updateOption(index, 'is_correct', checked)} aria-label={`Mark option ${index + 1} as correct`} />
                <Input value={option.option_text} onChange={(e) => updateOption(index, 'option_text', e.target.value)} placeholder={`Option ${index + 1}`} disabled={questionForm.question_type === 'true_false' && index < 2} />
                {questionForm.question_type === 'multiple_choice' && questionForm.options.length > 2 && (
                  <Button variant="ghost" size="sm" onClick={() => removeOption(index)}><X className="w-4 h-4" /></Button>
                )}
              </div>
            ))}
            {questionForm.question_type === 'multiple_choice' && (
              <Button variant="outline" size="sm" onClick={addOption}><Plus className="w-4 h-4 mr-2" /> Add Option</Button>
            )}
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="explanation">Explanation (Optional)</Label>
        <Textarea id="explanation" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="Explain the correct answer..." rows={2} />
      </div>
    </div>
  );

  // Render Assignment Deliverables UI
  const renderAssignmentForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question_text">Deliverable Title *</Label>
        <Input id="question_text" value={questionForm.question_text} onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} placeholder="e.g., Submit research document" />
      </div>
      <div>
        <Label htmlFor="explanation">Description & Requirements</Label>
        <Textarea id="explanation" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="Describe what needs to be submitted, format requirements, etc." rows={4} />
      </div>
      <div>
        <Label htmlFor="points">Points</Label>
        <Input id="points" type="number" min="1" value={questionForm.points} onChange={(e) => setQuestionForm({ ...questionForm, points: parseFloat(e.target.value) || 10 })} />
      </div>
    </div>
  );

  // Render Project Milestones UI
  const renderProjectForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question_text">Milestone Title *</Label>
        <Input id="question_text" value={questionForm.question_text} onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} placeholder="e.g., Complete project proposal" />
      </div>
      <div>
        <Label htmlFor="explanation">Milestone Description & Criteria</Label>
        <Textarea id="explanation" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="Describe the milestone deliverables, success criteria, checkpoint requirements..." rows={4} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="question_type">Milestone Type</Label>
          <Select value={questionForm.question_type} onValueChange={(value) => setQuestionForm({ ...questionForm, question_type: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="milestone">Checkpoint</SelectItem>
              <SelectItem value="deliverable">Deliverable</SelectItem>
              <SelectItem value="presentation">Presentation</SelectItem>
              <SelectItem value="review">Review Meeting</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="points">Points</Label>
          <Input id="points" type="number" min="1" value={questionForm.points} onChange={(e) => setQuestionForm({ ...questionForm, points: parseFloat(e.target.value) || 20 })} />
        </div>
      </div>
    </div>
  );

  // Render default/practical form
  const renderDefaultForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="question_text">Requirement *</Label>
        <Textarea id="question_text" value={questionForm.question_text} onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} placeholder="Enter requirement details..." rows={3} />
      </div>
      <div>
        <Label htmlFor="explanation">Additional Notes</Label>
        <Textarea id="explanation" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} placeholder="Any additional instructions or notes..." rows={2} />
      </div>
      <div>
        <Label htmlFor="points">Points</Label>
        <Input id="points" type="number" min="1" value={questionForm.points} onChange={(e) => setQuestionForm({ ...questionForm, points: parseFloat(e.target.value) || 10 })} />
      </div>
    </div>
  );

  const renderForm = () => {
    switch (assessmentType) {
      case 'quiz': return renderQuizForm();
      case 'assignment': return renderAssignmentForm();
      case 'project': return renderProjectForm();
      default: return renderDefaultForm();
    }
  };

  // Render item display based on type
  const renderItemDisplay = (question: Question, index: number) => {
    if (assessmentType === 'quiz') {
      return (
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Q{index + 1}</Badge>
            <Badge variant="secondary" className="text-xs">{question.points} pts</Badge>
            <p className="font-medium">{question.question_text}</p>
          </div>
          {question.options && question.options.length > 0 && (
            <div className="pl-8 space-y-1">
              {question.options.map(opt => (
                <p key={opt.id} className={`text-sm ${opt.is_correct ? 'text-green-600 font-semibold' : 'text-muted-foreground'}`}>
                  {opt.is_correct ? '✓' : '○'} {opt.option_text}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    } else if (assessmentType === 'assignment') {
      return (
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-500/10">
              <CheckCircle className="w-3 h-3 mr-1" />
              {index + 1}
            </Badge>
            <Badge variant="secondary" className="text-xs">{question.points} pts</Badge>
            <p className="font-medium">{question.question_text}</p>
          </div>
          {question.explanation && (
            <p className="pl-8 text-sm text-muted-foreground">{question.explanation}</p>
          )}
        </div>
      );
    } else if (assessmentType === 'project') {
      return (
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-purple-500/10">
              <Target className="w-3 h-3 mr-1" />
              M{index + 1}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">{question.question_type}</Badge>
            <Badge variant="secondary" className="text-xs">{question.points} pts</Badge>
            <p className="font-medium">{question.question_text}</p>
          </div>
          {question.explanation && (
            <p className="pl-8 text-sm text-muted-foreground">{question.explanation}</p>
          )}
        </div>
      );
    } else {
      return (
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{index + 1}</Badge>
            <Badge variant="secondary" className="text-xs">{question.points} pts</Badge>
            <p className="font-medium">{question.question_text}</p>
          </div>
          {question.explanation && (
            <p className="pl-8 text-sm text-muted-foreground">{question.explanation}</p>
          )}
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-md font-semibold flex items-center gap-2">
          <ItemIcon className="w-4 h-4" />
          {getItemLabel()}s ({questions.length})
        </h4>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditingQuestion(null); resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add {getItemLabel()}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingQuestion ? `Edit ${getItemLabel()}` : `Add ${getItemLabel()}`}</DialogTitle></DialogHeader>
            {renderForm()}
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveQuestion}>{editingQuestion ? `Update ${getItemLabel()}` : `Add ${getItemLabel()}`}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground"><p>No {getItemLabel().toLowerCase()}s added yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  {renderItemDisplay(question, index)}
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(question)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(question.id)}><Trash2 className="w-4 h-4" /></Button>
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