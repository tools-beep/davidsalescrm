-- Migration: Add Actual Hours and Rounded Hours Fields
-- Date: 2025-11-24
-- Purpose: Track both precise and rounded hours for all EOD reports

-- ✅ Add hours fields to eod_reports table
ALTER TABLE eod_reports 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- Add comments
COMMENT ON COLUMN eod_reports.actual_hours IS 
'Precise hours worked (total_seconds / 3600). Used for analytics and metrics.';

COMMENT ON COLUMN eod_reports.rounded_hours IS 
'Hours rounded to nearest whole number using standard math rounding (0.5 rounds up). Used for payroll and human-facing displays.';

-- ✅ Add hours fields to eod_submissions table
ALTER TABLE eod_submissions 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- Add comments
COMMENT ON COLUMN eod_submissions.actual_hours IS 
'Precise hours worked for this submission.';

COMMENT ON COLUMN eod_submissions.rounded_hours IS 
'Rounded hours for this submission (nearest whole hour).';

-- ✅ Add hours fields to eod_clock_ins table (for shift tracking)
ALTER TABLE eod_clock_ins 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- Add comments
COMMENT ON COLUMN eod_clock_ins.actual_hours IS 
'Precise hours for this clock-in session (calculated at clock-out).';

COMMENT ON COLUMN eod_clock_ins.rounded_hours IS 
'Rounded hours for this clock-in session (nearest whole hour).';

-- ✅ Create function to calculate and update hours on clock-out
CREATE OR REPLACE FUNCTION calculate_shift_hours()
RETURNS TRIGGER AS $$
DECLARE
  total_active_seconds INTEGER;
  total_shift_seconds INTEGER;
  calculated_actual_hours NUMERIC(10, 2);
  calculated_rounded_hours INTEGER;
BEGIN
  -- Only calculate if clocking out (clocked_out_at is being set)
  IF NEW.clocked_out_at IS NOT NULL AND OLD.clocked_out_at IS NULL THEN
    
    -- Calculate total active seconds from all tasks in this session
    SELECT COALESCE(SUM(accumulated_seconds), 0) INTO total_active_seconds
    FROM eod_time_entries
    WHERE user_id = NEW.user_id
      AND DATE(started_at) = DATE(NEW.clocked_in_at);
    
    -- Calculate total shift seconds (clock-out - clock-in)
    total_shift_seconds := EXTRACT(EPOCH FROM (NEW.clocked_out_at - NEW.clocked_in_at));
    
    -- Calculate actual hours (precise)
    calculated_actual_hours := total_shift_seconds / 3600.0;
    
    -- Calculate rounded hours (nearest whole number)
    calculated_rounded_hours := ROUND(calculated_actual_hours);
    
    -- Update the clock-in record
    NEW.actual_hours := calculated_actual_hours;
    NEW.rounded_hours := calculated_rounded_hours;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ✅ Create trigger for automatic hours calculation
DROP TRIGGER IF EXISTS trigger_calculate_shift_hours ON eod_clock_ins;

CREATE TRIGGER trigger_calculate_shift_hours
BEFORE UPDATE ON eod_clock_ins
FOR EACH ROW
EXECUTE FUNCTION calculate_shift_hours();

-- ✅ Create function to update EOD report hours on submission
CREATE OR REPLACE FUNCTION update_eod_report_hours()
RETURNS TRIGGER AS $$
DECLARE
  clock_in_record RECORD;
BEGIN
  -- Get the clock-in record for today
  SELECT actual_hours, rounded_hours INTO clock_in_record
  FROM eod_clock_ins
  WHERE user_id = NEW.user_id
    AND DATE(clocked_in_at) = DATE(NEW.submitted_at)
    AND clocked_out_at IS NOT NULL
  ORDER BY clocked_out_at DESC
  LIMIT 1;
  
  -- If we found a clock-in record with hours, copy them to the submission
  IF FOUND THEN
    NEW.actual_hours := clock_in_record.actual_hours;
    NEW.rounded_hours := clock_in_record.rounded_hours;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ✅ Create trigger for EOD submission hours
DROP TRIGGER IF EXISTS trigger_update_eod_report_hours ON eod_submissions;

CREATE TRIGGER trigger_update_eod_report_hours
BEFORE INSERT ON eod_submissions
FOR EACH ROW
EXECUTE FUNCTION update_eod_report_hours();

-- ✅ Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_eod_reports_hours 
ON eod_reports(user_id, actual_hours, rounded_hours);

CREATE INDEX IF NOT EXISTS idx_eod_submissions_hours 
ON eod_submissions(user_id, actual_hours, rounded_hours);

CREATE INDEX IF NOT EXISTS idx_clock_ins_hours 
ON eod_clock_ins(user_id, actual_hours, rounded_hours);

-- ✅ Backfill existing records (optional, can be run separately)
-- This calculates hours for existing clock-in records that have been completed

-- Backfill eod_clock_ins
UPDATE eod_clock_ins
SET 
  actual_hours = EXTRACT(EPOCH FROM (clocked_out_at - clocked_in_at)) / 3600.0,
  rounded_hours = ROUND(EXTRACT(EPOCH FROM (clocked_out_at - clocked_in_at)) / 3600.0)
WHERE clocked_out_at IS NOT NULL
  AND actual_hours IS NULL;

-- Note: Backfilling eod_reports and eod_submissions would require more complex logic
-- to aggregate task data. This should be done in application code if needed.

