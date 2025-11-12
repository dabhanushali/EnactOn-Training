import { useEffect, useState, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRoleType } from '@/lib/enums';
import { AuthContext, useAuth } from './auth-utils';

// This is a dummy comment to force re-evaluation

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const storedProfile = sessionStorage.getItem('userProfile');
      return storedProfile ? JSON.parse(storedProfile) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const attempt = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, employee_code, first_name, last_name, phone, department, designation, current_status,
            role:roles(role_name, role_description)
          `)
          .eq('id', userId)
          .maybeSingle();

        if (error) console.warn('Profile join fetch failed, will try fallback:', error);
        if (data) return data as Profile;

        const { data: base, error: baseErr } = await supabase
          .from('profiles')
          .select('id, employee_code, first_name, last_name, phone, department, designation, current_status, role_id')
          .eq('id', userId)
          .maybeSingle();

        if (baseErr) {
          console.error('Base profile fetch failed:', baseErr);
          return null;
        }
        if (!base) {
          console.warn('No profile row found for user:', userId);
          return null;
        }

        let role: Profile['role'] = null;
        if ((base as { role_id?: string }).role_id) {
          const { data: roleRow, error: roleErr } = await supabase
            .from('roles')
            .select('role_name, role_description')
            .eq('id', (base as { role_id?: string }).role_id!)
            .maybeSingle();
          if (roleErr) console.warn('Role fetch failed:', roleErr);
          else if (roleRow) role = { role_name: roleRow.role_name as UserRoleType, role_description: roleRow.role_description ?? null };
        }

        return { ...base, role } as Profile;
      };

      const delays = [0, 200, 1000];
      for (let i = 0; i < delays.length; i++) {
        if (delays[i]) await new Promise(res => setTimeout(res, delays[i]));
        const result = await attempt();
        if (result) {
          sessionStorage.setItem('userProfile', JSON.stringify(result));
          return result;
        }
      }
      return null;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async (userId?: string) => {
    const id = userId ?? user?.id;
    if (id) {
      const profileData = await fetchProfile(id);
      setProfile(profileData);
    } else {
      setProfile(null);
      sessionStorage.removeItem('userProfile');
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth Event: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      });

      // Only clear profile on actual sign out, not during token refresh
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        sessionStorage.removeItem('userProfile');
        return;
      }

      // Handle token refresh - don't clear profile unnecessarily
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
        // Only refresh profile if we don't have one or if user changed
        if (!profile || profile.id !== session.user.id) {
          refreshProfile(session.user.id);
        }
        return;
      }

      // Handle sign in and other events
      setUser(session?.user ?? null);

      if (session?.user) {
        refreshProfile(session.user.id);
      } else {
        setProfile(null);
        sessionStorage.removeItem('userProfile');
      }
    });

    const initializeAuth = async () => {
      setLoading(true);
      let retries = 3;

      while (retries > 0) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;

          setUser(session?.user ?? null);

          if (session?.user) {
            if (!profile || profile.id !== session.user.id) {
              console.log('Fetching profile for user:', session.user.id);
              const profileData = await fetchProfile(session.user.id);
              setProfile(profileData);
              if (!profileData) console.warn('No profile found for user:', session.user.id);
            }
          } else {
            setProfile(null);
            sessionStorage.removeItem('userProfile');
          }
          break; // Success, exit retry loop
        } catch (error) {
          retries--;
          console.error(`Auth initialization failed (attempt ${4 - retries}/3):`, error);

          if (retries === 0) {
            console.error('Failed to initialize auth after all retries');
            // Clear any potentially corrupted state
            setUser(null);
            setProfile(null);
            sessionStorage.removeItem('userProfile');
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
          }
        }
      }

      setLoading(false);
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, [user?.id, refreshProfile, fetchProfile]);

  const signOut = async () => {
    try {
      console.log('Signing out...');
      setUser(null);
      setProfile(null);
      sessionStorage.removeItem('userProfile');
      setLoading(false);
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error && error.message !== 'Session from session_id claim in JWT does not exist') {
        console.warn('Sign out error (non-critical):', error);
      }
      console.log('Sign out completed');
    } catch (error) {
      console.warn('Sign out error (handled):', error);
    }
  };

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  }), [user, profile, loading, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
