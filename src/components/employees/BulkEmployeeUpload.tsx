import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, FileText, CheckCircle, XCircle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export const BulkEmployeeUpload = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  const downloadTemplate = () => {
    const template = `first_name,last_name,email,phone,employee_code,department,designation,date_of_joining
John,Doe,john.doe@example.com,+91 9876543210,EMP001,Engineering,Software Engineer,2024-01-15
Jane,Smith,jane.smith@example.com,+91 9876543211,EMP002,HR,HR Manager,2024-02-01`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'employee_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Template downloaded successfully');
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const employees = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const employee: any = {};
      
      headers.forEach((header, index) => {
        employee[header] = values[index] || null;
      });
      
      employees.push(employee);
    }

    return employees;
  };

  const validateEmployee = (emp: any, index: number): string | null => {
    if (!emp.first_name) return `Row ${index + 2}: First name is required`;
    if (!emp.last_name) return `Row ${index + 2}: Last name is required`;
    if (!emp.email) return `Row ${index + 2}: Email is required`;
    if (!emp.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return `Row ${index + 2}: Invalid email format`;
    }
    return null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await file.text();
      const employees = parseCSV(text);

      if (employees.length === 0) {
        toast.error('No valid employee data found in file');
        setUploading(false);
        return;
      }

      // Validate all employees
      const errors: string[] = [];
      employees.forEach((emp, index) => {
        const error = validateEmployee(emp, index);
        if (error) errors.push(error);
      });

      if (errors.length > 0) {
        setResult({ success: 0, failed: errors.length, errors });
        setUploading(false);
        return;
      }

      // Get trainee role
      const { data: traineeRole } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'Trainee')
        .single();

      if (!traineeRole) {
        throw new Error('Trainee role not found');
      }

      let successCount = 0;
      let failCount = 0;
      const uploadErrors: string[] = [];

      // Process employees
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        setProgress(((i + 1) / employees.length) * 100);

        try {
          // Check if employee code already exists
          if (emp.employee_code) {
            const { data: existing } = await supabase
              .from('profiles')
              .select('id')
              .eq('employee_code', emp.employee_code)
              .single();

            if (existing) {
              uploadErrors.push(`Row ${i + 2}: Employee code ${emp.employee_code} already exists`);
              failCount++;
              continue;
            }
          }

          // Create user in auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: emp.email,
            email_confirm: true,
            user_metadata: {
              first_name: emp.first_name,
              last_name: emp.last_name
            }
          });

          if (authError) throw authError;

          // Update profile with additional data
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              employee_code: emp.employee_code,
              phone: emp.phone,
              department: emp.department,
              designation: emp.designation,
              date_of_joining: emp.date_of_joining || new Date().toISOString().split('T')[0],
              current_status: 'Pre-Joining',
              role_id: traineeRole.id
            })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;

          successCount++;
        } catch (error) {
          console.error(`Error creating employee at row ${i + 2}:`, error);
          uploadErrors.push(`Row ${i + 2}: ${(error as Error).message}`);
          failCount++;
        }
      }

      setResult({
        success: successCount,
        failed: failCount,
        errors: uploadErrors
      });

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} employee(s)`);
        onSuccess();
      }

    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white/80">
          <Users className="w-4 h-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="w-6 h-6" />
            Bulk Employee Upload
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Alert>
            <FileText className="w-4 h-4" />
            <AlertDescription>
              Upload a CSV file containing employee information. Download the template below to see the required format.
            </AlertDescription>
          </Alert>

          {/* Download Template */}
          <Card className="border-dashed border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Download CSV Template</p>
                    <p className="text-sm text-muted-foreground">
                      Get the correct format for bulk upload
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload File */}
          <div className="space-y-2">
            <Label htmlFor="csv-upload">Upload CSV File</Label>
            <div className="flex items-center gap-4">
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Processing...</span>
                <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <Card className={result.failed > 0 ? 'border-warning' : 'border-success'}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="font-medium text-success">
                      Successfully Added: {result.success}
                    </span>
                  </div>
                </div>

                {result.failed > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 text-destructive" />
                      <span className="font-medium text-destructive">
                        Failed: {result.failed}
                      </span>
                    </div>
                    
                    {result.errors.length > 0 && (
                      <div className="mt-4 p-4 bg-destructive/10 rounded-md max-h-40 overflow-y-auto">
                        <p className="text-sm font-medium mb-2">Errors:</p>
                        <ul className="text-sm space-y-1">
                          {result.errors.map((error, idx) => (
                            <li key={idx} className="text-destructive">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Required Fields Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-2">Required Fields:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• first_name, last_name, email (required)</li>
                <li>• phone, employee_code, department, designation (optional)</li>
                <li>• date_of_joining format: YYYY-MM-DD (optional, defaults to today)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
