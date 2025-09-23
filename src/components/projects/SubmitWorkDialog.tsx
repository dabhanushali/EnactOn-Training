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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-utils";
import { useState } from "react";
import { toast } from 'sonner';

interface SubmitWorkDialogProps {
  assignmentId: string;
  onSubmited: () => void;
  assignmentStatus?: string;
}

export function SubmitWorkDialog({ assignmentId, onSubmited, assignmentStatus }: SubmitWorkDialogProps) {
  const { user } = useAuth();
  const [submissionLink, setSubmissionLink] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (!submissionLink) {
        toast.warning("Please provide a submission link.");
        return;
    }

    setSubmitting(true);

    const { error: dbError } = await supabase
      .from('project_milestone_submissions' as any)
      .insert([
        {
          assignment_id: assignmentId,
          submitted_by: user.id,
          submission_content: comments,
          file_url: submissionLink,
        },
      ]);

    if (dbError) {
      console.error("Error saving submission:", dbError);
      toast.error(`Submission failed: ${dbError.message}`);
    } else {
      toast.success("Work submitted successfully!");
      // Also update the assignment status
      await supabase.from('project_assignments' as any).update({ status: 'Submitted' }).eq('id', assignmentId);
      onSubmited();
    }

    setSubmitting(false);
  };

  const isSubmitted = assignmentStatus === 'Submitted';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={isSubmitted}>
          {isSubmitted ? 'Already Submitted' : 'Submit Work'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Your Work</DialogTitle>
          <DialogDescription>
            Provide a link to your work (e.g., GitHub, live demo).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <Input 
                placeholder="https://github.com/your-repo" 
                value={submissionLink}
                onChange={(e) => setSubmissionLink(e.target.value)}
            />
          <Textarea
            placeholder="Add any comments about your submission..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
