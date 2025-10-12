import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  date_of_joining: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all HR users
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

    // Calculate dates for 30, 60, 90 days ago
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const checkDates = [
      { days: 30, date: thirtyDaysAgo.toISOString().split('T')[0] },
      { days: 60, date: sixtyDaysAgo.toISOString().split('T')[0] },
      { days: 90, date: ninetyDaysAgo.toISOString().split('T')[0] }
    ];

    const emailsSent = [];

    for (const checkDate of checkDates) {
      const { data: trainees, error: traineeError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, date_of_joining")
        .eq("date_of_joining", checkDate.date)
        .eq("role_id", (await supabase.from("roles").select("id").eq("role_name", "Trainee").single()).data?.id);

      if (traineeError) {
        console.error(`Error fetching trainees for ${checkDate.days} days:`, traineeError);
        continue;
      }

      for (const trainee of trainees || []) {
        for (const hrEmail of hrEmails.filter(Boolean)) {
          const emailResult = await resend.emails.send({
            from: "GrowPro Suite <onboarding@resend.dev>",
            to: [hrEmail as string],
            subject: `${checkDate.days}-Day Review Meeting Required for ${trainee.first_name} ${trainee.last_name}`,
            html: `
              <h2>Trainee Review Meeting Reminder</h2>
              <p>Hello,</p>
              <p>This is a reminder to schedule a ${checkDate.days}-day review meeting with trainee <strong>${trainee.first_name} ${trainee.last_name}</strong>.</p>
              <p><strong>Joining Date:</strong> ${trainee.date_of_joining}</p>
              <p>Please visit the GrowPro Suite to schedule this meeting:</p>
              <p><a href="http://growpro-suite.lovable.app/" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Schedule Meeting</a></p>
              <p>Best regards,<br>GrowPro Suite</p>
            `,
          });

          emailsSent.push({
            trainee: `${trainee.first_name} ${trainee.last_name}`,
            days: checkDate.days,
            email: hrEmail,
            result: emailResult
          });
        }
      }
    }

    console.log("Emails sent:", emailsSent);

    return new Response(
      JSON.stringify({ success: true, emailsSent: emailsSent.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-periodic-hr-emails function:", error);
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
