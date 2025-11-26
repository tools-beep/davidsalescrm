-- Create manual_call_logs table for user-entered call logs
-- This separates manual logs from actual Dialpad call data

CREATE TABLE IF NOT EXISTS public.manual_call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relationships
  related_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  related_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  related_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  rep_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Call details
  outbound_type outbound_type_enum NOT NULL,
  call_outcome call_outcome_enum NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT,
  
  -- Phone numbers (for reference)
  caller_number TEXT,
  callee_number TEXT,
  
  -- Timestamps
  call_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.manual_call_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same as calls table)
CREATE POLICY "Users can view all manual call logs" 
  ON public.manual_call_logs 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create manual call logs" 
  ON public.manual_call_logs 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update manual call logs" 
  ON public.manual_call_logs 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete manual call logs" 
  ON public.manual_call_logs 
  FOR DELETE 
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_call_logs_related_deal_id ON public.manual_call_logs(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_manual_call_logs_related_contact_id ON public.manual_call_logs(related_contact_id);
CREATE INDEX IF NOT EXISTS idx_manual_call_logs_related_company_id ON public.manual_call_logs(related_company_id);
CREATE INDEX IF NOT EXISTS idx_manual_call_logs_timestamp ON public.manual_call_logs(call_timestamp);
CREATE INDEX IF NOT EXISTS idx_manual_call_logs_rep_id ON public.manual_call_logs(rep_id);
CREATE INDEX IF NOT EXISTS idx_manual_call_logs_call_outcome ON public.manual_call_logs(call_outcome);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_manual_call_logs_updated_at
  BEFORE UPDATE ON public.manual_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.manual_call_logs IS 'Stores manually logged calls entered by users via the Log Call form. Separate from actual Dialpad call data in the calls table.';
COMMENT ON COLUMN public.manual_call_logs.outbound_type IS 'Type of outbound call (e.g., cold call, follow-up)';
COMMENT ON COLUMN public.manual_call_logs.call_outcome IS 'Outcome of the call (e.g., no answer, voicemail, connected)';
COMMENT ON COLUMN public.manual_call_logs.duration_seconds IS 'Duration of the call in seconds (user-entered estimate)';

-- Migrate existing manual logs from calls table to manual_call_logs
-- Only migrate calls that have NO Dialpad metadata
INSERT INTO public.manual_call_logs (
  id,
  related_deal_id,
  related_contact_id,
  related_company_id,
  rep_id,
  outbound_type,
  call_outcome,
  duration_seconds,
  notes,
  caller_number,
  callee_number,
  call_timestamp,
  created_at,
  updated_at
)
SELECT 
  id,
  related_deal_id,
  related_contact_id,
  related_company_id,
  rep_id,
  outbound_type,
  call_outcome,
  duration_seconds,
  notes,
  caller_number,
  callee_number,
  call_timestamp,
  created_at,
  updated_at
FROM public.calls
WHERE dialpad_call_id IS NULL 
  AND dialpad_metadata IS NULL
  AND is_account_manager_meeting IS NOT TRUE  -- Don't migrate account manager meetings
ON CONFLICT (id) DO NOTHING;

-- Delete migrated manual logs from calls table
-- Keep only Dialpad calls and account manager meetings
DELETE FROM public.calls
WHERE dialpad_call_id IS NULL 
  AND dialpad_metadata IS NULL
  AND is_account_manager_meeting IS NOT TRUE;

-- Add constraint to calls table to ensure it only contains Dialpad data or AM meetings
-- (Optional - uncomment if you want strict enforcement)
-- ALTER TABLE public.calls 
-- ADD CONSTRAINT calls_must_have_dialpad_data_or_am_flag 
-- CHECK (
--   dialpad_call_id IS NOT NULL 
--   OR dialpad_metadata IS NOT NULL 
--   OR is_account_manager_meeting = true
-- );

-- Create a view that combines both tables for reporting
CREATE OR REPLACE VIEW public.all_call_activity AS
SELECT 
  id,
  related_deal_id,
  related_contact_id,
  related_company_id,
  rep_id,
  outbound_type,
  call_outcome,
  duration_seconds,
  notes,
  caller_number,
  callee_number,
  call_timestamp,
  created_at,
  'Dialpad API Data' as call_source,
  dialpad_call_id,
  recording_url,
  transcript,
  dialpad_metadata
FROM public.calls
WHERE dialpad_metadata IS NOT NULL

UNION ALL

SELECT 
  id,
  related_deal_id,
  related_contact_id,
  related_company_id,
  rep_id,
  outbound_type,
  call_outcome,
  duration_seconds,
  notes,
  caller_number,
  callee_number,
  call_timestamp,
  created_at,
  'Dialpad CTI Call' as call_source,
  dialpad_call_id,
  recording_url,
  transcript,
  dialpad_metadata
FROM public.calls
WHERE dialpad_call_id IS NOT NULL 
  AND dialpad_metadata IS NULL

UNION ALL

SELECT 
  id,
  related_deal_id,
  related_contact_id,
  related_company_id,
  rep_id,
  outbound_type,
  call_outcome,
  duration_seconds,
  notes,
  caller_number,
  callee_number,
  call_timestamp,
  created_at,
  'Manual Log' as call_source,
  NULL as dialpad_call_id,
  NULL as recording_url,
  NULL as transcript,
  NULL as dialpad_metadata
FROM public.manual_call_logs;

-- Grant access to the view
GRANT SELECT ON public.all_call_activity TO authenticated;

COMMENT ON VIEW public.all_call_activity IS 'Combined view of all call activity from both Dialpad calls and manual logs, with call_source field for easy filtering';

