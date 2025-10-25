
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
  const [originalAttendees, setOriginalAttendees] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open && sessionId) {
      const fetchData = async () => {
        // Fetch trainees
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('role_name', 'Trainee')
          .single();

        if (roleError || !roleData) {
          return toast.error("Could not fetch list of trainees.");
        }

        const { data: traineesData, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('role_id', roleData.id);

        if (error) {
          toast.error("Could not fetch list of trainees.");
        } else {
          setTrainees(traineesData as Profile[]);
        }

        // Fetch current session attendees to pre-populate
        const { data: sessionData, error: sessionError } = await supabase
          .from('training_sessions')
          .select('attendees')
          .eq('id', sessionId)
          .single();

        if (!sessionError && sessionData?.attendees) {
          const attendees = Array.isArray(sessionData.attendees) 
            ? sessionData.attendees as string[]
            : [];
          setOriginalAttendees(attendees);
          setSelectedTrainees(attendees); // Pre-select already assigned
        }
      };

      fetchData();
    }
  }, [open, sessionId]);

  const handleSelectTrainee = (traineeId: string) => {
    setSelectedTrainees(prev => 
      prev.includes(traineeId) 
        ? prev.filter(id => id !== traineeId) 
        : [...prev, traineeId]
    );
  };

  const handleSubmit = async () => {
    if (!sessionId) {
      return toast.warning("Session ID is missing.");
    }

    setAssigning(true);

    // Calculate newly added trainees (need email notifications)
    const newlyAdded = selectedTrainees.filter(id => !originalAttendees.includes(id));
    const removed = originalAttendees.filter(id => !selectedTrainees.includes(id));
    
    // Update the attendees array with currently selected trainees
    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({ attendees: selectedTrainees })
      .eq('id', sessionId);

    if (updateError) {
      toast.error(`Failed to update participants: ${updateError.message}`);
      setAssigning(false);
      return;
    }

    // Send email notifications to newly added trainees ONLY
    if (newlyAdded.length > 0) {
      try {
        await supabase.functions.invoke('notify-training-session', {
          body: { 
            sessionId,
            attendeeIds: newlyAdded
          }
        });
      } catch (error) {
        console.error('Error sending notifications:', error);
        // Don't fail the update if email fails
      }
    }

    const addedCount = newlyAdded.length;
    const removedCount = removed.length;
    let message = "Session participants updated!";
    if (addedCount > 0 && removedCount > 0) {
      message = `${addedCount} participant(s) added and ${removedCount} removed. ${addedCount} notified.`;
    } else if (addedCount > 0) {
      message = `${addedCount} participant(s) added and notified.`;
    } else if (removedCount > 0) {
      message = `${removedCount} participant(s) removed.`;
    }
    
    toast.success(message);
    onSessionAssigned();
    setSelectedTrainees([]);
    setOriginalAttendees([]);
    onOpenChange(false);
    setAssigning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Session Participants</DialogTitle>
          <DialogDescription>
            Select or deselect trainees for this session. Only newly added participants will receive email notifications.
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
          <Button onClick={handleSubmit} disabled={assigning}>
            {assigning ? "Updating..." : "Update Participants"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
