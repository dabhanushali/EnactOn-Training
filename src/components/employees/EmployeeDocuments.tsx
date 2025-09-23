import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/auth-utils';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Trash2, Download, File as FileIcon } from 'lucide-react';

interface EmployeeDocumentsProps {
  employeeId: string;
}

interface Document {
  id: string;
  document_name: string;
  file_path: string;
  created_at: string;
}

export function EmployeeDocuments({ employeeId }: EmployeeDocumentsProps) {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');

  const canManage = profile?.role?.role_name === 'HR' || profile?.role?.role_name === 'Management';

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('id, document_name, file_path, created_at')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      toast.error(`Failed to fetch documents: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.warning("Please select a file to upload.");
      return;
    }
    if (!documentName.trim()) {
      toast.warning("Please enter a name for the document.");
      return;
    }
    if (!canManage) {
        toast.error("You do not have permission to upload documents.");
        return;
    }
    if (!profile?.id) {
        toast.error("Could not identify uploading user.");
        return;
    }

    setUploading(true);
    setUploadProgress(0);

    const fileExtension = selectedFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExtension}`;
    const filePath = `${employeeId}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('employee_documents').insert({
        employee_id: employeeId,
        document_name: documentName.trim(),
        file_path: filePath,
        document_type: selectedFile.type,
        uploaded_by: profile.id,
      });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully.');
      setSelectedFile(null);
      setDocumentName('');
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if(fileInput) fileInput.value = "";
      fetchDocuments();
    } catch (error) {
      toast.error(`Upload failed: ${(error as Error).message || 'An unknown error occurred'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: Document) => {
    if (!canManage) {
        toast.error("You do not have permission to delete documents.");
        return;
    }
    if (!window.confirm(`Are you sure you want to delete "${document.document_name}"? This action cannot be undone.`)) {
        return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from('employee-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast.success('Document deleted successfully.');
      fetchDocuments();
    } catch (error) {
      toast.error(`Failed to delete document: ${(error as Error).message || 'An unknown error occurred'}`);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(document.file_path, 60); // 60 seconds expiry time

      if (error) throw error;
      if (!data) throw new Error("Could not get download URL.");

      // In a new tab, open the signed URL to download the file
      window.open(data.signedUrl, '_blank');
      
    } catch (error) {
      toast.error(`Failed to download file: ${(error as Error).message || 'An unknown error occurred'}`);
    }
  };


  return (
    <Card className="mt-4">
      <CardHeader>
         
        <CardDescription>Manage and view employee-related documents.</CardDescription>
      </CardHeader>
      <CardContent>
        {canManage && (
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <h3 className="text-lg font-semibold">Upload New Document</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="doc-name">Document Name</Label>
                    <Input 
                        id="doc-name" 
                        type="text" 
                        value={documentName} 
                        onChange={(e) => setDocumentName(e.target.value)} 
                        placeholder="e.g., Offer Letter, ID Card" 
                    />
                </div>
                <div>
                    <Label htmlFor="file-input">File</Label>
                    <Input id="file-input" type="file" onChange={handleFileSelect} />
                </div>
            </div>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !documentName.trim()}>
              {uploading ? 'Uploading...' : <><Upload className="h-4 w-4 mr-2" /> Upload Document</>}
            </Button>
            {uploading && <Progress value={uploadProgress} className="mt-2" />}
            {selectedFile && !uploading && <p className="text-sm text-muted-foreground mt-2">Selected file: {selectedFile.name}</p>}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Uploaded Documents</h3>
          {loading ? (
            <p>Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-muted-foreground">No documents have been uploaded for this employee.</p>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-md hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{doc.document_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4"/>
                    </Button>
                    {canManage && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(doc)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}