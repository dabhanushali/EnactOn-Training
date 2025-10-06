import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Search, Filter, UserPlus } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
  designation: string | null;
  role: {
    role_name: string;
  } | null;
}

interface BulkEnrollmentDialogProps {
  courseId: string;
  courseName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const BulkEnrollmentDialog = ({
  courseId,
  courseName,
  open,
  onOpenChange,
  onSuccess
}: BulkEnrollmentDialogProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Fetch all employees
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, department, designation, role:roles(role_name)')
        .order('first_name');

      if (profilesError) throw profilesError;

      // Fetch existing enrollments for this course
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('employee_id')
        .eq('course_id', courseId);

      if (enrollmentsError) throw enrollmentsError;

      // Filter out already enrolled employees
      const enrolledIds = new Set(enrollmentsData?.map(e => e.employee_id) || []);
      const availableEmployees = profilesData?.filter(emp => !enrolledIds.has(emp.id)) || [];

      setEmployees(availableEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const filtered = getFilteredEmployees();
    if (selectedEmployees.size === filtered.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filtered.map(emp => emp.id)));
    }
  };

  const handleSelectEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const getFilteredEmployees = () => {
    return employees.filter(emp => {
      const matchesSearch = searchTerm === '' || 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
      const matchesRole = roleFilter === 'all' || emp.role?.role_name === roleFilter;

      return matchesSearch && matchesDepartment && matchesRole;
    });
  };

  const handleEnroll = async () => {
    if (selectedEmployees.size === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    setEnrolling(true);
    try {
      const enrollments = Array.from(selectedEmployees).map(employeeId => ({
        employee_id: employeeId,
        course_id: courseId,
        status: 'enrolled'
      }));

      const { error } = await supabase
        .from('course_enrollments')
        .insert(enrollments);

      if (error) throw error;

      toast.success(`Successfully enrolled ${selectedEmployees.size} employee(s) in ${courseName}`);
      onSuccess?.();
      onOpenChange(false);
      setSelectedEmployees(new Set());
    } catch (error) {
      console.error('Error enrolling employees:', error);
      toast.error('Failed to enroll employees');
    } finally {
      setEnrolling(false);
    }
  };

  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
  const roles = [...new Set(employees.map(emp => emp.role?.role_name).filter(Boolean))];
  const filteredEmployees = getFilteredEmployees();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Bulk Enrollment - {courseName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role!}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selection Controls */}
          <div className="flex items-center justify-between py-2 border-y">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedEmployees.size === filteredEmployees.length && filteredEmployees.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">Select All</span>
            </div>
            <Badge variant="secondary">
              {selectedEmployees.size} selected
            </Badge>
          </div>

          {/* Employee List */}
          <ScrollArea className="h-[300px] border rounded-md p-4">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No employees available for enrollment</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectEmployee(employee.id)}
                  >
                    <Checkbox
                      checked={selectedEmployees.has(employee.id)}
                      onCheckedChange={() => handleSelectEmployee(employee.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {employee.department && (
                          <Badge variant="outline" className="text-xs">
                            {employee.department}
                          </Badge>
                        )}
                        {employee.designation && (
                          <span className="text-xs text-muted-foreground">
                            {employee.designation}
                          </span>
                        )}
                      </div>
                    </div>
                    {employee.role && (
                      <Badge variant="secondary" className="text-xs">
                        {employee.role.role_name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEnroll} 
            disabled={selectedEmployees.size === 0 || enrolling}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll {selectedEmployees.size > 0 && `(${selectedEmployees.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
