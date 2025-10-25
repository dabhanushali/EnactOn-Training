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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RequiredLabel } from "@/components/forms/RequiredLabel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [startDate, setStartDate] = useState<Date>();
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState<Date>();
  const [endTime, setEndTime] = useState("10:00");
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
    if (!sessionName || !sessionType || !trainerId || !startDate || !startTime || !endDate || !endTime || !link) {
        return toast.warning("Please fill out all required fields.");
    }
    setCreating(true);

    // Combine date and time to create full datetime
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(startDate);
    startDateTime.setHours(startHours, startMinutes, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    const utcStart = startDateTime.toISOString();
    const utcEnd = endDateTime.toISOString();

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
      
      // Send notification emails
      try {
        await supabase.functions.invoke('notify-training-session', {
          body: { sessionId: data.id }
        });
      } catch (emailError) {
        console.error("Error sending notification emails:", emailError);
        // Don't fail the creation if email fails
      }
      
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
                <RequiredLabel htmlFor="start" className="text-right">Start Date & Time</RequiredLabel>
                <div className="col-span-3 flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <RequiredLabel htmlFor="end" className="text-right">End Date & Time</RequiredLabel>
                <div className="col-span-3 flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
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
