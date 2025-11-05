-- Add location fields to deals table
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.deals.country IS 'Country location for the deal';
COMMENT ON COLUMN public.deals.state IS 'State/Province location for the deal';
COMMENT ON COLUMN public.deals.city IS 'City location for the deal';

-- Create indexes for better query performance (optional, for filtering/searching)
CREATE INDEX IF NOT EXISTS idx_deals_country ON public.deals(country);
CREATE INDEX IF NOT EXISTS idx_deals_state ON public.deals(state);
CREATE INDEX IF NOT EXISTS idx_deals_city ON public.deals(city);

