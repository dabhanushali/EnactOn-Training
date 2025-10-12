-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the periodic HR email function to run daily at 9 AM
SELECT cron.schedule(
  'daily-hr-email-reminders',
  '0 9 * * *', -- Every day at 9:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://mdmhvlngucgbppwkzwcd.supabase.co/functions/v1/send-periodic-hr-emails',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);