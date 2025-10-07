import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, UserPlus } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  designation: string;
  employee_code: string;
  role?: {
    role_name: string;
  };
}

interface CourseAssignmentDialogProps {
  courseId: string;
  courseName: string;
  onClose: () => void;
}

export function CourseAssignmentDialog({ courseId, courseName, onClose }: CourseAssignmentDialogProps) {
  const { user, profile: userProfile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState<{[key: string]: boolean}>({});
  const [enrolledEmployees, setEnrolledEmployees] = useState<string[]>([]);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          department,
          designation,
          employee_code,
          role:roles(role_name)
        `)
        .neq('id', user?.id); // Don't include current user

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  const fetchExistingEnrollments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('employee_id')
        .eq('course_id', courseId);

      if (error) throw error;
      setEnrolledEmployees(data?.map(e => e.employee_id) || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  }, [courseId]);

  useEffect(() => {
    fetchEmployees();
    fetchExistingEnrollments();
  }, [fetchEmployees, fetchExistingEnrollments]);

  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      (employee.employee_code && employee.employee_code.toLowerCase().includes(searchLower)) ||
      (employee.department && employee.department.toLowerCase().includes(searchLower)) ||
      (employee.designation && employee.designation.toLowerCase().includes(searchLower))
    );
  });

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    const availableEmployees = filteredEmployees
      .filter(emp => !enrolledEmployees.includes(emp.id))
      .map(emp => emp.id);
    
    if (selectedEmployees.length === availableEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(availableEmployees);
    }
  };

  const handleAssignCourse = async () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one employee",
        variant: "destructive",
      });
      return;
    }

    try {
      setAssigning(true);
      
      const enrollmentData = selectedEmployees.map(employeeId => ({
        course_id: courseId,
        employee_id: employeeId,
        status: 'enrolled'
      }));

      const { error } = await supabase
        .from('course_enrollments')
        .insert(enrollmentData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Course assigned to ${selectedEmployees.length} employee(s) successfully`,
      });

      onClose();

    } catch (error) {
      console.error('Error assigning course:', error);
      toast({
        title: "Error",
        description: "Failed to assign course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async (employeeId: string) => {
    setUnassigning(prev => ({ ...prev, [employeeId]: true }));
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .match({ course_id: courseId, employee_id: employeeId });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course unassigned successfully.",
      });

      setEnrolledEmployees(prev => prev.filter(id => id !== employeeId));
    } catch (error) {
      console.error('Error unassigning course:', error);
      toast({
        title: "Error",
        description: "Failed to unassign course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUnassigning(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const availableEmployees = filteredEmployees.filter(emp => !enrolledEmployees.includes(emp.id));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Assign "{courseName}" to Employees</h3>
        <p className="text-sm text-muted-foreground">Select employees to enroll in this course</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees by name, code, department, or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Select All */}
      {availableEmployees.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectedEmployees.length === availableEmployees.length && availableEmployees.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all" className="text-sm">
              Select All ({availableEmployees.length} available)
            </Label>
          </div>
          
          {selectedEmployees.length > 0 && (
            <Badge variant="secondary">
              {selectedEmployees.length} selected
            </Badge>
          )}
        </div>
      )}

      {/* Employee List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No employees found</p>
        ) : (
          filteredEmployees.map((employee) => {
            const isEnrolled = enrolledEmployees.includes(employee.id);
            const isSelected = selectedEmployees.includes(employee.id);
            
            return (
              <Card key={employee.id} className={`transition-colors ${
                isEnrolled ? 'opacity-50 bg-muted' : isSelected ? 'bg-primary/5 border-primary' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleEmployeeToggle(employee.id)}
                      disabled={isEnrolled}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </h4>
                        {isEnrolled && (
                          userProfile && userProfile.role && ['Management', 'HR', 'Team Lead'].includes(userProfile.role.role_name) ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUnassign(employee.id)}
                              disabled={unassigning[employee.id]}
                              className="text-xs"
                            >
                              {unassigning[employee.id] ? 'Unassigning...' : 'Unassign'}
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Already Enrolled
                            </Badge>
                          )
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-x-2">
                        {employee.employee_code && (
                          <span>Code: {employee.employee_code}</span>
                        )}
                        {employee.department && (
                          <span>• {employee.department}</span>
                        )}
                        {employee.designation && (
                          <span>• {employee.designation}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{availableEmployees.length} available employees</span>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignCourse} 
            disabled={selectedEmployees.length === 0 || assigning}
          >
            {assigning ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Assign Course ({selectedEmployees.length})
          </Button>
        </div>
      </div>
    </div>
  );
}