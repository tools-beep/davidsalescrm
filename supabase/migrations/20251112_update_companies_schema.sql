-- Update Companies table with comprehensive fields
-- Adding all missing fields for complete company management

-- Add domain and website fields
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website TEXT;

-- Add phone (should already exist)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add industry
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS industry TEXT;

-- Add description
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS description TEXT;

-- Add founder information
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS founder_full_name TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS founder_email TEXT;

-- Add social media URLs
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add location fields
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS address TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_domain ON public.companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON public.companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_country ON public.companies(country);

-- Add comments for documentation
COMMENT ON COLUMN public.companies.domain IS 'Company domain name (e.g., example.com)';
COMMENT ON COLUMN public.companies.website IS 'Full company website URL';
COMMENT ON COLUMN public.companies.phone IS 'Company main phone number';
COMMENT ON COLUMN public.companies.industry IS 'Industry or sector the company operates in';
COMMENT ON COLUMN public.companies.description IS 'Description of the company and what they do';
COMMENT ON COLUMN public.companies.founder_full_name IS 'Full name of the company founder';
COMMENT ON COLUMN public.companies.founder_email IS 'Email address of the founder';
COMMENT ON COLUMN public.companies.instagram_url IS 'Company Instagram profile URL';
COMMENT ON COLUMN public.companies.facebook_url IS 'Company Facebook page URL';
COMMENT ON COLUMN public.companies.tiktok_url IS 'Company TikTok profile URL';
COMMENT ON COLUMN public.companies.linkedin_url IS 'Company LinkedIn page URL';
COMMENT ON COLUMN public.companies.country IS 'Country where company is located';
COMMENT ON COLUMN public.companies.state IS 'State or region where company is located';
COMMENT ON COLUMN public.companies.city IS 'City where company is located';
COMMENT ON COLUMN public.companies.address IS 'Physical address of the company';

