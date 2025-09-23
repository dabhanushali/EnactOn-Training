import { useAuth } from '@/hooks/auth-utils';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: JSX.Element;
  roles?: string[]; // Optional array of roles that can access the route
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If roles are specified, check if the user's role is one of them
  if (roles && roles.length > 0 && (!profile || !profile.role?.role_name || !roles.includes(profile.role.role_name))) {
    // User does not have the required role, redirect them
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
