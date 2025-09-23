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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequiredLabel } from "@/components/forms/RequiredLabel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface TrainerProfile {
    id: string;
    first_name: string;
    last_name: string;
}

interface CreateSessionDialogProps {
  onSessionCreated: (sessionId: string) => void;
}

export function CreateSessionDialog({ onSessionCreated }: CreateSessionDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [trainers, setTrainers] = useState<TrainerProfile[]>([]);
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [platform, setPlatform] = useState("");
  const [link, setLink] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
        const fetchTrainers = async () => {
            const { data: rolesData, error: rolesError } = await supabase
                .from('roles')
                .select('id')
                .in('role_name', ['Management', 'HR', 'Team Lead']);
            
            if (rolesError || !rolesData) {
                return toast.error("Could not fetch trainer roles.");
            }

            const roleIds = rolesData.map(r => r.id);

            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name')
                .in('role_id', roleIds);

            if (error) {
                toast.error("Could not fetch trainers list.");
            } else {
                setTrainers(data as TrainerProfile[]);
            }
        }
        fetchTrainers();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user) return toast.error("You must be logged in.");
    if (!sessionName || !sessionType || !trainerId || !startDateTime || !endDateTime || !link) {
        return toast.warning("Please fill out all required fields.");
    }
    setCreating(true);

    // Convert local datetime string to full ISO string (UTC)
    const utcStart = new Date(startDateTime).toISOString();
    const utcEnd = new Date(endDateTime).toISOString();

    const { data, error } = await supabase
      .from('training_sessions')
      .insert({
        session_name: sessionName,
        session_type: sessionType,
        trainer_id: trainerId,
        start_datetime: utcStart,
        end_datetime: utcEnd,
        meeting_platform: platform,
        meeting_link: link,
        created_by: user.id,
        attendees: [],
      })
      .select('id')
      .single();

    if (error) {
      console.error("Error creating session:", error);
      toast.error(`Failed to create session: ${error.message}`);
    } else {
      toast.success("Session created! Now assign trainees.");
      onSessionCreated(data.id);
      setOpen(false);
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Session</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Training Session</DialogTitle>
          <DialogDescription>
            Fill in the details to schedule a new session.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <RequiredLabel htmlFor="name" className="text-right">Session Name</RequiredLabel>
                <Input id="name" value={sessionName} onChange={e => setSessionName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <RequiredLabel htmlFor="type" className="text-right">Session Type</RequiredLabel>
                <div className="col-span-3">
                  <Select value={sessionType} onValueChange={setSessionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Workshop">Workshop</SelectItem>
                      <SelectItem value="Webinar">Webinar</SelectItem>
                      <SelectItem value="One-on-One">One-on-One</SelectItem>
                      <SelectItem value="Group">Group</SelectItem>
                      <SelectItem value="Onboarding">Onboarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <RequiredLabel htmlFor="trainer" className="text-right">Trainer</RequiredLabel>
                <div className="col-span-3">
                  <Select value={trainerId} onValueChange={setTrainerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <RequiredLabel htmlFor="start" className="text-right">Start Time</RequiredLabel>
                <Input id="start" type="datetime-local" value={startDateTime} onChange={e => setStartDateTime(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <RequiredLabel htmlFor="end" className="text-right">End Time</RequiredLabel>
                <Input id="end" type="datetime-local" value={endDateTime} onChange={e => setEndDateTime(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="platform" className="text-right">Platform</Label>
                <Input id="platform" placeholder="e.g., Zoom, Google Meet" value={platform} onChange={e => setPlatform(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <RequiredLabel htmlFor="link" className="text-right">Meeting Link</RequiredLabel>
                <Input id="link" type="url" value={link} onChange={e => setLink(e.target.value)} className="col-span-3" required />
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? "Creating..." : "Create & Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
