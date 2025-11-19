-- Add missing fields to companies table
-- Based on company form requirements

-- Add owner_id for Company Owner
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Add vertical field
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS vertical TEXT;

-- Add email field (company email)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;

-- Add timezone field (already exists from previous migration, but ensure it exists)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add zip_code field
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_vertical ON public.companies(vertical);
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_zip_code ON public.companies(zip_code);

-- Add comments for documentation
COMMENT ON COLUMN public.companies.owner_id IS 'User who owns/manages this company';
COMMENT ON COLUMN public.companies.vertical IS 'Business vertical or industry category';
COMMENT ON COLUMN public.companies.email IS 'Company primary email address';
COMMENT ON COLUMN public.companies.timezone IS 'Company timezone';
COMMENT ON COLUMN public.companies.zip_code IS 'Company ZIP/postal code';

