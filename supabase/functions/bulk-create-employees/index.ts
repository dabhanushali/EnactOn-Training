// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { authenticateUser } from "../_shared/auth.ts";

interface EmployeeInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  employee_code?: string | null;
  department?: string | null;
  designation?: string | null;
  date_of_joining?: string | null;
}

interface BulkResult {
  success: number;
  failed: number;
  errors: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await authenticateUser(req);
  if (!auth.success || !auth.user) {
    return new Response(JSON.stringify({ error: auth.error || "Unauthorized" }), {
      status: auth.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase service configuration");
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Enforce that only HR or Management can run bulk creation
    const { data: callerRoleData, error: roleErr } = await admin.rpc("get_user_role", { user_id: auth.user.id });
    if (roleErr) throw roleErr;
    const callerRole = (callerRoleData as string) || "";
    if (!(["HR", "Management"].includes(callerRole))) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient role" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const employees: EmployeeInput[] = Array.isArray(body?.employees) ? body.employees : [];

    if (employees.length === 0) {
      return new Response(JSON.stringify({ error: "No employees provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get trainee role id
    const { data: traineeRole, error: traineeErr } = await admin
      .from("roles")
      .select("id")
      .eq("role_name", "Trainee")
      .single();
    if (traineeErr || !traineeRole) throw new Error("Trainee role not found");

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      // Basic validation
      if (!emp.first_name || !emp.last_name || !emp.email) {
        failed++;
        errors.push(`Row ${i + 2}: Missing required fields`);
        continue;
      }
      if (!/^\S+@\S+\.\S+$/.test(emp.email)) {
        failed++;
        errors.push(`Row ${i + 2}: Invalid email format`);
        continue;
      }

      try {
        // Check duplicate employee_code
        if (emp.employee_code) {
          const { data: existing, error: exErr } = await admin
            .from("profiles")
            .select("id")
            .eq("employee_code", emp.employee_code)
            .maybeSingle();
          if (exErr) throw exErr;
          if (existing) {
            failed++;
            errors.push(`Row ${i + 2}: Employee code ${emp.employee_code} already exists`);
            continue;
          }
        }

        // Create user via Admin API without affecting caller session
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: emp.email,
          password: "Wellcome@123",
          email_confirm: true,
          user_metadata: {
            first_name: emp.first_name,
            last_name: emp.last_name,
          },
        });
        if (createErr) throw createErr;
        const newUser = created.user;
        if (!newUser) throw new Error("Failed to create user");

        // Update profile with additional fields
        const { error: updErr } = await admin
          .from("profiles")
          .update({
            employee_code: emp.employee_code ?? null,
            phone: emp.phone ?? null,
            department: emp.department ?? null,
            designation: emp.designation ?? null,
            date_of_joining: emp.date_of_joining ?? new Date().toISOString().split("T")[0],
            current_status: "Pre-Joining",
            role_id: traineeRole.id,
          })
          .eq("id", newUser.id);
        if (updErr) throw updErr;

        success++;
      } catch (e: any) {
        console.error("Bulk create error:", e);
        failed++;
        errors.push(`Row ${i + 2}: ${e?.message || "Unknown error"}`);
      }
    }

    const result: BulkResult = { success, failed, errors };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
