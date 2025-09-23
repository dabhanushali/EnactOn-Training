
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface AssignSessionDialogProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionAssigned: () => void;
}

export function AssignSessionDialog({ sessionId, open, onOpenChange, onSessionAssigned }: AssignSessionDialogProps) {
  const [trainees, setTrainees] = useState<Profile[]>([]);
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchTrainees = async () => {
        // In a real app, you might want to filter out trainees already assigned.
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('role_name', 'Trainee')
          .single();

        if (roleError || !roleData) {
          return toast.error("Could not fetch list of trainees.");
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('role_id', roleData.id);

        if (error) {
          toast.error("Could not fetch list of trainees.");
        } else {
          setTrainees(data as Profile[]);
        }
      };

      fetchTrainees();
    }
  }, [open]);

  const handleSelectTrainee = (traineeId: string) => {
    setSelectedTrainees(prev => 
      prev.includes(traineeId) 
        ? prev.filter(id => id !== traineeId) 
        : [...prev, traineeId]
    );
  };

  const handleSubmit = async () => {
    if (!sessionId || selectedTrainees.length === 0) {
        return toast.warning("Please select at least one trainee.");
    }

    setAssigning(true);

    // 1. Fetch the current attendees list
    const { data: currentSession, error: fetchError } = await supabase
      .from('training_sessions')
      .select('attendees')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      setAssigning(false);
      return toast.error(`Failed to get current session data: ${fetchError.message}`);
    }

    // 2. Merge and deduplicate attendees
    const currentAttendees = Array.isArray(currentSession.attendees) ? currentSession.attendees : [];
    const newAttendees = [...new Set([...currentAttendees as string[], ...selectedTrainees])];

    // 3. Update the record
    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({ attendees: newAttendees })
      .eq('id', sessionId);

    if (updateError) {
      toast.error(`Failed to assign trainees: ${updateError.message}`);
    } else {
      toast.success("Trainees assigned successfully!");
      onSessionAssigned();
      setSelectedTrainees([]);
      onOpenChange(false);
    }

    setAssigning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Session to Trainees</DialogTitle>
          <DialogDescription>
            Select the trainees you want to assign this session to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
            {trainees.length > 0 ? trainees.map(trainee => (
                <div key={trainee.id} className="flex items-center space-x-2">
                    <Checkbox 
                        id={`trainee-${trainee.id}`}
                        onCheckedChange={() => handleSelectTrainee(trainee.id)}
                        checked={selectedTrainees.includes(trainee.id)}
                    />
                    <Label htmlFor={`trainee-${trainee.id}`} className="font-normal">
                        {trainee.first_name} {trainee.last_name}
                    </Label>
                </div>
            )) : <p>No trainees found.</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={assigning || selectedTrainees.length === 0}>
            {assigning ? "Assigning..." : `Assign to ${selectedTrainees.length} Trainee(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
