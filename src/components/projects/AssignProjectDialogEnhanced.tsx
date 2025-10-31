import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, User, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { toast } from 'sonner';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  designation: string;
  department: string;
  current_status: string;
  isAssigned?: boolean;
}

interface AssignProjectDialogEnhancedProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectAssigned: () => void;
}

export function AssignProjectDialogEnhanced({
  projectId,
  open,
  onOpenChange,
  onProjectAssigned
}: AssignProjectDialogEnhancedProps) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // Get all employees - filter by trainee role only
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, designation, department, current_status, role_id')
        .eq('current_status', 'Active');

      if (profilesError) throw profilesError;

      // Get trainee role ID
      const { data: traineeRole } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'Trainee')
        .single();

      // Filter to only trainees
      const employeesData = (allProfiles || []).filter(
        emp => emp.role_id === traineeRole?.id
      );

      // Get current assignments for this project
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('project_assignments')
        .select('assignee_id')
        .eq('project_id', projectId);

      if (assignmentsError) throw assignmentsError;

      const assignedIds = new Set(assignmentsData?.map(a => a.assignee_id) || []);

      const enrichedEmployees = (employeesData || []).map(emp => ({
        ...emp,
        isAssigned: assignedIds.has(emp.id)
      }));

      setEmployees(enrichedEmployees);
      
      // Pre-select already assigned employees
      setSelectedEmployees(assignedIds);
    } catch (error) {
      toast.error(`Failed to load employees: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open, fetchEmployees]);

  const filteredEmployees = employees.filter(employee =>
    `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleAssign = async () => {
    if (!projectId || !user) return;

    setAssigning(true);
    try {
      // Get current assignments
      const { data: currentAssignments } = await supabase
        .from('project_assignments')
        .select('assignee_id')
        .eq('project_id', projectId);

      const currentIds = new Set(currentAssignments?.map(a => a.assignee_id) || []);
      const selectedIds = selectedEmployees;

      // Find new assignments and removals
      const toAdd = Array.from(selectedIds).filter(id => !currentIds.has(id));
      const toRemove = Array.from(currentIds).filter(id => !selectedIds.has(id));

      // Add new assignments
      if (toAdd.length > 0) {
        const newAssignments = toAdd.map(employeeId => ({
          project_id: projectId,
          assignee_id: employeeId,
          assigned_by: user.id,
          status: 'Not Started'
        }));

        const { error: insertError } = await supabase
          .from('project_assignments')
          .insert(newAssignments);

        if (insertError) throw insertError;
      }

      // Remove unselected assignments
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('project_assignments')
          .delete()
          .eq('project_id', projectId)
          .in('assignee_id', toRemove);

        if (deleteError) throw deleteError;
      }

      toast.success('Project assignments updated successfully');
      onProjectAssigned();
      onOpenChange(false);
    } catch (error) {
      toast.error(`Failed to update assignments: ${(error as Error).message}`);
    } finally {
      setAssigning(false);
    }
  };

  const getEmployeeInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Assign Trainees to Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search employees by name, designation, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">
              Selected: {selectedEmployees.size} employees
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedEmployees(new Set())}
              disabled={selectedEmployees.size === 0}
            >
              Clear All
            </Button>
          </div>

          {/* Employee List */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading employees...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No employees found</p>
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <Card key={employee.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        id={`employee-${employee.id}`}
                        checked={selectedEmployees.has(employee.id)}
                        onCheckedChange={() => handleEmployeeToggle(employee.id)}
                        className="mt-1"
                      />
                      
                      <Avatar className="h-10 w-10">
                        <AvatarImage>
                          {getEmployeeInitials(employee.first_name, employee.last_name)}
                        </AvatarImage>
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label 
                            htmlFor={`employee-${employee.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {employee.first_name} {employee.last_name}
                          </Label>
                          {employee.isAssigned && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Currently Assigned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{employee.designation}</span>
                          <span>•</span>
                          <span>{employee.department}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={assigning || selectedEmployees.size === 0}
            >
              {assigning ? 'Updating...' : `Update Assignments (${selectedEmployees.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}