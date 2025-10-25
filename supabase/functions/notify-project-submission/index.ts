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

interface NotificationRequest {
  assignmentId: string;
  traineeId: string;
  projectId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assignmentId, traineeId, projectId }: NotificationRequest = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get trainee info
    const { data: traineeProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name, manager_id")
      .eq("id", traineeId)
      .single();

    // Get project info
    const { data: project } = await supabase
      .from("projects")
      .select("project_name")
      .eq("id", projectId)
      .single();

    // Get team lead email
    const teamLeadEmail = traineeProfile?.manager_id 
      ? (await supabase.rpc("get_user_email", { user_id: traineeProfile.manager_id })).data
      : null;

    // Get HR emails
    const { data: hrProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("role_id", (await supabase.from("roles").select("id").eq("role_name", "HR").single()).data?.id);

    const hrEmails = await Promise.all(
      (hrProfiles || []).map(async (profile) => {
        const email = await supabase.rpc("get_user_email", { user_id: profile.id });
        return email.data;
      })
    );

    const recipients = [...hrEmails.filter(Boolean)];
    if (teamLeadEmail) recipients.push(teamLeadEmail);

    const emailResults = [];

    for (const recipient of recipients) {
      const emailResult = await transporter.sendMail({
        from: `GrowPro Suite <${Deno.env.get("EMAIL_USER")}>`,
        to: recipient as string,
        subject: `Project Submission: ${project?.project_name} by ${traineeProfile?.first_name} ${traineeProfile?.last_name}`,
        html: `
          <h2>New Project Submission</h2>
          <p>Hello,</p>
          <p><strong>${traineeProfile?.first_name} ${traineeProfile?.last_name}</strong> has submitted their work for the project <strong>${project?.project_name}</strong>.</p>
          <p>Please review the submission at your earliest convenience:</p>
          <p><a href="http://growpro-suite.lovable.app/" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Submission</a></p>
          <p>Best regards,<br>GrowPro Suite</p>
        `,
      });

      emailResults.push(emailResult);
    }

    console.log("Project submission notification emails sent:", emailResults);

    return new Response(
      JSON.stringify({ success: true, emailsSent: emailResults.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-project-submission function:", error);
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
