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
import { ArrowLeft, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { UserRoleType, EmployeeStatusOptions } from '@/lib/enums';
import { EmployeeDocuments } from '@/components/employees/EmployeeDocuments';

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

// --- COMPONENT ---

export default function EmployeeDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { profile } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allUsers, setAllUsers] = useState<PotentialManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Employee>>({});

  const canManage = profile?.role?.role_name === 'HR' || profile?.role?.role_name === 'Management';

  const fetchEmployeeDetails = useCallback(async (showToast = false) => {
    if (!employeeId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, first_name, last_name, employee_code, department, designation,
          current_status, phone, date_of_joining, manager_id,
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
    
    const updatePayload = {
      first_name: editData.first_name,
      last_name: editData.last_name,
      employee_code: editData.employee_code,
      department: editData.department,
      designation: editData.designation,
      phone: editData.phone,
      date_of_joining: editData.date_of_joining,
      current_status: editData.current_status,
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
      await fetchEmployeeDetails();
      await fetchAllUsers();
      setLoading(false);
    };
    loadAllData();
  }, [employeeId, canManage, fetchEmployeeDetails, fetchAllUsers]);

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
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center">
        {canManage ? (
          <Link to="/employees">
            <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />Back to Employees</Button>
          </Link>
        ) : (
          <Link to="/dashboard">
            <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard</Button>
          </Link>
        )}
        {canManage && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}><X className="h-4 w-4 mr-2" />Cancel</Button>
                <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save Changes</Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
            )}
          </div>
        )}
      </div>

      <Card className="mt-4">
        <CardHeader>
          <div className="flex justify-between items-start">
            {isEditing ? (
                <div className="flex gap-2">
                    <Input value={editData.first_name || ''} onChange={e => handleInputChange('first_name', e.target.value)} placeholder="First Name"/>
                    <Input value={editData.last_name || ''} onChange={e => handleInputChange('last_name', e.target.value)} placeholder="Last Name"/>
                </div>
            ) : (
                <CardTitle className="text-2xl">{employee.first_name} {employee.last_name}</CardTitle>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <Label>Role</Label>
              <p className="text-lg">{employee.role?.role_name || 'N/A'}</p>
            </div>
            <div>
              <Label>Team Lead</Label>
              {canManage ? (
                <Select onValueChange={handleManagerSelection} defaultValue={employee.manager_id || ''}>
                  <SelectTrigger className="text-lg"><SelectValue placeholder="Select a Team Lead" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassign">Unassign Team Lead</SelectItem>
                    {allUsers.map(user => (user.id && <SelectItem key={user.id} value={user.id}>{user.first_name} {user.last_name} ({user.role?.role_name || 'No Role'})</SelectItem>))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-lg">{employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : <span className="text-muted-foreground">Not Assigned</span>}</p>
              )}
            </div>
            <div>
              <Label>Employee Code</Label>
              {isEditing ? <Input value={editData.employee_code || ''} onChange={e => handleInputChange('employee_code', e.target.value)} /> : <p className="text-lg">{employee.employee_code || 'N/A'}</p>}
            </div>
            <div>
              <Label>Department</Label>
              {isEditing ? <Input value={editData.department || ''} onChange={e => handleInputChange('department', e.target.value)} /> : <p className="text-lg">{employee.department || 'N/A'}</p>}
            </div>
            <div>
              <Label>Designation</Label>
              {isEditing ? <Input value={editData.designation || ''} onChange={e => handleInputChange('designation', e.target.value)} /> : <p className="text-lg">{employee.designation || 'N/A'}</p>}
            </div>
            <div>
              <Label>Status</Label>
              {isEditing ? (
                <Select onValueChange={value => handleInputChange('current_status', value)} value={editData.current_status || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {EmployeeStatusOptions.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge>{employee.current_status}</Badge>
              )}
            </div>
            <div>
              <Label>Phone</Label>
              {isEditing ? <Input value={editData.phone || ''} onChange={e => handleInputChange('phone', e.target.value)} /> : <p className="text-lg">{employee.phone || 'N/A'}</p>}
            </div>
            <div>
              <Label>Date of Joining</Label>
              {isEditing ? <Input type="date" className="text-black dark:[color-scheme:dark]" value={editData.date_of_joining ? new Date(editData.date_of_joining).toISOString().split('T')[0] : ''} onChange={e => handleInputChange('date_of_joining', e.target.value)} /> : <p className="text-lg">{employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : <span className="text-muted-foreground">Not Set</span>}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {employeeId && <EmployeeDocuments employeeId={employeeId} />}
    </div>
    </>
  );
}
