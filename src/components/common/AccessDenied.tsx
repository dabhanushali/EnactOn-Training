import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  message?: string;
  allowedRoles?: string[];
  showBackButton?: boolean;
}

export const AccessDenied = ({ 
  message = "You don't have permission to access this page.", 
  allowedRoles,
  showBackButton = true
}: AccessDeniedProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl font-semibold text-destructive">
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {message}
          </p>
          {allowedRoles && allowedRoles.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p>This page is restricted to:</p>
              <ul className="list-disc list-inside mt-2">
                {allowedRoles.map(role => (
                  <li key={role} className="text-foreground font-medium">{role}</li>
                ))}
              </ul>
            </div>
          )}
          {showBackButton && (
            <Button 
              onClick={() => navigate(-1)}
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};