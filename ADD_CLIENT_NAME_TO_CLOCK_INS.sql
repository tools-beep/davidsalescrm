-- Add client_name column to eod_clock_ins table for per-client clock tracking

ALTER TABLE eod_clock_ins 
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Add comment
COMMENT ON COLUMN eod_clock_ins.client_name IS 'Client name associated with this clock-in session';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_eod_clock_ins_client 
ON eod_clock_ins(user_id, client_name, date);

