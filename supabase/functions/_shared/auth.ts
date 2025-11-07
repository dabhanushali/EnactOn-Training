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

    // Create Supabase client with the user's JWT token for auth context
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Validate JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return {
        success: false,
        error: 'Invalid authentication',
        status: 401
      };
    }

    // Verify user profile exists (uses user's JWT token, so RLS will work)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
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
