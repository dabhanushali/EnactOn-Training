import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmployeeStatusOptions } from '@/lib/enums';
import { UserCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  currentStatus: string;
  employeeName: string;
  onSuccess: () => void;
}

export function StatusChangeDialog({ 
  open, 
  onOpenChange, 
  employeeId, 
  currentStatus, 
  employeeName,
  onSuccess 
}: StatusChangeDialogProps) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async () => {
    if (newStatus === currentStatus) {
      toast.error('Please select a different status');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the status change');
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ current_status: newStatus })
        .eq('id', employeeId);

      if (error) throw error;

      toast.success(`Employee status updated to ${newStatus}`);
      onSuccess();
      onOpenChange(false);
      setReason('');
      setNewStatus(currentStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update employee status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500 text-white';
      case 'Pre-Joining': return 'bg-blue-500 text-white';
      case 'On Leave': return 'bg-yellow-500 text-white';
      case 'Inactive': return 'bg-gray-500 text-white';
      case 'Terminated': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const isTerminating = newStatus === 'Terminated' || newStatus === 'Inactive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Change Employee Status</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center p-4 bg-muted/20 rounded-lg">
            <p className="font-medium">{employeeName}</p>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <Badge className={getStatusColor(currentStatus)}>{currentStatus}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {EmployeeStatusOptions.map((status) => (
                  <SelectItem key={status} value={status} disabled={status === currentStatus}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(status).split(' ')[0]}`}></div>
                      <span>{status}</span>
                      {status === currentStatus && <span className="text-xs text-muted-foreground">(Current)</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isTerminating && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Warning</span>
              </div>
              <p className="text-sm text-red-700">
                This action will change the employee's status to {newStatus}. This may affect their access to systems and courses.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Status Change *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for this status change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={loading || newStatus === currentStatus}
              className={isTerminating ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}