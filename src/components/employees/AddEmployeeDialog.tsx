import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { UserRoleType, getUserRoleDisplayName } from '@/lib/enums';
import { MASTER_DATA, getDesignationDisplayName } from '@/lib/masterData';

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Role {
  id: string;
  role_name: UserRoleType;
  role_description: string | null;
}

export function AddEmployeeDialog({ open, onOpenChange, onSuccess }: AddEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    employeeCode: '',
    department: '',
    designation: '',
    phone: '',
    roleId: ''
  });

  useEffect(() => {
    if (open) {
      fetchRoles();
    }
  }, [open]);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, role_name, role_description')
        .order('role_name');

      if (error) throw error;
      
      const rolesData = data as Role[];
      setRoles(rolesData);

      // Set default role to Trainee
      const traineeRole = rolesData.find(role => role.role_name === 'Trainee');
      if (traineeRole) {
        setFormData(prev => ({ ...prev, roleId: traineeRole.id }));
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for unique employee code
    if (formData.employeeCode) {
      const { data: existingEmployee, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('employee_code', formData.employeeCode)
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

    setLoading(true);
    // Save the current session
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update the profile with additional information
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            employee_code: formData.employeeCode || null,
            department: formData.department || null,
            designation: formData.designation || null,
            phone: formData.phone || null,
            role_id: formData.roleId || null,
            current_status: 'Pre-Joining'
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      }

      toast.success('Employee created successfully');
      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error(error.message || 'Failed to create employee');
    } finally {
      // Restore the original session
      if (currentSession) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
        if (sessionError) {
          toast.error("Could not restore session. Please refresh the page.");
        }
      }
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      employeeCode: '',
      department: '',
      designation: '',
      phone: '',
      roleId: ''
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Button 
        onClick={() => onOpenChange(true)} 
        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Add Employee
      </Button>
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john.doe@company.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeCode">Employee Code</Label>
              <Input
                id="employeeCode"
                value={formData.employeeCode}
                onChange={(e) => handleInputChange('employeeCode', e.target.value)}
                placeholder="EMP001"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {MASTER_DATA.departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Select value={formData.designation} onValueChange={(value) => handleInputChange('designation', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {MASTER_DATA.designations.map((designation) => (
                    <SelectItem key={designation} value={designation}>
                      {getDesignationDisplayName(designation)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={formData.roleId} onValueChange={(value) => handleInputChange('roleId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {getUserRoleDisplayName(role.role_name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Create Employee
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
