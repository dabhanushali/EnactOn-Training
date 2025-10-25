import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Edit2, Check, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailManagementProps {
  employeeId: string;
  currentEmail: string;
  employeeName: string;
  onUpdate: () => void;
}

export const EmailManagement = ({ 
  employeeId, 
  currentEmail, 
  employeeName,
  onUpdate 
}: EmailManagementProps) => {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Email address is required');
      return;
    }

    if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (newEmail !== confirmEmail) {
      toast.error('Email addresses do not match');
      return;
    }

    if (newEmail === currentEmail) {
      toast.info('Email address is unchanged');
      setOpen(false);
      return;
    }

    setUpdating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('You must be logged in to update email');
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-user-email', {
        body: { 
          userId: employeeId,
          newEmail: newEmail 
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to update email');
      }

      toast.success('Email updated successfully. User will receive a confirmation email.');
      setOpen(false);
      onUpdate();
      setNewEmail(newEmail);
      setConfirmEmail('');
    } catch (error) {
      console.error('Error updating email:', error);
      toast.error(`Failed to update email: ${(error as Error).message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          <Mail className="w-3.5 h-3.5" />
          <span className="text-xs">{currentEmail}</span>
          <Edit2 className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Update Email Address
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Updating email for: <span className="font-semibold">{employeeName}</span>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="current-email">Current Email</Label>
            <Input
              id="current-email"
              type="email"
              value={currentEmail}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-email">New Email Address *</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
              disabled={updating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-email">Confirm New Email *</Label>
            <Input
              id="confirm-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Re-enter new email address"
              disabled={updating}
            />
          </div>

          <Alert className="bg-warning/10 border-warning/30">
            <AlertDescription className="text-xs">
              <strong>Important:</strong> The employee will need to verify the new email address. 
              They will receive a confirmation email.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setNewEmail(currentEmail);
              setConfirmEmail('');
            }}
            disabled={updating}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleUpdateEmail}
            disabled={updating || !newEmail || !confirmEmail}
          >
            <Check className="w-4 h-4 mr-2" />
            {updating ? 'Updating...' : 'Update Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
