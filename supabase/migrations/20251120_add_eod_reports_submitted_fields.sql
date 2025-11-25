-- Add submitted tracking fields to eod_reports table
-- This prevents foreign key constraint violations by keeping reports instead of deleting them

ALTER TABLE public.eod_reports
ADD COLUMN IF NOT EXISTS submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Add index for faster queries on submitted reports
CREATE INDEX IF NOT EXISTS idx_eod_reports_submitted ON public.eod_reports(submitted, report_date);

-- Add comment for documentation
COMMENT ON COLUMN public.eod_reports.submitted IS 'Indicates if this report has been submitted as part of an EOD submission';
COMMENT ON COLUMN public.eod_reports.submitted_at IS 'Timestamp when the report was submitted';


