-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para processar transações recorrentes diariamente às 6:00 AM
SELECT cron.schedule(
  'process-recurring-transactions-daily',
  '0 6 * * *', -- Todo dia às 6:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://wwqnpmkrudfxfbpvsmzr.supabase.co/functions/v1/process-recurring-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cW5wbWtydWRmeGZicHZzbXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDQwNzAsImV4cCI6MjA2ODYyMDA3MH0.zxQ4cVHFwpZaPIa_4n3AdU0sfoABLcRipJc_DW79ZBc"}'::jsonb
    ) as request_id;
  $$
);