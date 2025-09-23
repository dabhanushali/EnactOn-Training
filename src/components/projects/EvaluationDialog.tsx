import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-utils";
import { useState } from "react";
import { toast } from "sonner";

interface EvaluationDialogProps {
  submissionId: string;
  projectId: string;
  assignmentId: string;
  employeeId: string;
  onEvaluated: () => void;
}

export function EvaluationDialog({ submissionId, projectId, assignmentId, employeeId, onEvaluated }: EvaluationDialogProps) {
  const { user } = useAuth();
  const [technicalScore, setTechnicalScore] = useState(3);
  const [qualityScore, setQualityScore] = useState(3);
  const [timelineScore, setTimelineScore] = useState(3);
  const [communicationScore, setCommunicationScore] = useState(3);
  const [innovationScore, setInnovationScore] = useState(3);
  const [strengths, setStrengths] = useState("");
  const [areasForImprovement, setAreasForImprovement] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (!strengths || !areasForImprovement) {
        toast.warning("Please fill out all feedback fields.");
        return;
    }

    setEvaluating(true);

    const scores = [technicalScore, qualityScore, timelineScore, communicationScore, innovationScore];
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const { error } = await supabase.from('project_evaluations' as any).insert([
      {
        submission_id: submissionId,
        project_id: projectId,
        employee_id: employeeId,
        evaluator_id: user.id,
        technical_score: technicalScore,
        quality_score: qualityScore,
        timeline_score: timelineScore,
        communication_score: communicationScore,
        innovation_score: innovationScore,
        overall_score: parseFloat(overallScore.toFixed(2)),
        strengths: strengths,
        areas_for_improvement: areasForImprovement,
      },
    ]);

    if (error) {
      console.error("Error saving evaluation:", error);
      toast.error(`Evaluation failed: ${error.message}`);
    } else {
      // Also update the assignment status to Evaluated
      await supabase.from('project_assignments' as any).update({ status: 'Evaluated' }).eq('id', assignmentId);
      toast.success("Evaluation submitted successfully!");
      onEvaluated();
    }

    setEvaluating(false);
  };

  const ScoreInput = ({ label, value, setValue }: { label: string, value: number, setValue: (value: number) => void }) => (
    <div className="grid grid-cols-2 items-center">
        <Label>{label}</Label>
        <Input 
            type="number" 
            min={1} 
            max={5} 
            value={value} 
            onChange={(e) => setValue(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))} 
        />
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Evaluate</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evaluate Submission</DialogTitle>
          <DialogDescription>
            Provide your feedback and scores (1-5) for this submission.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <ScoreInput label="Technical" value={technicalScore} setValue={setTechnicalScore} />
            <ScoreInput label="Quality" value={qualityScore} setValue={setQualityScore} />
            <ScoreInput label="Timeline" value={timelineScore} setValue={setTimelineScore} />
            <ScoreInput label="Communication" value={communicationScore} setValue={setCommunicationScore} />
            <ScoreInput label="Innovation" value={innovationScore} setValue={setInnovationScore} />
            <hr className="my-2"/>
          <Textarea placeholder="Strengths" value={strengths} onChange={(e) => setStrengths(e.target.value)} />
          <Textarea placeholder="Areas for Improvement" value={areasForImprovement} onChange={(e) => setAreasForImprovement(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={evaluating}>
            {evaluating ? "Saving..." : "Submit Evaluation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
