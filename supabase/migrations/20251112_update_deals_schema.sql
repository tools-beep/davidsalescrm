-- Update Deals table with comprehensive fields
-- Adding all missing fields for complete deal management

-- Add owner and team fields (without foreign key constraints initially)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deal_owner_id UUID;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS setter_id UUID;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS account_manager_id UUID;

-- Add industry field
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS industry TEXT;

-- Add description field
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS description TEXT;

-- Add timezone field (should already exist from previous migrations)
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add financial fields
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2);
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add product/segment field
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS product_segment TEXT;

-- Add source fields
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- Add activity tracking
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP WITH TIME ZONE;

-- pipeline_id should already exist
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS pipeline_id UUID;

-- Migrate owner_id to deal_owner_id if not already done
UPDATE public.deals 
SET deal_owner_id = owner_id 
WHERE deal_owner_id IS NULL AND owner_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_deal_owner ON public.deals(deal_owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_setter ON public.deals(setter_id);
CREATE INDEX IF NOT EXISTS idx_deals_account_manager ON public.deals(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_industry ON public.deals(industry);
CREATE INDEX IF NOT EXISTS idx_deals_last_activity ON public.deals(last_activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_deals_lead_source ON public.deals(lead_source);

-- Add comments for documentation
COMMENT ON COLUMN public.deals.deal_owner_id IS 'User who owns this deal';
COMMENT ON COLUMN public.deals.setter_id IS 'User who set the appointment/discovered the deal';
COMMENT ON COLUMN public.deals.account_manager_id IS 'User managing the account';
COMMENT ON COLUMN public.deals.industry IS 'Industry or vertical of the deal';
COMMENT ON COLUMN public.deals.description IS 'Detailed description of the deal';
COMMENT ON COLUMN public.deals.timezone IS 'Timezone of the client';
COMMENT ON COLUMN public.deals.annual_revenue IS 'Annual revenue of the client company';
COMMENT ON COLUMN public.deals.currency IS 'Currency for the deal amount (USD, EUR, etc.)';
COMMENT ON COLUMN public.deals.product_segment IS 'Product or service segment for this deal';
COMMENT ON COLUMN public.deals.lead_source IS 'Source where the lead came from';
COMMENT ON COLUMN public.deals.referral_source IS 'Specific referral source if applicable';
COMMENT ON COLUMN public.deals.last_activity_date IS 'Last time there was activity on this deal';

