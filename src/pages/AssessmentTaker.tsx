import { useState, useEffect,useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { MainNav } from '@/components/navigation/MainNav';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  ArrowLeft,
  Send
} from 'lucide-react';

interface AssessmentTemplate {
  id: string;
  title: string;
  description: string;
  assessment_type: string;
  passing_score: number;
  time_limit_minutes: number;
  instructions: string;
  course_id: string;
  is_mandatory: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  explanation: string;
  question_order: number;
  question_options: {
    id: string;
    option_text: string;
    is_correct: boolean;
    option_order: number;
  }[];
}

export default function AssessmentTaker() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [assessment, setAssessment] = useState<AssessmentTemplate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  const fetchAssessmentData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch assessment template
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessment_templates')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) throw assessmentError;

      // Fetch questions with options
      const { data: questionsData, error: questionsError } = await supabase
        .from('assessment_questions')
        .select(`
          *,
          question_options:question_options!fk_question_options_question (*)
        `)
        .eq('assessment_template_id', assessmentId)
        .order('question_order');

      if (questionsError) throw questionsError;

      setAssessment(assessmentData);
      setQuestions(questionsData || []);
      setTimeRemaining((assessmentData.time_limit_minutes || 60) * 60);

    } catch (error) {
      console.error('Error fetching assessment data:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [assessmentId, toast]);

  const calculateScore = useCallback(() => {
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach(q => {
      totalPoints += q.points || 0;
      const correctOptions = q.question_options.filter(opt => opt.is_correct).map(opt => opt.id);
      const selectedOptions = answers[q.id] || [];

      if (q.question_type === 'multiple_choice') { // Single correct answer
        if (correctOptions.length === 1 && selectedOptions.length === 1 && selectedOptions[0] === correctOptions[0]) {
          earnedPoints += q.points || 0;
        }
      } else if (q.question_type === 'multiple_select') { // Multiple correct answers
        const isCorrect = 
          correctOptions.length === selectedOptions.length &&
          correctOptions.every(opt => selectedOptions.includes(opt));
        if (isCorrect) {
          earnedPoints += q.points || 0;
        }
      }
    });

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    return { totalPoints, earnedPoints, percentage };

  }, [questions, answers]);

  const handleSubmitAssessment = useCallback(async () => {
    if (!user || !assessment) return;

    try {
      setSubmitting(true);
      const { totalPoints, earnedPoints, percentage } = calculateScore();
      const isPassed = percentage >= assessment.passing_score;

      // Create course assessment record
      const { error } = await supabase
        .from('course_assessments')
        .insert({
          employee_id: user.id,
          course_id: assessment.course_id,
          assessment_template_id: assessment.id,
          assessment_type: assessment.assessment_type,
          total_score: earnedPoints,
          percentage: percentage,
          passing_score: assessment.passing_score,
          is_mandatory: assessment.is_mandatory,
          status: 'Completed',
          grade: percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : 'F',
          completion_date: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: isPassed ? "Assessment Completed!" : "Assessment Completed",
        description: `You scored ${percentage.toFixed(1)}% (${earnedPoints}/${totalPoints} points). ${isPassed ? 'Congratulations!' : 'You can retake this assessment.'}`,
        variant: isPassed ? "default" : "destructive",
      });

      navigate(`/courses/${assessment.course_id}`);

    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, assessment, calculateScore, navigate, toast]);

  useEffect(() => {
    if (assessmentId && user) {
      fetchAssessmentData();
    }
  }, [assessmentId, user, fetchAssessmentData]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isStarted && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmitAssessment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, timeRemaining, handleSubmitAssessment]);

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: [value]
    }));
  }, []);

  const handleMultipleAnswerChange = useCallback((questionId: string, optionId: string, isChecked: boolean) => {
    setAnswers(prev => {
      const existingAnswers = prev[questionId] || [];
      if (isChecked) {
        return {
          ...prev,
          [questionId]: [...existingAnswers, optionId]
        };
      } else {
        return {
          ...prev,
          [questionId]: existingAnswers.filter(id => id !== optionId)
        };
      }
    });
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Assessment not found</p>
              <Button onClick={() => navigate('/courses')} className="mt-4">
                Back to Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8 max-w-4xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/courses/${assessment.course_id}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <Badge variant={assessment.is_mandatory ? "destructive" : "secondary"}>
                  {assessment.is_mandatory ? 'Mandatory' : 'Optional'}
                </Badge>
                <Badge variant="outline">
                  {assessment.assessment_type}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{assessment.title}</CardTitle>
              {assessment.description && (
                <p className="text-muted-foreground">{assessment.description}</p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Time Limit</p>
                    <p className="text-sm text-muted-foreground">
                      {assessment.time_limit_minutes} minutes
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Passing Score</p>
                    <p className="text-sm text-muted-foreground">
                      {assessment.passing_score}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Questions</p>
                    <p className="text-sm text-muted-foreground">
                      {questions.length} questions
                    </p>
                  </div>
                </div>
              </div>

              {assessment.instructions && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Instructions:</h4>
                  <p className="text-sm">{assessment.instructions}</p>
                </div>
              )}

              <div className="flex justify-center">
                <Button 
                  onClick={() => setIsStarted(true)}
                  size="lg"
                  className="px-8"
                >
                  Start Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No questions found for this assessment</p>
              <Button onClick={() => navigate(`/courses/${assessment.course_id}`)} className="mt-4">
                Back to Course
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestionData = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <div className="container mx-auto py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{assessment.title}</h1>
            <p className="text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span className={`font-mono ${timeRemaining < 300 ? 'text-destructive' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <Progress 
              value={(currentQuestion + 1) / questions.length * 100} 
              className="w-32" 
            />
          </div>
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              {currentQuestionData.question_text}
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Points: {currentQuestionData.points}</span>
              <Badge variant="outline">
                {currentQuestionData.question_type === 'multiple_choice' ? 'Single Choice' : 'Multiple Choice'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            {currentQuestionData.question_type === 'multiple_choice' ? (
              <RadioGroup
                value={answers[currentQuestionData.id]?.[0] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestionData.id, value)}
              >
                {currentQuestionData.question_options
                  .sort((a, b) => a.option_order - b.option_order)
                  .map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                {currentQuestionData.question_options
                  .sort((a, b) => a.option_order - b.option_order)
                  .map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={answers[currentQuestionData.id]?.includes(option.id) || false}
                      onCheckedChange={(checked) => 
                        handleMultipleAnswerChange(currentQuestionData.id, option.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          
          <div className="flex space-x-2">
            {currentQuestion < questions.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmitAssessment}
                disabled={submitting}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Assessment'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}