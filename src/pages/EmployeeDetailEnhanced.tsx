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
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Edit, Save, X, User, Calendar, Phone, Building, UserCheck, 
  Mail, MapPin, Users, Briefcase, Award, BookOpen, FileText, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRoleType, EmployeeStatusOptions } from '@/lib/enums';
import { EmployeeDocuments } from '@/components/employees/EmployeeDocuments';
import { EmployeeCourseEnrollments } from '@/components/employees/EmployeeCourseEnrollments';
import { StatusChangeDialog } from '@/components/employees/StatusChangeDialog';
import { MASTER_DATA } from '@/lib/masterData';
import { DEPARTMENTS, DESIGNATIONS } from '@/lib/employeeConstants';
import { CourseEnrollmentDialog } from '@/components/employees/CourseEnrollmentDialog';
import { DocumentUploadDialog } from '@/components/employees/DocumentUploadDialog';
import { RequiredLabel } from '@/components/forms/RequiredLabel';

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

export default function EmployeeDetailEnhanced() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { profile } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allUsers, setAllUsers] = useState<PotentialManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Employee>>({});
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

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
  }, [employeeId]);

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
  }, [canManage, employeeId]);

  const handleManagerSelection = async (selectedUserId: string) => {
    if (!employeeId || !canManage) return;
    if (selectedUserId === 'unassign') {
      try {
        await supabase.from('profiles').update({ manager_id: null }).eq('id', employeeId);
        toast.success('Team Lead unassigned.');
        fetchEmployeeDetails(true);
      } catch (error) { 
        toast.error(`Failed to unassign Team Lead: ${(error as Error).message}`); 
      }
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
    
    if (!editData.first_name?.trim() || !editData.last_name?.trim()) {
      toast.error("First name and last name are required fields.");
      return;
    }
    
    // Check for unique employee code if it's being updated
    if (editData.employee_code && editData.employee_code !== employee.employee_code) {
      const { data: existingEmployee, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('employee_code', editData.employee_code)
        .neq('id', employeeId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        toast.error('Error checking employee code uniqueness');
        return;
      }

      if (existingEmployee) {
        toast.error('Please add a unique employee ID');
        return;
      }
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <MainNav />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <MainNav />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Card className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12">
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Employee Not Found</h3>
              <p className="text-muted-foreground mb-6">The requested employee profile could not be loaded.</p>
              <Link to="/employees">
                <Button>Back to Employees</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'On Leave': return 'secondary';
      case 'Inactive': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <MainNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {canManage ? (
                <Link to="/employees">
                  <Button variant="ghost" className="hover:bg-white/50">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Employees
                  </Button>
                </Link>
              ) : (
                <Link to="/dashboard">
                  <Button variant="ghost" className="hover:bg-white/50">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              )}
              
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {(employee.first_name?.[0] || '') + (employee.last_name?.[0] || '')}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {employee.first_name} {employee.last_name}
                  </h1>
                  <div className="flex items-center space-x-3 mt-1">
                    <Badge variant={getStatusBadgeVariant(employee.current_status)} className="font-medium">
                      {employee.current_status}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground font-medium">
                      {employee.role?.role_name || 'No Role'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {canManage && (
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)} className="bg-white/80">
                      <X className="h-4 w-4 mr-2" />Cancel
                    </Button>
                    <Button onClick={handleSave} className="shadow-lg">
                      <Save className="h-4 w-4 mr-2" />Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setShowEnrollDialog(true)} className="bg-white/80">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Assign Course
                    </Button>
                    <Button onClick={() => setIsEditing(true)} className="shadow-lg">
                      <Edit className="h-4 w-4 mr-2" />Edit Profile
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* Personal Information - Spanning 2 columns */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-xl">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <span>Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <RequiredLabel htmlFor="first_name">First Name</RequiredLabel>
                  {isEditing ? (
                    <Input 
                      id="first_name"
                      value={editData.first_name || ''} 
                      onChange={e => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter first name"
                      className="bg-white/50"
                      required
                    />
                  ) : (
                    <p className="text-lg font-medium py-2 px-3 bg-muted/30 rounded-md">
                      {employee.first_name || 'N/A'}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <RequiredLabel htmlFor="last_name">Last Name</RequiredLabel>
                  {isEditing ? (
                    <Input 
                      id="last_name"
                      value={editData.last_name || ''} 
                      onChange={e => handleInputChange('last_name', e.target.value)}
                      placeholder="Enter last name"
                      className="bg-white/50"
                      required
                    />
                  ) : (
                    <p className="text-lg font-medium py-2 px-3 bg-muted/30 rounded-md">
                      {employee.last_name || 'N/A'}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="employee_code" className="flex items-center space-x-2">
                    <Briefcase className="h-4 w-4" />
                    <span>Employee Code</span>
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="employee_code"
                      value={editData.employee_code || ''} 
                      onChange={e => handleInputChange('employee_code', e.target.value)}
                      placeholder="Enter employee code"
                      className="bg-white/50"
                    />
                  ) : (
                    <p className="text-lg py-2 px-3 bg-muted/30 rounded-md">
                      {employee.employee_code || 'N/A'}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
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
                      className="bg-white/50"
                    />
                  ) : (
                    <p className="text-lg py-2 px-3 bg-muted/30 rounded-md">
                      {employee.phone || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-xl">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                  <Building className="h-5 w-5" />
                </div>
                <span>Work Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="py-2 px-3 bg-primary/10 text-primary rounded-md font-medium">
                  {employee.role?.role_name || 'N/A'}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Designation</Label>
                {isEditing ? (
                  <Select 
                    value={editData.designation || ''} 
                    onValueChange={value => handleInputChange('designation', value)}
                  >
                    <SelectTrigger className="bg-white/50">
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {DESIGNATIONS.map(designation => (
                        <SelectItem key={designation} value={designation}>
                          {designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg py-2 px-3 bg-muted/30 rounded-md">
                    {employee.designation || 'N/A'}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Department</Label>
                {isEditing ? (
                  <Select 
                    value={editData.department || ''} 
                    onValueChange={value => handleInputChange('department', value)}
                  >
                    <SelectTrigger className="bg-white/50">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(department => (
                        <SelectItem key={department} value={department}>
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-lg py-2 px-3 bg-muted/30 rounded-md">
                    {employee.department || 'N/A'}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                {isEditing ? (
                  <Select 
                    value={editData.current_status || ''} 
                    onValueChange={value => handleInputChange('current_status', value)}
                  >
                    <SelectTrigger className="bg-white/50">
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
                  <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md">
                    <Badge variant={getStatusBadgeVariant(employee.current_status)} className="font-medium">
                      {employee.current_status}
                    </Badge>
                    {canManage && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowStatusDialog(true)}
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Change
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Date of Joining</span>
                </Label>
                {isEditing ? (
                  <Input 
                    type="date" 
                    className="bg-white/50 text-black dark:[color-scheme:dark]" 
                    value={editData.date_of_joining ? new Date(editData.date_of_joining).toISOString().split('T')[0] : ''} 
                    onChange={e => handleInputChange('date_of_joining', e.target.value)}
                  />
                ) : (
                  <p className="text-lg py-2 px-3 bg-muted/30 rounded-md">
                    {employee.date_of_joining 
                      ? new Date(employee.date_of_joining).toLocaleDateString() 
                      : 'Not Set'
                    }
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Lead Assignment */}
        {canManage && (
          <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-xl">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <Users className="h-5 w-5" />
                </div>
                <span>Team Lead Assignment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Label className="text-base font-medium">Assigned Team Lead:</Label>
                <Select 
                  onValueChange={handleManagerSelection} 
                  defaultValue={employee.manager_id || ''}
                >
                  <SelectTrigger className="max-w-md bg-white/50">
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
              </div>
              {employee.manager && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Currently assigned to:</p>
                  <p className="font-medium">
                    {employee.manager.first_name} {employee.manager.last_name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documents and Courses Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span>Employee Documents</span>
                </div>
                {canManage && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowDocumentDialog(true)}
                    className="bg-white/50"
                  >
                    Upload Document
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeDocuments employeeId={employeeId!} />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                  <Award className="h-5 w-5" />
                </div>
                <span>Course Enrollments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeCourseEnrollments employeeId={employeeId!} />
            </CardContent>
          </Card>
        </div>

        {/* Dialogs */}
        {canManage && (
          <>
            <CourseEnrollmentDialog
              open={showEnrollDialog}
              onOpenChange={setShowEnrollDialog}
              employeeId={employeeId!}
              onSuccess={() => {
                setShowEnrollDialog(false);
                toast.success('Course assigned successfully');
              }}
            />
            
            <DocumentUploadDialog
              open={showDocumentDialog}
              onOpenChange={setShowDocumentDialog}
              employeeId={employeeId!}
              onSuccess={() => {
                setShowDocumentDialog(false);
                // Refresh documents if needed
              }}
            />
            
            <StatusChangeDialog
              open={showStatusDialog}
              onOpenChange={setShowStatusDialog}
              employeeId={employeeId!}
              currentStatus={employee.current_status}
              employeeName={`${employee.first_name} ${employee.last_name}`}
              onSuccess={() => {
                fetchEmployeeDetails(true);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}