
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
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/hooks/auth-utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open && projectId) {
      const fetchTrainees = async () => {
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('role_name', 'Intern')
          .single();

        if (roleError || !roleData) {
          console.error("Error fetching trainee role id:", roleError);
          toast.error("Could not fetch list of trainees.");
          return;
        }

        // Get already assigned trainee IDs for this project
        const { data: assignedData, error: assignedError } = await supabase
          .from('project_assignments')
          .select('assignee_id')
          .eq('project_id', projectId);

        if (assignedError) {
          console.error("Error fetching assigned trainees:", assignedError);
          toast.error("Could not fetch assigned trainees.");
          return;
        }

        const assignedIds = assignedData?.map(a => a.assignee_id) || [];

        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role:roles(role_name)')
          .eq('role_id', roleData.id);

        if (error) {
          console.error("Error fetching trainees:", error);
          toast.error("Could not fetch list of trainees.");
        } else {
          // Filter out admin users, only show interns, and exclude already assigned ones
          const filteredTrainees = (data as any[])?.filter(trainee => 
            trainee.role?.role_name === 'Intern' && !assignedIds.includes(trainee.id)
          ) || [];
          setTrainees(filteredTrainees);
        }
      };

      fetchTrainees();
    }
  }, [open, projectId]);

  const filteredTrainees = trainees.filter(trainee =>
    `${trainee.first_name} ${trainee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectTrainee = (traineeId: string) => {
    setSelectedTrainees(prev => 
      prev.includes(traineeId) 
        ? prev.filter(id => id !== traineeId) 
        : [...prev, traineeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTrainees.length === filteredTrainees.length) {
      setSelectedTrainees([]);
    } else {
      setSelectedTrainees(filteredTrainees.map(t => t.id));
    }
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Project to Trainees
          </DialogTitle>
          <DialogDescription>
            Select the trainees you want to assign this project to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search trainees by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          {filteredTrainees.length > 0 && (
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="select-all"
                checked={selectedTrainees.length === filteredTrainees.length && filteredTrainees.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({filteredTrainees.length} trainees)
              </Label>
              {selectedTrainees.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {selectedTrainees.length} selected
                </Badge>
              )}
            </div>
          )}

          {/* Trainee List */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredTrainees.length > 0 ? (
              filteredTrainees.map(trainee => (
                <Card key={trainee.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={`trainee-${trainee.id}`}
                        onCheckedChange={() => handleSelectTrainee(trainee.id)}
                        checked={selectedTrainees.includes(trainee.id)}
                      />
                      <Label 
                        htmlFor={`trainee-${trainee.id}`} 
                        className="font-medium cursor-pointer flex-1"
                      >
                        {trainee.first_name} {trainee.last_name}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {searchTerm ? 'No trainees found matching your search.' : 'No trainees available.'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={assigning || selectedTrainees.length === 0}>
            {assigning ? "Assigning..." : `Assign to ${selectedTrainees.length} Trainee(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
