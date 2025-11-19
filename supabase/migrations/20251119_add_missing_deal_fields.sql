-- Add missing fields to deals table for Deal Information section
-- These fields are displayed in the Deal Detail page but don't exist in the database yet

-- Add assigned_operator field
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS assigned_operator UUID;

-- Add notes field (for Deal Notes)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_assigned_operator ON public.deals(assigned_operator);

-- Add comments for documentation
COMMENT ON COLUMN public.deals.assigned_operator IS 'Operator assigned to handle this deal';
COMMENT ON COLUMN public.deals.notes IS 'Deal notes and additional information';

-- Note: annual_revenue was already changed to TEXT in migration 20251119_change_annual_revenue_to_text.sql
-- Note: referral_source already exists from migration 20251112_update_deals_schema.sql

