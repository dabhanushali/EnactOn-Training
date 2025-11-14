import { MainNav } from '@/components/navigation/MainNav';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/auth-utils';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Users, Search, UserCheck, UserX, Crown, Plus, Eye, Trash2, 
  Building2, Mail, Phone, Calendar, User, Briefcase 
} from 'lucide-react';
import { toast } from 'sonner';
import { UserRoleType, getUserRoleDisplayName } from '@/lib/enums';
import { AddEmployeeDialog } from '@/components/employees/AddEmployeeDialog';
import { BulkEmployeeUpload } from '@/components/employees/BulkEmployeeUpload';
import { EmailManagement } from '@/components/employees/EmailManagement';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  current_status: string;
  created_at: string;
  phone: string | null;
  date_of_joining: string | null;
  email: string | null;
  role: {
    id: string;
    role_name: string;
    role_description: string | null;
  } | null;
}

interface Role {
  id: string;
  role_name: string;
  role_description: string | null;
}

export default function Employees() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const canManageEmployees = ['Management', 'HR'].includes(profile?.role?.role_name || '');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_profiles_with_emails');

      if (error) throw error;
      
      // Map the data to match the expected format
      const employeeData = (data || []).map(profile => ({
        ...profile,
        role: {
          id: profile.role_id,
          role_name: profile.role_name,
          role_description: profile.role_description
        }
      }));
      
      setEmployees(employeeData);
      setFilteredEmployees(employeeData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('role_name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, [fetchEmployees, fetchRoles]);

  useEffect(() => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(emp => 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => emp.current_status === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(emp => emp.role?.role_name === roleFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, statusFilter, roleFilter, departmentFilter]);

  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];

  const generateCSV = () => {
    const headers = ['Name', 'Employee Code', 'Email', 'Role', 'Department', 'Designation', 'Status', 'Phone', 'Date of Joining'];
    const csvData = employees.map(emp => [
      `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      emp.employee_code || '',
      emp.email || 'N/A',
      emp.role?.role_name || '',
      emp.department || '',
      emp.designation || '',
      emp.current_status || '',
      emp.phone ? emp.phone.replace(/^\+91\s*/, '+91 ') : '',
      emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : ''
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field || ''}"`).join(','))
      .join('\n');
    
    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      const { error } = await supabase.rpc('delete_user', {
        user_id: employeeToDelete.id
      });

      if (error) throw error;

      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    } finally {
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success/10 text-success border-success/20';
      case 'On Leave': return 'bg-warning/10 text-warning border-warning/20';
      case 'Inactive': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Management': return <Crown className="w-4 h-4" />;
      case 'HR': return <Users className="w-4 h-4" />;
      case 'Team Lead': return <UserCheck className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  if (!canManageEmployees) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <UserX className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">You don't have permission to view employee information.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <MainNav />
      
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <span>Employee Management</span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg">
                Manage your organization's workforce with ease
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  const csvContent = generateCSV();
                  downloadCSV(csvContent, 'employees.csv');
                }}
                className="bg-white/80 hover:bg-white"
              >
                Export CSV
              </Button>
              <BulkEmployeeUpload onSuccess={fetchEmployees} />
              <AddEmployeeDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSuccess={fetchEmployees}
              />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Employees</p>
                    <p className="text-2xl font-bold text-foreground">{employees.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Active</p>
                    <p className="text-2xl font-bold text-success">
                      {employees.filter(e => e.current_status === 'Active').length}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-success/10">
                    <UserCheck className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">On Leave</p>
                    <p className="text-2xl font-bold text-warning">
                      {employees.filter(e => e.current_status === 'On Leave').length}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-warning/10">
                    <Calendar className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Departments</p>
                    <p className="text-2xl font-bold text-foreground">{departments.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="mb-8 border-0 shadow-md bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/50"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.role_name}>
                      {getUserRoleDisplayName(role.role_name as UserRoleType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setRoleFilter('all');
                  setDepartmentFilter('all');
                }}
                className="bg-white/50"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employee Grid */}
        <Card className="border-0 shadow-md bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Employee Directory ({filteredEmployees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-48"></div>
                  </div>
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No employees found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map((employee) => (
                  <Card key={employee.id} className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/80">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-semibold text-lg">
                            {(employee.first_name?.[0] || '') + (employee.last_name?.[0] || '')}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-foreground">
                              {employee.first_name} {employee.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {employee.employee_code || 'No Code'}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(employee.current_status)} font-medium`}>
                          {employee.current_status}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center space-x-2 text-sm">
                          {getRoleIcon(employee.role?.role_name || '')}
                          <span className="font-medium text-foreground">
                            {employee.role?.role_name ? getUserRoleDisplayName(employee.role.role_name as UserRoleType) : 'No Role'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Briefcase className="w-4 h-4" />
                          <span>{employee.designation || 'No Position'}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>{employee.department || 'No Department'}</span>
                        </div>

                        {employee.date_of_joining ? (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>Joined {new Date(employee.date_of_joining).toLocaleDateString()}</span>
                          </div>
                        ): (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>Joining date not added</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-sm w-full">
                          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {employee.email ? (
                              <EmailManagement
                                employeeId={employee.id}
                                currentEmail={employee.email}
                                employeeName={`${employee.first_name} ${employee.last_name}`}
                                onUpdate={fetchEmployees}
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="mb-4" />

                      <div className="flex justify-between items-center">
                        <Link to={`/employees/${employee.id}`}>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            View Details
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEmployeeToDelete(employee);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {employeeToDelete?.first_name} {employeeToDelete?.last_name}? 
              This action cannot be undone and will permanently remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive hover:bg-destructive/90">
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
