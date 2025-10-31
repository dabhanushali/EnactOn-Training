import { MainNav } from '@/components/navigation/MainNav';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/auth-utils';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, Save, X, User, Calendar, Phone, Building, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { UserRoleType, EmployeeStatusOptions } from '@/lib/enums';
import { MASTER_DATA } from '@/lib/masterData';
import { CourseEnrollmentDialog } from '@/components/employees/CourseEnrollmentDialog';
import { RequiredLabel } from '@/components/forms/RequiredLabel';

// --- TYPE DEFINITIONS ---

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  current_status: string;
  phone: string | null;
  date_of_joining: string | null;
  manager_id: string | null;
  role: {
    role_name: UserRoleType;
  } | null;
  role_id: string | null;
  manager: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface PotentialManager {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: {
    role_name: UserRoleType;
  } | null;
}

interface Role {
  id: string;
  role_name: string;
}

// --- COMPONENT ---

export default function EmployeeDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { profile } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allUsers, setAllUsers] = useState<PotentialManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Employee & { role_id: string | null }>>({});
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const canManage = profile?.role?.role_name === 'HR' || profile?.role?.role_name === 'Management';

  const fetchEmployeeDetails = useCallback(async (showToast = false) => {
    if (!employeeId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, employee_code, department, designation,
          current_status, phone, date_of_joining, manager_id, role_id,
          role:roles(role_name),
          manager:manager_id(first_name, last_name)
        `)
        .eq('id', employeeId)
        .maybeSingle();

      if (error) throw error;
      setEmployee(data as any);
      setEditData(data as any || {});
      if(showToast) toast.success("Employee details refreshed.");
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
      toast.error(`Failed to load employee details: ${(error as Error).message}`);
      setEmployee(null);
    }
  }, [employeeId, toast]);

  const fetchAllUsers = useCallback(async () => {
    if (!canManage) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`id, first_name, last_name, role:roles(role_name)`);

      if (error) throw error;
      setAllUsers(data?.filter(user => user.id !== employeeId) as any || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
      toast.error(`Failed to load users list: ${(error as Error).message}`);
    }
  }, [canManage, employeeId, toast]);

  const fetchRoles = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('roles').select('id, role_name');
      if (error) throw error;
      setRoles(data || []);
      console.log('Fetched roles:', data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error(`Failed to load roles: ${(error as Error).message}`);
    }
  }, []);

  const handleManagerSelection = async (selectedUserId: string) => {
    if (!employeeId || !canManage) return;
    if (selectedUserId === 'unassign') {
      try {
        await supabase.from('profiles').update({ manager_id: null }).eq('id', employeeId);
        toast.success('Team Lead unassigned.');
        fetchEmployeeDetails(true);
      } catch (error) { toast.error(`Failed to unassign Team Lead: ${(error as Error).message}`); }
      return;
    }
    const selectedUser = allUsers.find(u => u.id === selectedUserId);
    if (!selectedUser) return;
    try {
      const isPrivilegedRole = selectedUser.role?.role_name === 'HR' || selectedUser.role?.role_name === 'Management';
      if (!isPrivilegedRole && selectedUser.role?.role_name !== 'Team Lead') {
        const { data: roleData, error: roleError } = await supabase.from('roles').select('id').eq('role_name', 'Team Lead').single();
        if (roleError || !roleData) throw new Error("Could not find 'Team Lead' role to promote user.");
        await supabase.from('profiles').update({ role_id: roleData.id }).eq('id', selectedUserId);
        toast.info(`${selectedUser.first_name} has been promoted to Team Lead.`);
      }
      await supabase.from('profiles').update({ manager_id: selectedUserId }).eq('id', employeeId);
      toast.success(`${selectedUser.first_name} assigned as Team Lead.`);
      fetchEmployeeDetails(true);
      fetchAllUsers();
    } catch (error) {
      console.error('Error in manager assignment process:', error);
      toast.error(`An error occurred: ${(error as Error).message}`);
    }
  };

  const handleSave = async () => {
    if (!canManage || !isEditing) return;
    
    // Validate required fields
    if (!editData.first_name?.trim() || !editData.last_name?.trim()) {
      toast.error("First name and last name are required fields.");
      return;
    }
    
    const updatePayload = {
      first_name: editData.first_name?.trim(),
      last_name: editData.last_name?.trim(),
      employee_code: editData.employee_code,
      department: editData.department,
      designation: editData.designation,
      phone: editData.phone,
      date_of_joining: editData.date_of_joining,
      current_status: editData.current_status,
      role_id: editData.role_id,
    };

    try {
      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', employeeId);
      if (error) throw error;
      toast.success("Employee details updated successfully.");
      setIsEditing(false);
      fetchEmployeeDetails(true);
    } catch (error) {
      toast.error(`Failed to save changes: ${(error as Error).message}`);
    }
  };

  const handleInputChange = (field: keyof typeof editData, value: string | null) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([fetchEmployeeDetails(), fetchAllUsers(), fetchRoles()]);
      setLoading(false);
    };
    loadAllData();
  }, [employeeId, canManage, fetchEmployeeDetails, fetchAllUsers, fetchRoles]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading Employee Details...</div>;
  }

  if (!employee) {
    return (
      <div className="container mx-auto py-6 px-4">...</div> // Error display unchanged
    );
  }

  return (
    <>
    <MainNav />
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            {canManage ? (
              <Link to="/employees">
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Employees
                </Button>
              </Link>
            ) : (
              <Link to="/dashboard">
                <Button variant="ghost">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground">Employee Profile</h1>
              <p className="text-muted-foreground">Manage employee information and documents</p>
            </div>
          </div>
          
          {canManage && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-2" />Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setShowEnrollDialog(true)}>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Assign Course
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />Edit Profile
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Employee Information */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Personal Information Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Personal Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <RequiredLabel htmlFor="first_name">First Name</RequiredLabel>
                  {isEditing ? (
                    <Input 
                      id="first_name"
                      value={editData.first_name || ''} 
                      onChange={e => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter first name"
                      required
                    />
                  ) : (
                    <p className="text-lg font-medium">{employee.first_name || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <RequiredLabel htmlFor="last_name">Last Name</RequiredLabel>
                  {isEditing ? (
                    <Input 
                      id="last_name"
                      value={editData.last_name || ''} 
                      onChange={e => handleInputChange('last_name', e.target.value)}
                      placeholder="Enter last name"
                      required
                    />
                  ) : (
                    <p className="text-lg font-medium">{employee.last_name || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="employee_code">Employee Code</Label>
                  {isEditing ? (
                    <Input 
                      id="employee_code"
                      value={editData.employee_code || ''} 
                      onChange={e => handleInputChange('employee_code', e.target.value)}
                      placeholder="Enter employee code"
                    />
                  ) : (
                    <p className="text-lg">{employee.employee_code || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone" className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>Phone Number</span>
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="phone"
                      value={editData.phone || ''} 
                      onChange={e => handleInputChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-lg">{employee.phone || 'N/A'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>Work Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Role</Label>
                {isEditing ? (
                  <Select
                    value={editData.role_id || ''}
                    onValueChange={value => handleInputChange('role_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.role_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg font-medium">{employee.role?.role_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label>Designation</Label>
                {isEditing ? (
                  <Select 
                    value={editData.designation || ''} 
                    onValueChange={value => handleInputChange('designation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {MASTER_DATA.designations.map(designation => (
                        <SelectItem key={designation} value={designation}>
                          {designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg">{employee.designation || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label>Department</Label>
                {isEditing ? (
                  <Select 
                    value={editData.department || ''} 
                    onValueChange={value => handleInputChange('department', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {MASTER_DATA.departments.map(department => (
                        <SelectItem key={department} value={department}>
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg">{employee.department || 'N/A'}</p>
                )}
              </div>
              <div>
                <Label>Status</Label>
                {isEditing ? (
                  <Select 
                    value={editData.current_status || ''} 
                    onValueChange={value => handleInputChange('current_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {EmployeeStatusOptions.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{employee.current_status}</Badge>
                )}
              </div>
              <div>
                <Label className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Date of Joining</span>
                </Label>
                {isEditing ? (
                  <Input 
                    type="date" 
                    className="text-black dark:[color-scheme:dark]" 
                    value={editData.date_of_joining ? new Date(editData.date_of_joining).toISOString().split('T')[0] : ''} 
                    onChange={e => handleInputChange('date_of_joining', e.target.value)}
                  />
                ) : (
                  <p className="text-lg">
                    {employee.date_of_joining 
                      ? new Date(employee.date_of_joining).toLocaleDateString() 
                      : <span className="text-muted-foreground">Not Set</span>
                    }
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Lead Assignment */}
        {canManage && employee.role?.role_name !== 'HR' && employee.role?.role_name !== 'Management' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Team Lead Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Label>Assigned Team Lead:</Label>
                <Select 
                  onValueChange={handleManagerSelection} 
                  defaultValue={employee.manager_id || ''}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Select a Team Lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign">Unassign Team Lead</SelectItem>
                    {allUsers.map(user => (
                      user.id && (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.role?.role_name || 'No Role'})
                        </SelectItem>
                      )
                    ))}
                  </SelectContent>
                </Select>
                {employee.manager && (
                  <p className="text-muted-foreground">
                    Currently: {employee.manager.first_name} {employee.manager.last_name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Course Enrollment Dialog */}
        <CourseEnrollmentDialog
          open={showEnrollDialog}
          onOpenChange={setShowEnrollDialog}
          employeeId={employeeId || ''}
          onSuccess={() => {
            setShowEnrollDialog(false);
            toast.success('Course assigned successfully');
          }}
        />
      </div>
    </div>
    </>
  );
}