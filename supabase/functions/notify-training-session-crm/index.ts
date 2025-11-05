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
  sessionId: string;
  attendeeIds: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, attendeeIds }: NotificationRequest = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session info
    const { data: session } = await supabase
      .from("training_sessions")
      .select("session_name, trainer_id, meeting_link, start_datetime")
      .eq("id", sessionId)
      .single();

    if (!session) {
      throw new Error("Session not found");
    }

    // Get trainer info
    const { data: trainerProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", session.trainer_id)
      .single();

    const trainerEmail = (await supabase.rpc("get_user_email", { user_id: session.trainer_id })).data;

    // Get attendee emails
    const attendeeEmails = await Promise.all(
      attendeeIds.map(async (id) => {
        const email = await supabase.rpc("get_user_email", { user_id: id });
        return email.data;
      })
    );

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

    // Prepare CRM payload
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const dueDate = new Date(today.setDate(today.getDate() + 3)).toISOString().split('T')[0];

    const assignees = [trainerEmail, ...attendeeEmails].filter(Boolean);
    const followers = [trainerEmail, ...hrEmails].filter(Boolean);

    const crmPayload = {
      name: `Review for ${session.session_name}`,
      startdate: startDate,
      duedate: dueDate,
      tasktype: "Training",
      rel_type: "Project",
      rel_type_id: 567,
      assignees,
      followers,
      description: `Review Meeting between ${trainerProfile?.first_name} ${trainerProfile?.last_name} and trainees. Meeting Link: ${session.meeting_link}`,
    };

    // Try CRM webhook first
    let crmSuccess = false;
    try {
      console.log("Attempting CRM task creation:", crmPayload);
      const webhookResponse = await fetch("https://webhook.site/8f2a2f4d-8691-4f54-bdbd-49f1ff316e02", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(crmPayload),
      });

      if (webhookResponse.ok) {
        crmSuccess = true;
        console.log("CRM task created successfully");
      } else {
        console.error("CRM webhook failed with status:", webhookResponse.status);
      }
    } catch (webhookError: any) {
      console.error("CRM webhook error:", webhookError.message);
    }

    // Fallback to email if CRM failed
    const emailResults = [];
    if (!crmSuccess) {
      console.log("Falling back to email notifications");
      const recipients = [...hrEmails.filter(Boolean)];
      if (trainerEmail) recipients.push(trainerEmail);

      for (const recipient of recipients) {
        const emailResult = await transporter.sendMail({
          from: `GrowPro Suite <${Deno.env.get("EMAIL_USER")}>`,
          to: recipient as string,
          subject: `Training Session Created: ${session.session_name}`,
          html: `
            <h2>New Training Session Created</h2>
            <p>Hello,</p>
            <p>A new training session <strong>${session.session_name}</strong> has been scheduled with ${attendeeIds.length} participant(s).</p>
            <p><strong>Meeting Link:</strong> <a href="${session.meeting_link}">${session.meeting_link}</a></p>
            <p>Please review the session details at your earliest convenience:</p>
            <p><a href="http://growpro-suite.lovable.app/training-sessions" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Session</a></p>
            <p>Best regards,<br>GrowPro Suite</p>
          `,
        });

        emailResults.push(emailResult);
      }
      console.log("Fallback emails sent:", emailResults.length);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        crmCreated: crmSuccess,
        emailsSent: emailResults.length 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-training-session-crm function:", error);
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
