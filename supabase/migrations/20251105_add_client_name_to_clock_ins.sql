-- Add client_name column to eod_clock_ins table to support per-client clock tracking
ALTER TABLE public.eod_clock_ins 
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Create index for faster queries by client_name
CREATE INDEX IF NOT EXISTS idx_eod_clock_ins_client_name 
ON public.eod_clock_ins(client_name);

-- Create composite index for user_id, date, and client_name (common query pattern)
CREATE INDEX IF NOT EXISTS idx_eod_clock_ins_user_date_client 
ON public.eod_clock_ins(user_id, date, client_name);

-- Add comment
COMMENT ON COLUMN public.eod_clock_ins.client_name IS 'Name of the client this clock-in session is for (supports multi-client tracking)';

