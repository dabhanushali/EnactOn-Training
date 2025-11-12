import { createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { UserRoleType } from '@/lib/enums';

interface Profile {
  id: string;
  employee_code: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  current_status: string;
  role: {
    role_name: UserRoleType;
    role_description: string | null;
  } | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth monitoring utilities for debugging
export const logAuthEvent = (event: string, details: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUTH ${timestamp}] ${event}:`, details);

  // In production, you might want to send this to a logging service
  // logToService({ event, details, timestamp });
};

export const isAuthErrorRecoverable = (error: Error | unknown): boolean => {
  // Define which errors are recoverable vs require user action
  const recoverableErrors = [
    'Network request failed',
    'Failed to fetch',
    'timeout',
    'network',
  ];

  const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return recoverableErrors.some(recoverableError =>
    errorMessage.includes(recoverableError.toLowerCase())
  );
};
