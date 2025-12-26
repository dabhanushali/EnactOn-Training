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
      console.log('No authorization header found');
      return {
        success: false,
        error: 'Authentication required',
        status: 401
      };
    }

    // Create Supabase client with the user's JWT token for auth context
    const token = authHeader.replace('Bearer ', '');
    
    // Check for anon key - support both naming conventions
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    
    if (!anonKey || !supabaseUrl) {
      console.error('Missing Supabase configuration:', { hasUrl: !!supabaseUrl, hasKey: !!anonKey });
      return {
        success: false,
        error: 'Server configuration error',
        status: 500
      };
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      anonKey,
      { 
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Validate JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError) {
      console.error('User auth error:', userError.message);
      return {
        success: false,
        error: 'Invalid authentication',
        status: 401
      };
    }

    if (!user) {
      console.log('No user found from token');
      return {
        success: false,
        error: 'Invalid authentication',
        status: 401
      };
    }

    console.log('User authenticated:', user.id);

    // Return success without checking profile - profile check can be done by calling function if needed
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
