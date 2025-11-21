import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import nodemailer from "nodemailer";

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

interface SessionNotificationRequest {
  sessionId: string;
  attendeeIds?: string[]; // Optional: specific attendees to notify
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, attendeeIds }: SessionNotificationRequest = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get session details
    const { data: session } = await supabase
      .from("training_sessions")
      .select("session_name, start_datetime, end_datetime, meeting_link, trainer_id, attendees, session_type")
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

    // Determine which attendees to notify
    let attendeesToNotify: string[];
    if (attendeeIds && attendeeIds.length > 0) {
      // Only notify specific attendees (newly added)
      attendeesToNotify = attendeeIds;
    } else {
      // Notify all attendees (original behavior for backward compatibility)
      attendeesToNotify = (session.attendees || []) as string[];
    }

    // Get attendee emails only for attendees to notify
    const attendeeEmails = await Promise.all(
      attendeesToNotify.map(async (id: string) => {
        const email = await supabase.rpc("get_user_email", { user_id: id });
        return email.data;
      })
    );

    // Get trainer email if trainer exists and we're notifying all (initial creation)
    const recipients = [...attendeeEmails.filter(Boolean)];
    if (session.trainer_id && (!attendeeIds || attendeeIds.length === 0)) {
      // Only add trainer to recipients if we're doing full notification (not just newly added attendees)
      const trainerEmail = (await supabase.rpc("get_user_email", { user_id: session.trainer_id })).data;
      if (trainerEmail) recipients.push(trainerEmail);
    }

    const startDate = new Date(session.start_datetime);
    const endDate = new Date(session.end_datetime);
    const formattedStartDate = startDate.toLocaleDateString();
    const formattedStartTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEndTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const emailResults = [];

    for (const recipient of recipients) {
      const emailResult = await transporter.sendMail({
        from: `EnactOn Training <${Deno.env.get("EMAIL_USER")}>`,
        to: recipient as string,
        subject: `Training Session ${attendeeIds && attendeeIds.length > 0 ? 'Assigned' : 'Scheduled'}: ${session.session_name}`,
        html: `
          <h2>Training Session Scheduled</h2>
          <p>Hello,</p>
          <p>A new training session has been scheduled:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Session:</strong> ${session.session_name}</p>
            <p><strong>Type:</strong> ${session.session_type || 'N/A'}</p>
            <p><strong>Date:</strong> ${formattedStartDate}</p>
            <p><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
            <p><strong>Trainer:</strong> ${trainerProfile?.first_name} ${trainerProfile?.last_name}</p>
            ${session.meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${session.meeting_link}">${session.meeting_link}</a></p>` : ''}
          </div>
          <p>Please visit the EnactOn Training for more details:</p>
          <p><a href="http://enactontraining.vercel.app/" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Session</a></p>
          <p>Best regards,<br>EnactOn Training</p>
        `,
      });

      emailResults.push(emailResult);
    }

    console.log("Training session notification emails sent:", emailResults);

    return new Response(
      JSON.stringify({ success: true, emailsSent: emailResults.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-training-session function:", error);
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
