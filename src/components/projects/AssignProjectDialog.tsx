
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
import { useAuth } from "@/hooks/auth-utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface AssignProjectDialogProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectAssigned: () => void;
}

export function AssignProjectDialog({ projectId, open, onOpenChange, onProjectAssigned }: AssignProjectDialogProps) {
  const { user } = useAuth();
  const [trainees, setTrainees] = useState<Profile[]>([]);
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchTrainees = async () => {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('role_name', 'Trainee')
          .single();

        if (roleError || !roleData) {
          console.error("Error fetching trainee role id:", roleError);
          toast.error("Could not fetch list of trainees.");
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('role_id', roleData.id);

        if (error) {
          console.error("Error fetching trainees:", error);
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
    if (!user || !projectId || selectedTrainees.length === 0) {
        toast.warning("Please select at least one trainee.");
        return;
    }

    setAssigning(true);

    const assignments = selectedTrainees.map(traineeId => ({
      project_id: projectId,
      assignee_id: traineeId,
      assigned_by: user.id,
    }));

    const { error } = await supabase.from('project_assignments' as any).insert(assignments);

    if (error) {
      console.error("Error assigning project:", error);
      toast.error(`Error assigning project: ${error.message}`);
    } else {
      toast.success("Project assigned successfully!");
      onProjectAssigned();
      setSelectedTrainees([]);
      onOpenChange(false);
    }

    setAssigning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Project to Trainees</DialogTitle>
          <DialogDescription>
            Select the trainees you want to assign this project to.
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
