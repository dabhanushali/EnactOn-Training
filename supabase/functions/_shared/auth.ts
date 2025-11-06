import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export interface AuthResult {
  success: boolean;
  user?: { id: string; email?: string };
  error?: string;
  status: number;
}

/**
 * Authenticates a user from the Authorization header
 * @param req - The request object containing headers
 * @returns AuthResult with user data or error information
 */
export async function authenticateUser(req: Request): Promise<AuthResult> {
  try {
    // Check Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Validate JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('User validation error:', userError);
      return {
        success: false,
        error: 'Invalid authentication',
        status: 401
      };
    }

    // Verify user profile exists (now using authenticated client)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile query error:', profileError);
      return {
        success: false,
        error: 'Error checking user profile',
        status: 500
      };
    }

    if (!profile) {
      return {
        success: false,
        error: 'User profile not found',
        status: 403
      };
    }

    return {
      success: true,
      user,
      status: 200
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      status: 500
    };
  }
}
