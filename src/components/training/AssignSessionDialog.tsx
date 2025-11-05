
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredTrainees = trainees.filter(trainee => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${trainee.first_name} ${trainee.last_name}`.toLowerCase();
    return fullName.includes(searchLower);
  });

  const handleSelectTrainee = (traineeId: string) => {
    setSelectedTrainees(prev => 
      prev.includes(traineeId) 
        ? prev.filter(id => id !== traineeId) 
        : [...prev, traineeId]
    );
  };

  const handleSelectAll = () => {
    const allTraineeIds = filteredTrainees.map(t => t.id);
    if (selectedTrainees.length === allTraineeIds.length) {
      setSelectedTrainees([]);
    } else {
      setSelectedTrainees(allTraineeIds);
    }
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
        // Call CRM notification (with email fallback)
        await supabase.functions.invoke('notify-training-session-crm', {
          body: { 
            sessionId,
            attendeeIds: newlyAdded
          }
        });
        
        // Also send regular trainee notifications
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

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trainees by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          {filteredTrainees.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-trainees"
                  checked={selectedTrainees.length === filteredTrainees.length && filteredTrainees.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all-trainees" className="text-sm font-normal">
                  Select All ({filteredTrainees.length})
                </Label>
              </div>
              
              {selectedTrainees.length > 0 && (
                <Badge variant="secondary">
                  {selectedTrainees.length} selected
                </Badge>
              )}
            </div>
          )}

          {/* Trainee List */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {filteredTrainees.length > 0 ? (
              filteredTrainees.map(trainee => {
                const isSelected = selectedTrainees.includes(trainee.id);
                const isOriginallyAssigned = originalAttendees.includes(trainee.id);
                
                return (
                  <Card 
                    key={trainee.id} 
                    className={`transition-colors ${
                      isSelected ? 'bg-primary/5 border-primary' : ''
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox 
                          id={`trainee-${trainee.id}`}
                          onCheckedChange={() => handleSelectTrainee(trainee.id)}
                          checked={isSelected}
                        />
                        <Label 
                          htmlFor={`trainee-${trainee.id}`} 
                          className="flex-1 font-normal cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span>{trainee.first_name} {trainee.last_name}</span>
                            {isOriginallyAssigned && (
                              <Badge variant="outline" className="text-xs">
                                Currently Assigned
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {trainees.length === 0 ? "No trainees found." : "No trainees match your search."}
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{filteredTrainees.length} trainees</span>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={assigning}>
              {assigning ? "Updating..." : `Update Participants (${selectedTrainees.length})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
