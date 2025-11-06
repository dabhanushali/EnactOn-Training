import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import nodemailer from "npm:nodemailer@6.9.16";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const transporter = nodemailer.createTransport({
  host: Deno.env.get("EMAIL_HOST"),
  port: parseInt(Deno.env.get("EMAIL_PORT") || "587"),
  secure: Deno.env.get("EMAIL_PORT") === "465",
  auth: {
    user: Deno.env.get("EMAIL_USER"),
    pass: Deno.env.get("EMAIL_APP_PASSWORD"),
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all HR users for recipients
    const { data: hrProfiles, error: hrError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role_id", (await supabase.from("roles").select("id").eq("role_name", "HR").single()).data?.id);

    if (hrError) throw hrError;

    const hrEmails = await Promise.all(
      (hrProfiles || []).map(async (profile) => {
        const email = await supabase.rpc("get_user_email", { user_id: profile.id });
        return email.data;
      })
    );

    // Calculate dates for 15, 30, 45, 60, 75, 90 days ago (every 15 days)
    const today = new Date();
    const checkDates = [];
    
    for (let days = 15; days <= 90; days += 15) {
      const date = new Date(today);
      date.setDate(today.getDate() - days);
      checkDates.push({
        days,
        date: date.toISOString().split('T')[0]
      });
    }

    const emailsSent = [];

    for (const checkDate of checkDates) {
      // Get pre-joining employees with this date_of_joining
      const { data: preJoiningEmployees, error: employeeError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, date_of_joining")
        .eq("date_of_joining", checkDate.date)
        .eq("current_status", "Pre-Joining")
        .eq("role_id", (await supabase.from("roles").select("id").eq("role_name", "Trainee").single()).data?.id);

      if (employeeError) {
        console.error(`Error fetching pre-joining employees for ${checkDate.days} days:`, employeeError);
        continue;
      }

      for (const employee of preJoiningEmployees || []) {
        // Get employee email
        const employeeEmail = await supabase.rpc("get_user_email", { user_id: employee.id });
        
        if (employeeEmail.data) {
          // Send to employee
          const employeeEmailResult = await transporter.sendMail({
            from: `EnactOn Training <${Deno.env.get("EMAIL_USER")}>`,
            to: employeeEmail.data as string,
            subject: `Welcome! ${checkDate.days} Days Until Your Start Date`,
            html: `
              <h2>Hello ${employee.first_name}!</h2>
              <p>We're excited to have you join our team soon!</p>
              <p><strong>Days until your start date:</strong> ${checkDate.days} days</p>
              <p><strong>Expected Start Date:</strong> ${employee.date_of_joining}</p>
              <p>Please make sure to:</p>
              <ul>
                <li>Complete any pre-joining documentation</li>
                <li>Review the course materials assigned to you</li>
                <li>Prepare any questions for your first day</li>
              </ul>
              <p><a href="http://enactontraining.vercel.app/" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Access Your Portal</a></p>
              <p>Looking forward to having you on the team!</p>
              <p>Best regards,<br>EnactOn Training</p>
            `,
          });

          emailsSent.push({
            recipient: 'employee',
            employee: `${employee.first_name} ${employee.last_name}`,
            days: checkDate.days,
            email: employeeEmail.data,
            result: employeeEmailResult
          });
        }

        // Send to HR
        for (const hrEmail of hrEmails.filter(Boolean)) {
          const hrEmailResult = await transporter.sendMail({
            from: `EnactOn Training <${Deno.env.get("EMAIL_USER")}>`,
            to: hrEmail as string,
            subject: `Pre-Joining Follow-up: ${checkDate.days} Days - ${employee.first_name} ${employee.last_name}`,
            html: `
              <h2>Pre-Joining Employee Follow-up</h2>
              <p>Hello,</p>
              <p>This is a ${checkDate.days}-day follow-up for pre-joining employee:</p>
              <p><strong>Employee:</strong> ${employee.first_name} ${employee.last_name}</p>
              <p><strong>Expected Start Date:</strong> ${employee.date_of_joining}</p>
              <p><strong>Days Remaining:</strong> ${checkDate.days} days</p>
              <p>Please ensure:</p>
              <ul>
                <li>All documentation is in order</li>
                <li>Pre-joining courses are assigned</li>
                <li>Onboarding plan is ready</li>
                <li>Workstation and equipment are prepared</li>
              </ul>
              <p><a href="http://enactontraining.vercel.app/employees/${employee.id}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Employee Profile</a></p>
              <p>Best regards,<br>EnactOn Training</p>
            `,
          });

          emailsSent.push({
            recipient: 'HR',
            employee: `${employee.first_name} ${employee.last_name}`,
            days: checkDate.days,
            email: hrEmail,
            result: hrEmailResult
          });
        }
      }
    }

    console.log("Pre-joining emails sent:", emailsSent);

    return new Response(
      JSON.stringify({ success: true, emailsSent: emailsSent.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-pre-joining-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
