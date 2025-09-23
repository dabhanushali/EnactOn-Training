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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/hooks/auth-utils";
import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface CreateProjectDialogProps {
  onProjectCreated: (projectId: string) => void;
}

export function CreateProjectDialog({ onProjectCreated }: CreateProjectDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [durationDays, setDurationDays] = useState<number | undefined>(undefined);
  const [instructions, setInstructions] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectType("");
    setDurationDays(undefined);
    setInstructions("");
    setDeliverables("");
  };

  const handleSubmit = async () => {
    if (!user) {
        toast.error("You must be logged in to create a project.");
        return;
    }

    setCreating(true);

    const { data, error } = await supabase.from('projects' as any).insert([
      {
        project_name: projectName,
        project_description: projectDescription,
        project_type: projectType,
        duration_days: durationDays,
        instructions: instructions,
        deliverables: deliverables,
        created_by: user.id,
      },
    ]).select('id').single();

    if (error) {
      console.error("Error creating project:", error);
      toast.error(`Error creating project: ${error.message}`);
    } else {
      toast.success("Project created successfully! Now assign it to trainees.");
      onProjectCreated((data as any)?.id);
      resetForm();
      setOpen(false);
    }

    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a New Project</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new project template.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project-name" className="text-right">Project Name</Label>
            <Input id="project-name" placeholder="e.g. E-commerce Website" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project-description" className="text-right">Description</Label>
            <Textarea id="project-description" placeholder="A short description of the project." value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="project-type" className="text-right">Project Type</Label>
            <Input id="project-type" placeholder="e.g. Internal, Client" value={projectType} onChange={(e) => setProjectType(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duration (Days)</Label>
            <Input id="duration" type="number" placeholder="e.g. 14" value={durationDays} onChange={(e) => setDurationDays(parseInt(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="instructions" className="text-right">Instructions</Label>
            <Textarea id="instructions" placeholder="Detailed instructions for the trainee." value={instructions} onChange={(e) => setInstructions(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deliverables" className="text-right">Deliverables</Label>
            <Textarea id="deliverables" placeholder="Expected deliverables for the project." value={deliverables} onChange={(e) => setDeliverables(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}