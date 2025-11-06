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
import { MASTER_DATA } from '@/lib/masterData';
import { RequiredLabel } from "@/components/forms/RequiredLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateProjectDialogProps {
  onProjectCreated: (projectId: string) => void;
  children?: React.ReactNode;
}

export function CreateProjectDialog({ onProjectCreated, children }: CreateProjectDialogProps) {
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

    // Validate required fields
    if (!projectName.trim()) {
      toast.error("Project name is required.");
      return;
    }

    if (!projectDescription.trim()) {
      toast.error("Project description is required.");
      return;
    }

    if (!instructions.trim()) {
      toast.error("Instructions are required.");
      return;
    }

    if (!deliverables.trim()) {
      toast.error("Deliverables are required.");
      return;
    }

    setCreating(true);

    const { data, error } = await supabase.from('projects' as any).insert([
      {
        project_name: projectName.trim(),
        project_description: projectDescription.trim(),
        project_type: projectType,
        duration_days: durationDays,
        instructions: instructions.trim(),
        deliverables: deliverables.trim(),
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
        {children || <Button>Create Project</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Project</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new project template.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <RequiredLabel htmlFor="project-name">Project Name</RequiredLabel>
            <Input 
              id="project-name" 
              placeholder="e.g. E-commerce Website" 
              value={projectName} 
              onChange={(e) => setProjectName(e.target.value)} 
              required
            />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="project-description">Description</RequiredLabel>
            <Textarea 
              id="project-description" 
              placeholder="A comprehensive description of the project scope and objectives" 
              value={projectDescription} 
              onChange={(e) => setProjectDescription(e.target.value)} 
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-type">Project Type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                {MASTER_DATA.projectTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (Days)</Label>
            <Input 
              id="duration" 
              type="number" 
              placeholder="e.g. 14" 
              value={durationDays || ''} 
              onChange={(e) => setDurationDays(parseInt(e.target.value) || undefined)} 
            />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="instructions">Instructions</RequiredLabel>
            <Textarea 
              id="instructions" 
              placeholder="Detailed instructions and requirements for the trainee" 
              value={instructions} 
              onChange={(e) => setInstructions(e.target.value)} 
              rows={4}
              required
            />
          </div>
          <div className="space-y-2">
            <RequiredLabel htmlFor="deliverables">Deliverables</RequiredLabel>
            <Textarea 
              id="deliverables" 
              placeholder="Expected deliverables and submission requirements" 
              value={deliverables} 
              onChange={(e) => setDeliverables(e.target.value)} 
              rows={4}
              required
            />
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