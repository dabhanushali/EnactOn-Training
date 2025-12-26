import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, FileQuestion, ClipboardList, Briefcase, ArrowLeft, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAssessmentGeneratorProps {
  courseId: string;
  courseName?: string;
  onAssessmentCreated: () => void;
  onClose: () => void;
}

type AssessmentType = 'quiz' | 'assignment' | 'project';

interface GeneratedAssessment {
  assessment_type: AssessmentType;
  title: string;
  description: string;
  instructions: string;
  passing_score: number;
  time_limit_minutes: number;
  is_mandatory: boolean;
  questions?: Array<{
    question_text: string;
    question_type: string;
    points: number;
    question_order: number;
    explanation: string;
    options: Array<{
      option_text: string;
      is_correct: boolean;
      option_order: number;
    }>;
  }>;
  deliverables?: string[];
  milestones?: string[];
}

export function AIAssessmentGenerator({ courseId, courseName, onAssessmentCreated, onClose }: AIAssessmentGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'select-type' | 'enter-url' | 'preview'>('select-type');
  const [selectedType, setSelectedType] = useState<AssessmentType | null>(null);
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedAssessment, setGeneratedAssessment] = useState<GeneratedAssessment | null>(null);

  const assessmentTypes = [
    {
      type: 'quiz' as AssessmentType,
      label: 'Quiz',
      description: 'Multiple choice and true/false questions to test knowledge',
      icon: FileQuestion,
      color: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500'
    },
    {
      type: 'assignment' as AssessmentType,
      label: 'Assignment',
      description: 'Practical tasks with specific deliverables',
      icon: ClipboardList,
      color: 'bg-green-500/10 border-green-500/30 hover:border-green-500'
    },
    {
      type: 'project' as AssessmentType,
      label: 'Project',
      description: 'Comprehensive project with milestones and deliverables',
      icon: Briefcase,
      color: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500'
    }
  ];

  const handleTypeSelect = (type: AssessmentType) => {
    setSelectedType(type);
    setStep('enter-url');
  };

  const handleGenerate = async () => {
    if (!url.trim() || !selectedType) {
      toast({ title: 'Error', description: 'Please enter a valid URL', variant: 'destructive' });
      return;
    }

    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-assessment-from-url', {
        body: {
          url: url.trim(),
          assessmentType: selectedType,
          courseId,
          courseName
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate assessment');
      }

      setGeneratedAssessment(data.assessment);
      setStep('preview');
      toast({ title: 'Success', description: 'Assessment generated! Review and save.' });

    } catch (error) {
      console.error('Error generating assessment:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to generate assessment', 
        variant: 'destructive' 
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedAssessment || !user) return;

    try {
      setSaving(true);

      // Create assessment template
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessment_templates')
        .insert({
          course_id: courseId,
          created_by: user.id,
          title: generatedAssessment.title,
          description: generatedAssessment.description,
          instructions: generatedAssessment.instructions,
          assessment_type: generatedAssessment.assessment_type,
          passing_score: generatedAssessment.passing_score,
          time_limit_minutes: generatedAssessment.time_limit_minutes,
          is_mandatory: generatedAssessment.is_mandatory
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // If quiz, create questions and options
      if (generatedAssessment.assessment_type === 'quiz' && generatedAssessment.questions) {
        for (const q of generatedAssessment.questions) {
          const { data: question, error: questionError } = await supabase
            .from('assessment_questions')
            .insert({
              assessment_template_id: assessment.id,
              question_text: q.question_text,
              question_type: q.question_type,
              points: q.points,
              question_order: q.question_order,
              explanation: q.explanation
            })
            .select()
            .single();

          if (questionError) throw questionError;

          // Insert options
          if (q.options && q.options.length > 0) {
            const optionsToInsert = q.options.map(opt => ({
              question_id: question.id,
              option_text: opt.option_text,
              is_correct: opt.is_correct,
              option_order: opt.option_order
            }));

            const { error: optionsError } = await supabase
              .from('question_options')
              .insert(optionsToInsert);

            if (optionsError) throw optionsError;
          }
        }
      }

      toast({ title: 'Success', description: 'Assessment saved successfully!' });
      onAssessmentCreated();

    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to save assessment', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 'enter-url') {
      setStep('select-type');
      setSelectedType(null);
    } else if (step === 'preview') {
      setStep('enter-url');
      setGeneratedAssessment(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {step !== 'select-type' && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assessment Generator
          </h3>
          <p className="text-sm text-muted-foreground">
            {step === 'select-type' && 'Select the type of assessment you want to create'}
            {step === 'enter-url' && 'Enter the URL to generate assessment from'}
            {step === 'preview' && 'Review the generated assessment'}
          </p>
        </div>
      </div>

      {/* Step 1: Select Type */}
      {step === 'select-type' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assessmentTypes.map(({ type, label, description, icon: Icon, color }) => (
            <Card
              key={type}
              className={cn(
                'cursor-pointer transition-all border-2',
                color,
                selectedType === type && 'ring-2 ring-primary'
              )}
              onClick={() => handleTypeSelect(type)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Enter URL */}
      {step === 'enter-url' && selectedType && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Content Source URL
              </CardTitle>
              <CardDescription>
                Enter a Notion, Google Docs, or any web page URL. We'll extract the content and create a {selectedType} from it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://notion.so/your-page or https://docs.google.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={generating || !url.trim()}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Assessment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && generatedAssessment && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{generatedAssessment.title}</CardTitle>
              <CardDescription>{generatedAssessment.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium capitalize">{generatedAssessment.assessment_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Passing Score:</span>
                  <p className="font-medium">{generatedAssessment.passing_score}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time Limit:</span>
                  <p className="font-medium">{generatedAssessment.time_limit_minutes} min</p>
                </div>
                {generatedAssessment.questions && (
                  <div>
                    <span className="text-muted-foreground">Questions:</span>
                    <p className="font-medium">{generatedAssessment.questions.length}</p>
                  </div>
                )}
              </div>

              {generatedAssessment.instructions && (
                <div>
                  <Label>Instructions</Label>
                  <p className="text-sm text-muted-foreground mt-1">{generatedAssessment.instructions}</p>
                </div>
              )}

              {/* Quiz Questions Preview */}
              {generatedAssessment.questions && generatedAssessment.questions.length > 0 && (
                <div>
                  <Label>Questions Preview</Label>
                  <div className="mt-2 space-y-3 max-h-64 overflow-y-auto">
                    {generatedAssessment.questions.slice(0, 5).map((q, idx) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">
                          {idx + 1}. {q.question_text}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {q.options.map((opt, optIdx) => (
                            <p key={optIdx} className={cn(
                              'text-xs px-2 py-1 rounded',
                              opt.is_correct ? 'bg-green-500/10 text-green-600' : 'bg-muted'
                            )}>
                              {opt.option_text}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                    {generatedAssessment.questions.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        ...and {generatedAssessment.questions.length - 5} more questions
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Deliverables Preview */}
              {generatedAssessment.deliverables && generatedAssessment.deliverables.length > 0 && (
                <div>
                  <Label>Deliverables</Label>
                  <ul className="mt-2 space-y-1">
                    {generatedAssessment.deliverables.map((d, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">• {d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Milestones Preview */}
              {generatedAssessment.milestones && generatedAssessment.milestones.length > 0 && (
                <div>
                  <Label>Milestones</Label>
                  <ul className="mt-2 space-y-1">
                    {generatedAssessment.milestones.map((m, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">• {m}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleBack}>Back</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Assessment'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
