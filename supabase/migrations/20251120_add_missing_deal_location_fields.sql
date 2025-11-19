-- Add missing location and other fields to deals table
-- This migration adds: city, state, country, assigned_operator, notes

-- Add location fields
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS country TEXT;

-- Add assigned operator field
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS assigned_operator UUID;

-- Add notes field (separate from description)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure product_segment exists
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS product_segment TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deals_city ON public.deals(city);
CREATE INDEX IF NOT EXISTS idx_deals_state ON public.deals(state);
CREATE INDEX IF NOT EXISTS idx_deals_country ON public.deals(country);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_operator ON public.deals(assigned_operator);

-- Add comments for documentation
COMMENT ON COLUMN public.deals.city IS 'City or region of the deal/client';
COMMENT ON COLUMN public.deals.state IS 'State or region of the deal/client';
COMMENT ON COLUMN public.deals.country IS 'Country of the deal/client';
COMMENT ON COLUMN public.deals.assigned_operator IS 'Operator assigned to fulfill this deal';
COMMENT ON COLUMN public.deals.notes IS 'Internal notes about the deal (also shown in Notes tab)';
COMMENT ON COLUMN public.deals.product_segment IS 'Product or service segment for this deal';

